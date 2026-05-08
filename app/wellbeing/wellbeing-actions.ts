'use server';

import prisma from '@/lib/db';
import { authorizeFaculty } from '@/lib/auth/guards';
import { isValidRevealReason, isValidWellbeingStatus } from './wellbeing-validation';

/**
 * Retrieves all wellbeing reports for the dashboard, sorted by most recent first.
 * Strips student names from initial payload for safety.
 */
export async function getWellbeingReports() {
  const auth = await authorizeFaculty();
  if ('error' in auth) throw new Error(auth.error);

  const reports = await prisma.wellbeingReport.findMany({
    orderBy: { generatedAt: 'desc' },
    include: {
      _count: {
        select: { accessLog: true },
      },
    },
  });

  return reports.map((r) => ({
    ...r,
    studentName: undefined,
    accessCount: r._count.accessLog,
    riskLevel: r.riskLevel,
    summary: r.summary,
    observedBehaviors: r.observedBehaviors,
    recommendedActions: r.recommendedActions,
    contextNotes: r.contextNotes,
  }));
}

/**
 * Reveals the identity of a student for a specific wellbeing report. Logs access.
 */
export async function revealIdentity(reportId: string, reason: string) {
  const auth = await authorizeFaculty();
  if ('error' in auth) throw new Error(auth.error);
  const { user } = auth;

  if (!isValidRevealReason(reason)) {
    throw new Error('A valid reason is required to reveal identity.');
  }

  await prisma.identityAccess.create({
    data: {
      reportId,
      accessedBy: user.id,
      reason: reason.trim(),
    },
  });

  const report = await prisma.wellbeingReport.findUnique({
    where: { id: reportId },
    select: { studentName: true, uid: true },
  });

  return report;
}

/**
 * Updates the status of a wellbeing report.
 */
export async function updateReportStatus(reportId: string, status: string) {
  const auth = await authorizeFaculty();
  if ('error' in auth) throw new Error(auth.error);

  if (!isValidWellbeingStatus(status)) {
    throw new Error('Invalid status.');
  }

  await prisma.wellbeingReport.update({
    where: { id: reportId },
    data: { status },
  });

  return { success: true };
}

/**
 * Generates a counselor-friendly text snapshot of a wellbeing report.
 */
export async function generateCounselorReport(reportId: string) {
  const auth = await authorizeFaculty();
  if ('error' in auth) throw new Error(auth.error);

  const report = await prisma.wellbeingReport.findUnique({
    where: { id: reportId },
  });

  if (!report) throw new Error('Report not found');

  const dateStr = new Date(report.generatedAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════╗');
  lines.push('║    SAFEGUARDING REPORT — INTERNAL USE ONLY      ║');
  lines.push('╚══════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`  Case ID:     ${report.caseId}`);
  lines.push(`  Date:        ${dateStr}`);
  lines.push(`  Status:      ${report.status.toUpperCase()}`);
  lines.push(`  Risk Level:  ${(report.riskLevel || 'UNKNOWN').toUpperCase()}`);
  lines.push('');

  lines.push('── SUMMARY ──────────────────────────────────────');
  lines.push('');
  lines.push(`  ${report.summary || report.reportText}`);
  lines.push('');

  if (report.observedBehaviors && report.observedBehaviors.length > 0) {
    lines.push('── OBSERVED BEHAVIORS ───────────────────────────');
    lines.push('');
    report.observedBehaviors.forEach((b: string) => {
      lines.push(`  • ${b}`);
    });
    lines.push('');
  }

  if (report.themes.length > 0) {
    lines.push('── THEMES ──────────────────────────────────────');
    lines.push('');
    lines.push(`  ${report.themes.join('  ·  ')}`);
    lines.push('');
  }

  if (report.recommendedActions && report.recommendedActions.length > 0) {
    lines.push('── RECOMMENDED ACTIONS ─────────────────────────');
    lines.push('');
    report.recommendedActions.forEach((a: string, i: number) => {
      lines.push(`  ${i + 1}. ${a}`);
    });
    lines.push('');
  }

  if (report.contextNotes) {
    lines.push('── CONTEXT NOTES ──────────────────────────────');
    lines.push('');
    lines.push(`  ${report.contextNotes}`);
    lines.push('');
  }

  lines.push('─────────────────────────────────────────────────');
  lines.push('  Note for Counselors: This report is generated');
  lines.push('  based on themes observed during an automated');
  lines.push('  screening. No diagnostic claims are made.');
  lines.push('  Use this context to guide initial outreach.');
  lines.push('─────────────────────────────────────────────────');

  const snapshot = lines.join('\n');

  if (report.status === 'pending') {
    await prisma.wellbeingReport.update({
      where: { id: reportId },
      data: { status: 'passed_on' },
    });
  }

  return snapshot.trim();
}
