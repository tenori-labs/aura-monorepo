/**
 * @file Pure utility functions for the consistency engine.
 *
 * These are extracted from consistency-engine.ts so they can be
 * exported without the 'use server' constraint (which requires
 * all exports to be async).
 */

/**
 * Calculates the average pairwise string similarity using Jaccard index
 * on word-level tokens. Simple but effective for fuzzy matching.
 *
 * @param strings - Array of strings to compare
 * @returns Average pairwise similarity (0-1)
 */
export function averagePairwiseSimilarity(strings: string[]): number {
    const nonEmpty = strings.filter((s) => s.length > 0);
    if (nonEmpty.length < 2) return 0;

    let totalSim = 0;
    let pairCount = 0;

    for (let i = 0; i < nonEmpty.length; i++) {
        for (let j = i + 1; j < nonEmpty.length; j++) {
            totalSim += jaccardSimilarity(nonEmpty[i], nonEmpty[j]);
            pairCount++;
        }
    }

    return pairCount > 0 ? totalSim / pairCount : 0;
}

/**
 * Jaccard similarity between two strings based on word tokens.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score (0-1)
 */
export function jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(a.split(/\s+/));
    const setB = new Set(b.split(/\s+/));
    const intersection = [...setA].filter((x) => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
}

/**
 * Cosine similarity between two embedding vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity (0-1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
}
