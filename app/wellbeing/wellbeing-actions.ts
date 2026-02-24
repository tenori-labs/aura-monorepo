'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { canAccessFacultyRoutes } from '@/lib/roles';
import { isValidRevealReason, isValidWellbeingStatus } from './wellbeing-validation';

/**
 * Retrieves all wellbeing reports for the dashboard, sorted by most recent first.
 * Requires faculty authorization and strips student names from initial payload for safety.
 *
 * @returns Array of mapped wellbeing report objects omitting studentName, or throws Error if unauthorized
 */
export async function getWellbeingReports() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessFacultyRoutes(user)) {
    throw new Error('Unauthorized');
  }

  const reports = await prisma.wellbeingReport.findMany({
    orderBy: { generatedAt: 'desc' },
    include: {
      _count: {
        select: { accessLog: true },
      },
    },
  });

  // Strip studentName from the initial fetch for safety
  // Only return it via revealIdentity
  return reports.map((r) => ({
    ...r,
    studentName: undefined, // Hide by default
    accessCount: r._count.accessLog,
    // Structured fields pass through as-is
    riskLevel: r.riskLevel,
    summary: r.summary,
    observedBehaviors: r.observedBehaviors,
    recommendedActions: r.recommendedActions,
    contextNotes: r.contextNotes,
  }));
}

/**
 * Reveals the identity of a student for a specific wellbeing report.
 * Requires faculty authorization, valid reason, and logs access securely in the database.
 *
 * @param reportId - Unique ID of the wellbeing report to reveal
 * @param reason - Justification string of at least 5 characters for accessing sensitive PI data
 * @returns Object containing the studentName and uid, or throws Error if unauthorized or parameters invalid
 */
export async function revealIdentity(reportId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessFacultyRoutes(user)) {
    throw new Error('Unauthorized');
  }

  if (!isValidRevealReason(reason)) {
    throw new Error('A valid reason is required to reveal identity.');
  }

  // Log the access
  await prisma.identityAccess.create({
    data: {
      reportId,
      accessedBy: user.id,
      reason: reason.trim(),
    },
  });

  // Fetch and return the name
  const report = await prisma.wellbeingReport.findUnique({
    where: { id: reportId },
    select: { studentName: true, uid: true },
  });

  return report;
}

/**
 * Updates the status of a wellbeing report.
 * Requires faculty authorization and performs a database update.
 *
 * @param reportId - Unique ID of the wellbeing report
 * @param status - New status string to be set for the report
 * @returns { success: true } when update succeeds, or throws Error if unauthorized
 */
export async function updateReportStatus(reportId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessFacultyRoutes(user)) {
    throw new Error('Unauthorized');
  }

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
 * Generates a safe, name-free text snapshot of a wellbeing report for external counselor sharing.
 * Requires faculty authorization. Does not mutate the original database record.
 *
 * @param reportId - Unique ID of the wellbeing report to format
 * @returns { text: string } Cleaned counselor-friendly report string, or throws Error if unauthorized
 */
export async function generateCounselorReport(reportId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessFacultyRoutes(user)) {
    throw new Error('Unauthorized');
  }

  const report = await prisma.wellbeingReport.findUnique({
    where: { id: reportId },
  });

  if (!report) throw new Error('Report not found');

  const dateStr = new Date(report.generatedAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build the snapshot in sections matching the UI layout
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

  // ─── Summary ───
  lines.push('── SUMMARY ──────────────────────────────────────');
  lines.push('');
  lines.push(`  ${report.summary || report.reportText}`);
  lines.push('');

  // ─── Observed Behaviors ───
  if (report.observedBehaviors && report.observedBehaviors.length > 0) {
    lines.push('── OBSERVED BEHAVIORS ───────────────────────────');
    lines.push('');
    report.observedBehaviors.forEach((b: string) => {
      lines.push(`  • ${b}`);
    });
    lines.push('');
  }

  // ─── Themes ───
  if (report.themes.length > 0) {
    lines.push('── THEMES ──────────────────────────────────────');
    lines.push('');
    lines.push(`  ${report.themes.join('  ·  ')}`);
    lines.push('');
  }

  // ─── Recommended Actions ───
  if (report.recommendedActions && report.recommendedActions.length > 0) {
    lines.push('── RECOMMENDED ACTIONS ─────────────────────────');
    lines.push('');
    report.recommendedActions.forEach((a: string, i: number) => {
      lines.push(`  ${i + 1}. ${a}`);
    });
    lines.push('');
  }

  // ─── Context Notes ───
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

  // Automatically update status to 'passed_on' if it was pending
  if (report.status === 'pending') {
    await prisma.wellbeingReport.update({
      where: { id: reportId },
      data: { status: 'passed_on' },
    });
  }

  return snapshot.trim();
}
