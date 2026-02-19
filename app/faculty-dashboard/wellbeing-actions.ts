'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { getUserRole, canAccessFacultyRoutes } from '@/lib/roles';

/**
 * Fetch all wellbeing reports for the dashboard.
 * Sorted by generatedAt desc.
 */
export async function getWellbeingReports() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
    return reports.map(r => ({
        ...r,
        studentName: undefined, // Hide by default
        accessCount: r._count.accessLog,
    }));
}

/**
 * Reveal the identity of a student for a specific report.
 * LOGS THIS ACTION in IdentityAccess.
 */
export async function revealIdentity(reportId: string, reason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !canAccessFacultyRoutes(user)) {
        throw new Error('Unauthorized');
    }

    if (!reason || reason.trim().length < 5) {
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
 * Update the status of a wellbeing report.
 */
export async function updateReportStatus(reportId: string, status: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !canAccessFacultyRoutes(user)) {
        throw new Error('Unauthorized');
    }

    await prisma.wellbeingReport.update({
        where: { id: reportId },
        data: { status },
    });

    return { success: true };
}

/**
 * Generate a safe, name-free snapshot for counselors.
 * Returns the text to be shared.
 */
export async function generateCounselorReport(reportId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const snapshot = `
SAFEGUARDING REPORT — INTERNAL USE ONLY
---------------------------------------
Case ID: ${report.caseId}
Date: ${dateStr}
Status: ${report.status}

OBSERVED THEMES:
${report.themes.join(', ')}

REPORT SUMMARY:
${report.reportText}

---------------------------------------
Note for Counselors: This report is generated based on themes observed
during an automated screening. No specific diagnostic claims are made.
Please use this context to guide your initial outreach.
`;

    // Automatically update status to 'passed_on' if it was pending
    if (report.status === 'pending') {
        await prisma.wellbeingReport.update({
            where: { id: reportId },
            data: { status: 'passed_on' },
        });
    }

    return snapshot.trim();
}
