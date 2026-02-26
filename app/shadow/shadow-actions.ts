'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/roles';
import { isValidShadowStatus, isValidCaseId } from './shadow-validation';

// ─── Get Shadow Cases (Admin) ────────────────────────────────────────

/**
 * Returns all ShadowCases with their report counts.
 * Admin-only. Sorted by most recent first.
 *
 * @returns Array of shadow cases with report counts
 */
export async function getShadowCases() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
        return { error: 'Unauthorized' };
    }

    const cases = await prisma.shadowCase.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
            _count: { select: { reports: true } },
        },
    });

    return {
        cases: cases.map((c: { id: string; entityName: string; reportCount: number; threshold: number; status: string; createdAt: Date; updatedAt: Date }) => ({
            id: c.id,
            entityName: c.entityName,
            reportCount: c.reportCount,
            threshold: c.threshold,
            status: c.status,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        })),
    };
}

// ─── Get Shadow Case Detail (Admin) ──────────────────────────────────

/**
 * Returns a single ShadowCase with all its reports.
 * Admin-only. Reports are sorted by most recent first.
 *
 * @param caseId - The ShadowCase ID to retrieve
 * @returns The shadow case with embedded reports, or an error
 */
export async function getShadowCaseDetail(caseId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
        return { error: 'Unauthorized' };
    }

    if (!isValidCaseId(caseId)) {
        return { error: 'Invalid case ID.' };
    }

    const shadowCase = await prisma.shadowCase.findUnique({
        where: { id: caseId },
        include: {
            reports: {
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    text: true,
                    detectedNames: true,
                    keywords: true,
                    createdAt: true,
                },
            },
        },
    });

    if (!shadowCase) {
        return { error: 'Case not found.' };
    }

    return { shadowCase };
}

// ─── Update Shadow Case Status (Admin) ───────────────────────────────

/**
 * Updates the status of a ShadowCase.
 * Admin-only. Valid statuses: collecting, interrogating, escalated,
 * flagged_collusion, closed.
 *
 * @param caseId - The ShadowCase ID to update
 * @param newStatus - The new status value
 * @returns Success/error result
 */
export async function updateShadowCaseStatus(caseId: string, newStatus: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
        return { error: 'Unauthorized' };
    }

    if (!isValidCaseId(caseId)) {
        return { error: 'Invalid case ID.' };
    }

    if (!isValidShadowStatus(newStatus)) {
        return { error: 'Invalid status.' };
    }

    await prisma.shadowCase.update({
        where: { id: caseId },
        data: { status: newStatus },
    });

    return { success: true };
}

// ─── Trigger Interrogation (internal) ────────────────────────────────

/**
 * Creates individual InterrogationSession records for each reporter
 * in a shadow case that has reached its reporting threshold.
 * Called automatically from handleShadowReport when reportCount >= threshold.
 *
 * @param shadowCaseId - The ShadowCase ID to initiate interrogation for
 */
export async function triggerInterrogation(shadowCaseId: string) {
    // Get all unique reporters for this case
    const reports = await prisma.shadowReport.findMany({
        where: { shadowCaseId },
        select: { userId: true },
        distinct: ['userId'],
    });

    // Create a session for each reporter
    const sessionData = reports.map((r) => ({
        shadowCaseId,
        userId: r.userId,
        status: 'pending',
        chatHistory: [],
    }));

    await prisma.interrogationSession.createMany({
        data: sessionData,
    });

    // Update the ShadowCase status
    await prisma.shadowCase.update({
        where: { id: shadowCaseId },
        data: { status: 'interrogating' },
    });
}
