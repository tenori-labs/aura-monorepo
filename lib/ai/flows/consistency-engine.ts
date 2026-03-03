'use server';

import prisma from '@/lib/db';
import { cachedEmbedText } from '@/lib/ai/embedding-cache';
import type { ExtractedAnchors } from './interrogation-chat';
import {
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
    const timeScore = await calculateTimeSimilarity(anchors);
    const locationScore = await calculateLocationSimilarity(anchors);
    const actionScore = await calculateActionSimilarity(anchors);
    const witnessOverlap = await calculateWitnessOverlap(anchors);

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
 * Uses Gemini embeddings for semantic matching so that "11.30" and
 * "around 11 am" are recognized as similar.
 *
 * @param anchors - Array of extracted anchor objects
 * @returns Average cosine similarity score (0-1)
 */
async function calculateTimeSimilarity(anchors: ExtractedAnchors[]): Promise<number> {
    const timeStrings = anchors
        .map((a) => {
            const parts = [a.time, a.date].filter(Boolean);
            return parts.join(' ').trim();
        })
        .filter((s) => s.length > 0);

    if (timeStrings.length < 2) return 0;

    const results = await Promise.allSettled(timeStrings.map((s) => cachedEmbedText(s)));
    const embeddings = results
        .filter((r): r is PromiseFulfilledResult<number[]> => r.status === 'fulfilled')
        .map((r) => r.value);

    if (embeddings.length < 2) return 0;

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

// ─── Location Similarity ─────────────────────────────────────────────

/**
 * Calculates average pairwise location similarity from extracted anchors.
 * Uses Gemini embeddings for semantic matching so that "east block first floor"
 * and "east block building first floor bathroom" are recognized as similar.
 *
 * @param anchors - Array of extracted anchor objects
 * @returns Average cosine similarity score (0-1)
 */
async function calculateLocationSimilarity(anchors: ExtractedAnchors[]): Promise<number> {
    const locationStrings = anchors
        .map((a) => {
            const parts = [a.location, a.floor, a.room].filter(Boolean);
            return parts.join(' ').trim();
        })
        .filter((s) => s.length > 0);

    if (locationStrings.length < 2) return 0;

    const results = await Promise.allSettled(locationStrings.map((s) => cachedEmbedText(s)));
    const embeddings = results
        .filter((r): r is PromiseFulfilledResult<number[]> => r.status === 'fulfilled')
        .map((r) => r.value);

    if (embeddings.length < 2) return 0;

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

    const results = await Promise.allSettled(descriptions.map((d) => cachedEmbedText(d)));
    const embeddings = results
        .filter((r): r is PromiseFulfilledResult<number[]> => r.status === 'fulfilled')
        .map((r) => r.value);

    if (embeddings.length < 2) return 0;

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
 * Checks if witnesses mentioned across reports are similar using embeddings.
 * Uses cosine similarity so "chris nikhil" and "Chris Nikhil" (or even
 * partial names like "chris") are detected as cross-references.
 *
 * A match threshold of 0.80 is used to determine if two witness names
 * refer to the same person.
 *
 * @param anchors - Array of extracted anchor objects
 * @returns Witness overlap score (0-1)
 */
async function calculateWitnessOverlap(
    anchors: ExtractedAnchors[]
): Promise<number> {
    // Collect witnesses per report
    const witnessesPerReport = anchors
        .map((a) => (a.witnesses ?? []).filter((w) => w.trim().length > 0))
        .filter((arr) => arr.length > 0);

    if (witnessesPerReport.length < 2) return 0;

    // Flatten all witness names and embed them
    const allWitnesses = witnessesPerReport.flat();
    if (allWitnesses.length < 2) return 0;

    const results = await Promise.allSettled(
        allWitnesses.map((w) => cachedEmbedText(w.toLowerCase().trim()))
    );
    const embeddings = results
        .filter((r): r is PromiseFulfilledResult<number[]> => r.status === 'fulfilled')
        .map((r) => r.value);

    // Build a map of which report each witness belongs to
    const reportIndex: number[] = [];
    for (let r = 0; r < witnessesPerReport.length; r++) {
        for (let w = 0; w < witnessesPerReport[r].length; w++) {
            reportIndex.push(r);
        }
    }

    // Check for cross-report matches (similarity > 0.80)
    const MATCH_THRESHOLD = 0.80;
    let crossMatches = 0;
    let crossPairs = 0;

    for (let i = 0; i < allWitnesses.length; i++) {
        for (let j = i + 1; j < allWitnesses.length; j++) {
            // Only compare witnesses from different reports
            if (reportIndex[i] !== reportIndex[j]) {
                crossPairs++;
                const sim = cosineSimilarity(embeddings[i], embeddings[j]);
                if (sim >= MATCH_THRESHOLD) {
                    crossMatches++;
                }
            }
        }
    }

    return crossPairs > 0 ? crossMatches / crossPairs : 0;
}
