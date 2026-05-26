'use server';

import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server';
import { requireCurrentUserTenantId } from '@/lib/auth/tenant';
import { isAdmin } from '@/lib/roles';
import { isValidGrievance, isValidIssueStatus } from './bulletin-validation';
import { embedText } from '@/lib/ai/embedding';
import { findNearestIssue } from '@/lib/ai/vector-search';
import { generateIssueSummary } from '@/lib/ai/flows/generate-issue-summary';

// ─── Submit Grievance ────────────────────────────────────────────────

/**
 * Full grievance submission pipeline:
 * 1. Auth → 2. Validate → 3. Shadow check → 4. (if shadow) divert to private case
 *                                           → (if not) PII filter → Embed → k-NN → Link/Create
 *
 * If the text contains personal names or safety keywords, it is diverted
 * from the public bulletin into a private ShadowCase visible only to admins.
 *
 * If the grievance matches an existing CoreIssue (cosine similarity > 0.75),
 * it increments the count. Otherwise, it creates a new CoreIssue with AI-generated
 * title/summary and stores the embedding for future matching.
 *
 * When a CoreIssue reaches its threshold (default 10), it is promoted to the
 * public bulletin and all individual grievance texts are purged.
 *
 * @param formData - Form data containing a 'text' field with the grievance
 * @returns Success/error result with optional isNew flag
 */
export async function submitGrievance(formData: FormData) {
    // 1. Auth
    const user = await getCurrentUser();

    if (!user) {
        return { error: 'You must be logged in to submit a grievance.' };
    }

    // 2. Validate
    const text = formData.get('text') as string;
    if (!isValidGrievance(text)) {
        return { error: 'Grievance must be between 10 and 500 characters.' };
    }

    try {
        // Resolve tenant up front — every row we create below must be stamped
        // with it so the tenant-scoped reads can find them later.
        const tenantId = await requireCurrentUserTenantId();

        // 3. Shadow trigger check — detect personal names and safety keywords
        const { detectShadowTrigger } = await import('@/lib/ai/flows/shadow-trigger');
        const shadowResult = await detectShadowTrigger({ grievanceText: text.trim() });

        if (shadowResult.isShadow) {
            // ── Diverted to private ShadowCase ──
            return await handleShadowReport(user.id, text.trim(), shadowResult, tenantId);
        }

        // 4. Normal bulletin pipeline (no shadow trigger detected)
        const { filterPII, clearPIISession } = await import('@/lib/ai/pii-filter');
        const [sanitizedText, sessionId] = filterPII(text.trim());

        // 5. Embed
        const embedding = await embedText(sanitizedText);

        // 6. k-NN search via Atlas Vector Search
        const match = await findNearestIssue(embedding, 0.88, sanitizedText.length);

        if (match) {
            // ── Matched an existing CoreIssue ──
            // Check if user already submitted to this issue
            const existingGrievance = await prisma.grievance.findFirst({
                where: { userId: user.id, coreIssueId: match.id },
            });

            if (existingGrievance) {
                clearPIISession(sessionId);
                return { error: 'You have already submitted a grievance for this issue.' };
            }

            // Create grievance + increment count
            await prisma.grievance.create({
                data: { userId: user.id, text: text.trim(), coreIssueId: match.id, tenantId },
            });

            const updated = await prisma.coreIssue.update({
                where: { id: match.id },
                data: { uniqueCount: { increment: 1 } },
            });

            // Check if threshold reached → promote
            if (updated.uniqueCount >= updated.threshold && !updated.isPromoted) {
                await promoteIssue(match.id);
            }

            clearPIISession(sessionId);
            return { success: true, isNew: false };
        } else {
            // ── No match → create new CoreIssue ──
            const { title, summary } = await generateIssueSummary({ grievanceText: sanitizedText });

            const coreIssue = await prisma.coreIssue.create({
                data: {
                    title,
                    summary,
                    embedding,
                    uniqueCount: 1,
                    tenantId,
                },
            });

            await prisma.grievance.create({
                data: { userId: user.id, text: text.trim(), coreIssueId: coreIssue.id, tenantId },
            });

            clearPIISession(sessionId);
            return { success: true, isNew: true };
        }
    } catch (error) {
        console.error('[Bulletin] Grievance submission failed:', error);
        return { error: 'Failed to submit grievance. Please try again.' };
    }
}

// ─── Shadow Report Handler (internal) ────────────────────────────────

/**
 * Handles a shadow-triggered grievance by creating or linking to a ShadowCase.
 *
 * Uses vector search to find an existing ShadowCase about the same entity.
 * If found, links the report and increments the count. Otherwise, creates
 * a new ShadowCase with an embedding for future matching.
 *
 * @param userId - The Supabase user ID of the reporter
 * @param text - The raw grievance text
 * @param shadowResult - Output from the shadow trigger detection flow
 * @returns Success/error result
 */
async function handleShadowReport(
    userId: string,
    text: string,
    shadowResult: { detectedNames: string[]; keywords: string[]; entityName: string },
    tenantId: string
) {
    // Build enriched embedding context for better semantic resolution.
    // Short entity names (e.g., "A staff") produce noisy embeddings, so we
    // pad with structured fields and the full report text for richer signal.
    const embeddingContext = [
        `Entity: ${shadowResult.entityName}.`,
        shadowResult.keywords.length > 0
            ? `Action: ${shadowResult.keywords.join(', ')}.`
            : '',
        `Report: ${text}`,
    ].filter(Boolean).join(' ');
    const embedding = await embedText(embeddingContext);

    // Search for existing ShadowCases — returns up to 5 candidates above threshold.
    // We iterate them and pick the first one whose entity name matches.
    const { findNearestShadowCases } = await import('@/lib/ai/vector-search');
    const { entityNamesMatch } = await import('@/lib/ai/entity-match');
    const candidates = await findNearestShadowCases(embedding, 0.82, embeddingContext.length);

    // Find the best candidate whose entity name matches the new report
    let matchedCase: { id: string; title: string; score: number } | null = null;
    for (const candidate of candidates) {
        const isSameEntity = await entityNamesMatch(shadowResult.entityName, candidate.title);
        if (isSameEntity) {
            matchedCase = candidate;
            break;
        }
    }

    if (matchedCase) {
        // Check duplicate
        const existing = await prisma.shadowReport.findFirst({
            where: { userId, shadowCaseId: matchedCase.id },
        });

        if (existing) {
            return { error: 'You have already reported this issue.' };
        }

        // Link to existing case
        await prisma.shadowReport.create({
            data: {
                userId,
                text,
                detectedNames: shadowResult.detectedNames,
                keywords: shadowResult.keywords,
                shadowCaseId: matchedCase.id,
                tenantId,
            },
        });

        const updated = await prisma.shadowCase.update({
            where: { id: matchedCase.id },
            data: { reportCount: { increment: 1 } },
        });

        // Auto-trigger interrogation when threshold reached
        if (updated.reportCount >= updated.threshold && updated.status === 'collecting') {
            const { triggerInterrogation } = await import('@/app/shadow/shadow-actions');
            await triggerInterrogation(matchedCase.id);
        }

        return { success: true, isNew: false };
    } else {
        return await createNewShadowCase(userId, text, shadowResult, embedding, tenantId);
    }
}

/**
 * Creates a new ShadowCase and links the first report to it.
 */
async function createNewShadowCase(
    userId: string,
    text: string,
    shadowResult: { detectedNames: string[]; keywords: string[]; entityName: string },
    embedding: number[],
    tenantId: string
) {
    const shadowCase = await prisma.shadowCase.create({
        data: {
            entityName: shadowResult.entityName,
            embedding,
            reportCount: 1,
            tenantId,
        },
    });

    await prisma.shadowReport.create({
        data: {
            userId,
            text,
            detectedNames: shadowResult.detectedNames,
            keywords: shadowResult.keywords,
            shadowCaseId: shadowCase.id,
            tenantId,
        },
    });

    return { success: true, isNew: true };
}

// ─── Promote Issue (internal) ────────────────────────────────────────

/**
 * Promotes a CoreIssue to the public bulletin.
 * Sets isPromoted=true and purges all individual grievance texts.
 */
async function promoteIssue(coreIssueId: string) {
    await prisma.coreIssue.update({
        where: { id: coreIssueId },
        data: { isPromoted: true, promotedAt: new Date() },
    });

    // Purge individual grievance texts for privacy
    await prisma.grievance.updateMany({
        where: { coreIssueId },
        data: { text: null },
    });

    console.log(`[Bulletin] Issue promoted: ${coreIssueId}`);
}

// ─── Get Public Issues ───────────────────────────────────────────────

/**
 * Returns all promoted CoreIssues with their institution responses.
 * Sorted by most recent promotion date.
 * Accessible by all authenticated users.
 */
export async function getPublicIssues() {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const issues = await prisma.coreIssue.findMany({
        where: { isPromoted: true },
        // `embedding` is a 768-element Float[] used only for vector search.
        // Never rendered to the bulletin; omit at the query level so we don't
        // even fetch it from MongoDB.
        omit: { embedding: true },
        orderBy: { promotedAt: 'desc' },
        include: {
            responses: {
                orderBy: { createdAt: 'asc' },
            },
            _count: { select: { grievances: true } },
        },
    });

    return issues;
}

// ─── Get Pending Count ───────────────────────────────────────────────

/**
 * Returns the count of non-promoted CoreIssues.
 * Used for the notification badge on the bulletin nav link.
 */
export async function getPendingCount() {
    const user = await getCurrentUser();

    if (!user) {
        return { count: 0 };
    }

    const count = await prisma.coreIssue.count({
        where: { isPromoted: false },
    });

    return { count };
}

// ─── Respond to Issue (Admin) ────────────────────────────────────────

/**
 * Allows an admin to respond to a promoted CoreIssue and update its status.
 * Creates an InstitutionResponse record and updates the CoreIssue status.
 * Responses are displayed with a "Verified Responder" badge on the bulletin.
 *
 * @param issueId - The CoreIssue ID to respond to
 * @param message - The institution's response message
 * @param newStatus - The updated status (acknowledged, investigating, resolved)
 */
export async function respondToIssue(issueId: string, message: string, newStatus: string) {
    const user = await getCurrentUser();

    if (!user || !isAdmin(user)) {
        return { error: 'Only administrators can respond to issues.' };
    }

    if (!message || message.trim().length < 5) {
        return { error: 'Response must be at least 5 characters.' };
    }

    if (!isValidIssueStatus(newStatus)) {
        return { error: 'Invalid status.' };
    }

    try {
        await prisma.institutionResponse.create({
            data: {
                coreIssueId: issueId,
                responderId: user.id,
                message: message.trim(),
                newStatus,
            },
        });

        await prisma.coreIssue.update({
            where: { id: issueId },
            data: { status: newStatus },
        });

        return { success: true };
    } catch (error) {
        console.error('[Bulletin] Response failed:', error);
        return { error: 'Failed to submit response.' };
    }
}

// ─── Get Issue Timeline ──────────────────────────────────────────────

/**
 * Returns the full response timeline for a specific promoted CoreIssue.
 * Includes all institution responses in chronological order.
 */
export async function getIssueTimeline(issueId: string) {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const issue = await prisma.coreIssue.findUnique({
        where: { id: issueId, isPromoted: true },
        include: {
            responses: {
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!issue) {
        throw new Error('Issue not found.');
    }

    return {
        ...issue,
        embedding: undefined,
    };
}
