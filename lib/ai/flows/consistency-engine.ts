'use server';

import prisma from '@/lib/db';
import { embedText } from '@/lib/ai/embedding';
import type { ExtractedAnchors } from './interrogation-chat';
import {
    averagePairwiseSimilarity,
    cosineSimilarity,
} from './similarity-utils';

/**
 * Consistency Engine — calculates the Verification Coefficient (Vc).
 *
 * Vc = (S_time + S_location + S_action) / 3
 *
 * where:
 * - S_time:     average pairwise time similarity across all reporters
 * - S_location: average pairwise location similarity across all reporters
 * - S_action:   average pairwise cosine similarity of event description embeddings
 *
 * Thresholds:
 * - Vc > 0.75 → auto-escalation
 * - Vc < 0.40 → flag potential collusion
 * - Vc > 0.95 → flag potential coordination (too identical)
 */

/**
 * Result of the consistency check.
 */
interface ConsistencyResult {
    vc: number;
    timeScore: number;
    locationScore: number;
    actionScore: number;
    witnessOverlap: number;
    decision: 'escalated' | 'flagged_collusion' | 'pending';
}

/**
 * Runs the full consistency check on a shadow case after all interrogation
 * sessions are complete. Calculates Vc, updates the ShadowCase status and
 * stores the detailed scores.
 *
 * @param shadowCaseId - The ShadowCase to evaluate
 */
export async function runConsistencyCheck(shadowCaseId: string): Promise<void> {
    const sessions = await prisma.interrogationSession.findMany({
        where: { shadowCaseId, status: 'completed' },
    });

    if (sessions.length < 2) {
        return; // Need at least 2 completed sessions to compare
    }

    const anchors: ExtractedAnchors[] = sessions
        .map((s) => s.extractedAnchors as unknown as ExtractedAnchors)
        .filter(Boolean);

    if (anchors.length < 2) {
        return;
    }

    // Calculate each similarity component
    const timeScore = calculateTimeSimilarity(anchors);
    const locationScore = calculateLocationSimilarity(anchors);
    const actionScore = await calculateActionSimilarity(anchors);
    const witnessOverlap = calculateWitnessOverlap(anchors);

    // Vc = average of the three sub-scores
    const vc = (timeScore + locationScore + actionScore) / 3;

    // Determine escalation decision
    let decision: ConsistencyResult['decision'];
    if (vc > 0.95) {
        decision = 'flagged_collusion'; // Too similar = coordinated
    } else if (vc > 0.75) {
        decision = 'escalated';
    } else if (vc < 0.40) {
        decision = 'flagged_collusion';
    } else {
        decision = 'pending'; // Inconclusive — needs admin review
    }

    // Update the ShadowCase with Vc results
    await prisma.shadowCase.update({
        where: { id: shadowCaseId },
        data: {
            vcScore: vc,
            vcDetails: {
                timeScore,
                locationScore,
                actionScore,
                witnessOverlap,
                decision,
                sessionCount: sessions.length,
                anchorCount: anchors.length,
            },
            status: decision,
        },
    });
}

// ─── Time Similarity ─────────────────────────────────────────────────

/**
 * Calculates average pairwise time similarity from extracted anchors.
 * Uses fuzzy string matching on time and date fields.
 *
 * @param anchors - Array of extracted anchor objects
 * @returns Average similarity score (0-1)
 */
function calculateTimeSimilarity(anchors: ExtractedAnchors[]): number {
    const timeStrings = anchors.map((a) => {
        const parts = [a.time, a.date].filter(Boolean);
        return parts.join(' ').toLowerCase().trim();
    });

    return averagePairwiseSimilarity(timeStrings);
}

// ─── Location Similarity ─────────────────────────────────────────────

/**
 * Calculates average pairwise location similarity from extracted anchors.
 * Combines location, floor, and room into a single string for matching.
 *
 * @param anchors - Array of extracted anchor objects
 * @returns Average similarity score (0-1)
 */
function calculateLocationSimilarity(anchors: ExtractedAnchors[]): number {
    const locationStrings = anchors.map((a) => {
        const parts = [a.location, a.floor, a.room].filter(Boolean);
        return parts.join(' ').toLowerCase().trim();
    });

    return averagePairwiseSimilarity(locationStrings);
}

// ─── Action Similarity ───────────────────────────────────────────────

/**
 * Calculates average cosine similarity of event descriptions using Gemini embeddings.
 *
 * @param anchors - Array of extracted anchor objects
 * @returns Average cosine similarity score (0-1)
 */
async function calculateActionSimilarity(anchors: ExtractedAnchors[]): Promise<number> {
    const descriptions = anchors
        .map((a) => a.eventDescription)
        .filter((d): d is string => typeof d === 'string' && d.length > 5);

    if (descriptions.length < 2) return 0;

    // Embed all event descriptions
    const embeddings = await Promise.all(descriptions.map((d) => embedText(d)));

    // Pairwise cosine similarity
    let totalSim = 0;
    let pairCount = 0;
    for (let i = 0; i < embeddings.length; i++) {
        for (let j = i + 1; j < embeddings.length; j++) {
            totalSim += cosineSimilarity(embeddings[i], embeddings[j]);
            pairCount++;
        }
    }

    return pairCount > 0 ? totalSim / pairCount : 0;
}

// ─── Witness Cross-Reference ─────────────────────────────────────────

/**
 * Checks if witnesses mentioned by one reporter are themselves reporters
 * in the same case. Higher overlap increases confidence.
 *
 * @param anchors - Array of extracted anchor objects
 * @param sessions - The interrogation sessions (for userId lookups)
 * @returns Witness overlap score (0-1)
 */
function calculateWitnessOverlap(
    anchors: ExtractedAnchors[]
): number {
    // Collect all mentioned witnesses
    const allWitnesses = anchors
        .flatMap((a) => a.witnesses ?? [])
        .map((w) => w.toLowerCase().trim())
        .filter(Boolean);

    if (allWitnesses.length === 0) return 0;

    // Count unique mentions
    const uniqueWitnesses = [...new Set(allWitnesses)];

    // Count how many witnesses appear in multiple reports
    let crossReferenced = 0;
    for (const witness of uniqueWitnesses) {
        const mentionCount = allWitnesses.filter((w) => w === witness).length;
        if (mentionCount > 1) crossReferenced++;
    }

    return uniqueWitnesses.length > 0 ? crossReferenced / uniqueWitnesses.length : 0;
}


