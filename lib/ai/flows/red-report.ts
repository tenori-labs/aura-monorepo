'use server';

import { jsPDF } from 'jspdf';
import prisma from '@/lib/db';
import { embedText } from '@/lib/ai/embedding';
import { cosineSimilarity } from './similarity-utils';
import type { ExtractedAnchors } from './interrogation-chat';

// ─── Types ───────────────────────────────────────────────────────────

interface PairwiseScore {
    reporterA: number;
    reporterB: number;
    time: number;
    location: number;
    action: number;
}

interface RedReportData {
    entityName: string;
    status: string;
    reportCount: number;
    vcScore: number;
    vcDetails: {
        timeScore: number;
        locationScore: number;
        actionScore: number;
        witnessOverlap: number;
        decision: string;
    };
    dateRange: { earliest: Date; latest: Date };
    testimonies: {
        index: number;
        anchors: ExtractedAnchors;
        completedAt: Date | null;
    }[];
    pairwiseScores: PairwiseScore[];
}

// ─── PDF Styling Constants ───────────────────────────────────────────

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4 mm
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FONT_TITLE = 16;
const FONT_HEADING = 12;
const FONT_BODY = 10;
const FONT_SMALL = 8;
const LINE_HEIGHT = 5;
const SECTION_GAP = 10;

// Color palette (RGB)
const COLOR_DARK = [30, 30, 30] as const;
const COLOR_GRAY = [100, 100, 100] as const;
const COLOR_ACCENT = [180, 30, 30] as const;
const COLOR_GREEN = [34, 139, 34] as const;
const COLOR_YELLOW = [200, 150, 0] as const;
const COLOR_RED_CELL = [220, 60, 60] as const;
const COLOR_GREEN_CELL = [220, 245, 220] as const;
const COLOR_YELLOW_CELL = [255, 250, 220] as const;
const COLOR_RED_BG = [255, 230, 230] as const;
const COLOR_HEADER_BG = [40, 40, 40] as const;
const COLOR_WHITE = [255, 255, 255] as const;
const COLOR_BORDER = [180, 180, 180] as const;

// ─── Main Export ─────────────────────────────────────────────────────

/**
 * Generates a Red Report PDF for an escalated ShadowCase.
 *
 * The report is an institutional-grade document containing:
 * 1. Executive Summary — Vc score, decision, report count, date range
 * 2. Consistency Matrix — per-pair similarity heat map
 * 3. Individual Testimonies — extracted anchors from each interview
 *
 * @param shadowCaseId - The ShadowCase to generate the report for
 * @returns Base64-encoded PDF string, or an error object
 */
export async function generateRedReport(
    shadowCaseId: string
): Promise<{ pdf: string; filename: string } | { error: string }> {
    try {
        const data = await fetchReportData(shadowCaseId);
        if (!data) {
            return { error: 'Shadow case not found or has no completed sessions.' };
        }

        const pdf = buildPdf(data);
        const base64 = pdf.output('datauristring');
        const filename = `RED_REPORT_${data.entityName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;

        return { pdf: base64, filename };
    } catch (error) {
        console.error('[RedReport] Generation failed:', error);
        return { error: 'Failed to generate report.' };
    }
}

// ─── Data Fetching ───────────────────────────────────────────────────

async function fetchReportData(
    shadowCaseId: string
): Promise<RedReportData | null> {
    const shadowCase = await prisma.shadowCase.findUnique({
        where: { id: shadowCaseId },
        include: {
            reports: { orderBy: { createdAt: 'asc' } },
            sessions: {
                where: { status: 'completed' },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!shadowCase || shadowCase.sessions.length < 2) return null;

    const vcDetails = (shadowCase.vcDetails as RedReportData['vcDetails']) ?? {
        timeScore: 0,
        locationScore: 0,
        actionScore: 0,
        witnessOverlap: 0,
        decision: 'pending',
    };

    const anchors: ExtractedAnchors[] = shadowCase.sessions
        .map((s) => s.extractedAnchors as unknown as ExtractedAnchors)
        .filter(Boolean);

    // Calculate pairwise scores for the matrix
    const pairwiseScores = await calculatePairwiseMatrix(anchors);

    // Date range from reports
    const reportDates = shadowCase.reports.map((r) => r.createdAt);
    const earliest = reportDates.length > 0
        ? reportDates.reduce((a, b) => (a < b ? a : b))
        : new Date();
    const latest = reportDates.length > 0
        ? reportDates.reduce((a, b) => (a > b ? a : b))
        : new Date();

    return {
        entityName: shadowCase.entityName,
        status: shadowCase.status,
        reportCount: shadowCase.reportCount,
        vcScore: shadowCase.vcScore ?? 0,
        vcDetails,
        dateRange: { earliest, latest },
        testimonies: anchors.map((a, i) => ({
            index: i + 1,
            anchors: a,
            completedAt: shadowCase.sessions[i]?.completedAt ?? null,
        })),
        pairwiseScores,
    };
}

// ─── Pairwise Matrix Calculation ─────────────────────────────────────

async function calculatePairwiseMatrix(
    anchors: ExtractedAnchors[]
): Promise<PairwiseScore[]> {
    if (anchors.length < 2) return [];

    // Build embedding arrays for each dimension
    const timeStrings = anchors.map((a) =>
        [a.time, a.date].filter(Boolean).join(' ').trim()
    );
    const locationStrings = anchors.map((a) =>
        [a.location, a.floor, a.room].filter(Boolean).join(' ').trim()
    );
    const actionStrings = anchors.map((a) => a.eventDescription ?? '');

    // Embed all at once
    const [timeEmbeddings, locationEmbeddings, actionEmbeddings] =
        await Promise.all([
            Promise.all(timeStrings.map((s) => (s.length > 0 ? embedText(s) : Promise.resolve(null)))),
            Promise.all(locationStrings.map((s) => (s.length > 0 ? embedText(s) : Promise.resolve(null)))),
            Promise.all(actionStrings.map((s) => (s.length > 5 ? embedText(s) : Promise.resolve(null)))),
        ]);

    const pairs: PairwiseScore[] = [];
    for (let i = 0; i < anchors.length; i++) {
        for (let j = i + 1; j < anchors.length; j++) {
            const timeSim =
                timeEmbeddings[i] && timeEmbeddings[j]
                    ? cosineSimilarity(timeEmbeddings[i]!, timeEmbeddings[j]!)
                    : 0;
            const locSim =
                locationEmbeddings[i] && locationEmbeddings[j]
                    ? cosineSimilarity(locationEmbeddings[i]!, locationEmbeddings[j]!)
                    : 0;
            const actSim =
                actionEmbeddings[i] && actionEmbeddings[j]
                    ? cosineSimilarity(actionEmbeddings[i]!, actionEmbeddings[j]!)
                    : 0;

            pairs.push({
                reporterA: i + 1,
                reporterB: j + 1,
                time: timeSim,
                location: locSim,
                action: actSim,
            });
        }
    }

    return pairs;
}

// ─── PDF Builder ─────────────────────────────────────────────────────

function buildPdf(data: RedReportData): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = MARGIN;

    y = drawHeader(doc, data, y);
    y = drawExecutiveSummary(doc, data, y);
    y = drawConsistencyMatrix(doc, data, y);
    drawTestimonies(doc, data, y);
    drawFooter(doc);

    return doc;
}

// ─── Header ──────────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, data: RedReportData, y: number): number {
    // Red bar at top
    doc.setFillColor(...COLOR_ACCENT);
    doc.rect(0, 0, PAGE_WIDTH, 8, 'F');

    y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_TITLE);
    doc.setTextColor(...COLOR_ACCENT);
    doc.text('RED REPORT', MARGIN, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(...COLOR_GRAY);
    doc.text('CONFIDENTIAL - INTERNAL USE ONLY', PAGE_WIDTH - MARGIN, y, {
        align: 'right',
    });

    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_HEADING);
    doc.setTextColor(...COLOR_DARK);
    doc.text(`Subject: ${data.entityName}`, MARGIN, y);

    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(...COLOR_GRAY);
    doc.text(
        `Generated: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}`,
        MARGIN,
        y
    );
    doc.text(
        `Case ID: ${data.entityName.replace(/\s/g, '-').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
        PAGE_WIDTH - MARGIN,
        y,
        { align: 'right' }
    );

    y += 4;

    // Separator line
    doc.setDrawColor(...COLOR_ACCENT);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

    return y + SECTION_GAP;
}

// ─── Executive Summary ───────────────────────────────────────────────

function drawExecutiveSummary(
    doc: jsPDF,
    data: RedReportData,
    y: number
): number {
    y = drawSectionTitle(doc, 'EXECUTIVE SUMMARY', y);

    const decisionLabel = formatDecision(data.vcDetails.decision);
    const dateRange = `${data.dateRange.earliest.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })} - ${data.dateRange.latest.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })}`;

    // ── Two-column grid layout ──
    const leftX = MARGIN + 5;
    const rightX = MARGIN + CONTENT_WIDTH / 2 + 2;
    const GAP = 2; // gap between label and value
    const ROW_GAP = 7;

    const BOX_HEIGHT = 58;

    // Summary box
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(...COLOR_BORDER);
    const boxStartY = y;
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, BOX_HEIGHT, 2, 2, 'FD');

    y += 9;

    // Helper: draw a label: value pair and return nothing
    const drawField = (x: number, yPos: number, label: string, value: string, valueColor?: readonly [number, number, number]) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_BODY);
        doc.setTextColor(...COLOR_DARK);
        doc.text(label, x, yPos);
        const labelW = doc.getTextWidth(label);
        doc.setFont('helvetica', 'normal');
        if (valueColor) {
            doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        }
        doc.text(value, x + labelW + GAP, yPos);
        doc.setTextColor(...COLOR_DARK);
    };

    // Row 1
    drawField(leftX, y, 'Entity Under Review:', data.entityName);
    const escalatedColor = data.vcDetails.decision === 'escalated' ? COLOR_ACCENT : COLOR_DARK;
    drawField(rightX, y, 'Decision:', decisionLabel, escalatedColor);

    y += ROW_GAP;

    // Row 2
    drawField(leftX, y, 'Verification Coefficient:', data.vcScore.toFixed(3));
    drawField(rightX, y, 'Total Reports:', String(data.reportCount));

    y += ROW_GAP;

    // Row 3
    drawField(leftX, y, 'Completed Interviews:', String(data.testimonies.length));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_BODY);
    doc.setTextColor(...COLOR_DARK);
    doc.text('Reporting Period:', rightX, y);
    const rpLabelW = doc.getTextWidth('Reporting Period:');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SMALL + 1);
    doc.text(dateRange, rightX + rpLabelW + GAP, y);
    doc.setFontSize(FONT_BODY);

    y += ROW_GAP + 5;

    // ── Sub-score row (evenly spaced across box width) ──
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(leftX, y - 4, MARGIN + CONTENT_WIDTH - 5, y - 4);

    const scores = [
        { label: 'Time Similarity', value: data.vcDetails.timeScore },
        { label: 'Location Similarity', value: data.vcDetails.locationScore },
        { label: 'Action Similarity', value: data.vcDetails.actionScore },
        { label: 'Witness Cross-Ref', value: data.vcDetails.witnessOverlap },
    ];

    const scoreColW = (CONTENT_WIDTH - 10) / 4;
    scores.forEach((s, i) => {
        const x = leftX + i * scoreColW;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SMALL);
        doc.setTextColor(...COLOR_GRAY);
        doc.text(s.label, x, y);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_BODY);
        doc.setTextColor(...getScoreColor(s.value));
        doc.text(s.value.toFixed(2), x, y + 5);
    });

    doc.setTextColor(...COLOR_DARK);

    // Ensure y clears the box bottom
    const boxEndY = boxStartY + BOX_HEIGHT + SECTION_GAP;
    return Math.max(y + 14, boxEndY);
}

// ─── Consistency Matrix ──────────────────────────────────────────────

function drawConsistencyMatrix(
    doc: jsPDF,
    data: RedReportData,
    y: number
): number {
    if (data.pairwiseScores.length === 0) return y;

    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'CONSISTENCY MATRIX', y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(...COLOR_GRAY);
    doc.text(
        'Pairwise similarity scores between independent reporter testimonies. Higher scores indicate stronger corroboration.',
        MARGIN,
        y
    );
    y += 8;

    // Table dimensions — widths must sum to CONTENT_WIDTH (170mm)
    const cols = ['Pair', 'Time', 'Location', 'Action', 'Average'];
    const colWidths = [38, 33, 33, 33, 33];
    const rowHeight = 8;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    // Header row
    doc.setFillColor(...COLOR_HEADER_BG);
    doc.rect(MARGIN, y, tableWidth, rowHeight, 'F');
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y, tableWidth, rowHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(...COLOR_WHITE);

    let xOffset = MARGIN;
    cols.forEach((col, i) => {
        // Vertical cell dividers
        if (i > 0) {
            doc.setDrawColor(80, 80, 80);
            doc.line(xOffset, y, xOffset, y + rowHeight);
        }
        doc.text(col, xOffset + colWidths[i] / 2, y + rowHeight / 2 + 1, {
            align: 'center',
        });
        xOffset += colWidths[i];
    });

    y += rowHeight;

    // Data rows
    data.pairwiseScores.forEach((pair, rowIdx) => {
        y = checkPageBreak(doc, y, rowHeight + 5);

        const avg = (pair.time + pair.location + pair.action) / 3;
        const bgColor = rowIdx % 2 === 0 ? [255, 255, 255] : [248, 248, 248];

        // Draw full row background
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(MARGIN, y, tableWidth, rowHeight, 'F');

        const values = [
            { text: `R${pair.reporterA} vs R${pair.reporterB}`, score: null },
            { text: pair.time.toFixed(2), score: pair.time },
            { text: pair.location.toFixed(2), score: pair.location },
            { text: pair.action.toFixed(2), score: pair.action },
            { text: avg.toFixed(2), score: avg },
        ];

        xOffset = MARGIN;
        values.forEach((v, i) => {
            // Color-coded cell background for score cells
            if (v.score !== null) {
                const cellColor = getScoreCellColor(v.score);
                doc.setFillColor(cellColor[0], cellColor[1], cellColor[2]);
                doc.rect(xOffset, y, colWidths[i], rowHeight, 'F');
            }

            // Cell border
            doc.setDrawColor(...COLOR_BORDER);
            doc.setLineWidth(0.2);
            doc.rect(xOffset, y, colWidths[i], rowHeight, 'S');

            // Cell text
            doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
            doc.setFontSize(FONT_SMALL);
            const textColor = i === 0 ? COLOR_DARK : getScoreColor(v.score ?? 0);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.text(v.text, xOffset + colWidths[i] / 2, y + rowHeight / 2 + 1, {
                align: 'center',
            });

            xOffset += colWidths[i];
        });

        y += rowHeight;
    });

    // Legend
    y += 6;
    doc.setFontSize(FONT_SMALL - 1);
    doc.setTextColor(...COLOR_GRAY);
    doc.setFont('helvetica', 'normal');

    const legendItems = [
        { color: COLOR_GREEN_CELL, label: 'High (>0.75)' },
        { color: COLOR_YELLOW_CELL, label: 'Moderate (0.40-0.75)' },
        { color: COLOR_RED_BG, label: 'Low (<0.40)' },
    ];

    let legendX = MARGIN;
    legendItems.forEach((item) => {
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.rect(legendX, y - 2, 4, 4, 'F');
        doc.setDrawColor(...COLOR_BORDER);
        doc.rect(legendX, y - 2, 4, 4, 'S');
        doc.text(item.label, legendX + 6, y + 1);
        legendX += 45;
    });

    return y + SECTION_GAP;
}

// ─── Testimonies ─────────────────────────────────────────────────────

function drawTestimonies(
    doc: jsPDF,
    data: RedReportData,
    y: number
): number {
    y = checkPageBreak(doc, y, 40);
    y = drawSectionTitle(doc, 'INDIVIDUAL TESTIMONIES', y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(...COLOR_GRAY);
    doc.text(
        'Structured anchor points extracted from independent reporter interviews. Identities have been anonymized.',
        MARGIN,
        y
    );
    y += 8;

    data.testimonies.forEach((testimony) => {
        y = checkPageBreak(doc, y, 50);

        // Testimony header bar
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(...COLOR_BORDER);
        doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 7, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_BODY);
        doc.setTextColor(...COLOR_DARK);
        doc.text(`Reporter #${testimony.index}`, MARGIN + 4, y + 5);

        if (testimony.completedAt) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(FONT_SMALL);
            doc.setTextColor(...COLOR_GRAY);
            doc.text(
                `Interview completed: ${new Date(testimony.completedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                })}`,
                PAGE_WIDTH - MARGIN - 4,
                y + 5,
                { align: 'right' }
            );
        }

        y += 12;

        // Anchor fields
        const fields = [
            { label: 'Time/Date', value: [testimony.anchors.time, testimony.anchors.date].filter(Boolean).join(', ') },
            { label: 'Location', value: [testimony.anchors.location, testimony.anchors.floor, testimony.anchors.room].filter(Boolean).join(', ') },
            { label: 'Witnesses', value: (testimony.anchors.witnesses ?? []).join(', ') || 'None mentioned' },
            { label: 'Event Description', value: testimony.anchors.eventDescription ?? 'Not provided' },
        ];

        fields.forEach((field) => {
            y = checkPageBreak(doc, y, 15);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(FONT_SMALL);
            doc.setTextColor(...COLOR_DARK);
            doc.text(`${field.label}:`, MARGIN + 4, y);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COLOR_GRAY);

            // Wrap long text
            const maxWidth = CONTENT_WIDTH - 8;
            const lines = doc.splitTextToSize(field.value || 'N/A', maxWidth);
            doc.text(lines, MARGIN + 4, y + LINE_HEIGHT);
            y += LINE_HEIGHT + lines.length * (LINE_HEIGHT - 1) + 2;
        });

        // Separator between testimonies
        y += 3;
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(MARGIN + 10, y, PAGE_WIDTH - MARGIN - 10, y);
        y += 6;
    });

    return y;
}

// ─── Footer ──────────────────────────────────────────────────────────

function drawFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Bottom separator
        doc.setDrawColor(...COLOR_BORDER);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, 280, PAGE_WIDTH - MARGIN, 280);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SMALL - 1);
        doc.setTextColor(...COLOR_GRAY);

        doc.text('CONFIDENTIAL - AURA SAFETY SYSTEM', MARGIN, 285);
        doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, 285, {
            align: 'right',
        });
    }
}

// ─── Utilities ───────────────────────────────────────────────────────

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_HEADING);
    doc.setTextColor(...COLOR_DARK);
    doc.text(title, MARGIN, y);

    y += 2;
    doc.setDrawColor(...COLOR_DARK);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, MARGIN + doc.getTextWidth(title), y);

    return y + 6;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
    if (y + needed > 275) {
        doc.addPage();
        return MARGIN;
    }
    return y;
}

function formatDecision(decision: string): string {
    const map: Record<string, string> = {
        escalated: 'AUTO-ESCALATED',
        flagged_collusion: 'FLAGGED - POTENTIAL COLLUSION',
        pending: 'PENDING REVIEW',
    };
    return map[decision] ?? decision.toUpperCase();
}

function getScoreColor(score: number): readonly [number, number, number] {
    if (score > 0.75) return COLOR_GREEN;
    if (score > 0.40) return COLOR_YELLOW;
    return COLOR_RED_CELL;
}

function getScoreCellColor(score: number): readonly [number, number, number] {
    if (score > 0.75) return COLOR_GREEN_CELL;
    if (score > 0.40) return COLOR_YELLOW_CELL;
    return COLOR_RED_BG;
}
