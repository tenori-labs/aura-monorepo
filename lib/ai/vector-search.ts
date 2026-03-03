import { cookies } from 'next/headers';

/**
 * Result of a vector search match against the CoreIssue collection.
 */
export interface VectorSearchResult {
    id: string;
    title: string;
    score: number;
}

/**
 * Adjusts the similarity threshold based on the length of the original text.
 *
 * Short text produces noisy embeddings with artificially high similarity,
 * so we raise the threshold to avoid false positives. Long text has rich
 * semantic signal, so we can afford to be more lenient.
 *
 * @param base - The default threshold
 * @param textLength - Character count of the original text
 * @returns Adjusted threshold, clamped to [0, 1]
 */
export function adaptiveThreshold(base: number, textLength: number): number {
    if (textLength < 30) return Math.min(1, base + 0.06);
    if (textLength > 80) return Math.max(0, base - 0.03);
    return base;
}

/**
 * Finds the nearest CoreIssue to the query embedding using MongoDB Atlas $vectorSearch.
 *
 * Calls the /api/vector-search API route, which uses the native MongoDB driver
 * because Prisma's aggregateRaw silently returns empty results for $vectorSearch.
 *
 * @param queryEmbedding - 3072-dim embedding vector from Gemini
 * @param threshold - Minimum cosine similarity score to consider a match (default 0.88)
 * @param textLength - Optional character count of the original text for adaptive thresholding
 * @returns The best matching CoreIssue above the threshold, or null if no match
 */
export async function findNearestIssue(
    queryEmbedding: number[],
    threshold = 0.88,
    textLength?: number
): Promise<VectorSearchResult | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const cookieStore = await cookies();

        const effectiveThreshold = textLength != null
            ? adaptiveThreshold(threshold, textLength)
            : threshold;

        const response = await fetch(`${baseUrl}/api/vector-search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookieStore.toString(),
            },
            body: JSON.stringify({ queryEmbedding }),
        });

        if (!response.ok) {
            console.error('[VectorSearch] API error:', response.status);
            return null;
        }

        const { results } = await response.json();
        const match = results?.[0];

        console.log(
            '[VectorSearch] Match:',
            match ? { title: match.title, score: match.score, threshold: effectiveThreshold } : 'NO MATCH'
        );

        if (!match || match.score < effectiveThreshold) return null;

        return {
            id: match._id?.toString() ?? match._id,
            title: match.title,
            score: match.score,
        };
    } catch (error) {
        console.error('[VectorSearch] Network error:', error);
        return null;
    }
}

/**
 * Finds the nearest ShadowCases to the query embedding using MongoDB Atlas $vectorSearch.
 *
 * Returns ALL candidates above the threshold (up to 5), sorted by score descending.
 * The caller is responsible for filtering by entity name.
 *
 * @param queryEmbedding - 3072-dim embedding vector from Gemini
 * @param threshold - Minimum cosine similarity score to consider a match (default 0.82)
 * @param textLength - Optional character count of the original text for adaptive thresholding
 * @returns Array of matching ShadowCases above the threshold
 */
export async function findNearestShadowCases(
    queryEmbedding: number[],
    threshold = 0.82,
    textLength?: number
): Promise<VectorSearchResult[]> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const cookieStore = await cookies();

        const effectiveThreshold = textLength != null
            ? adaptiveThreshold(threshold, textLength)
            : threshold;

        const response = await fetch(`${baseUrl}/api/vector-search/shadow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookieStore.toString(),
            },
            body: JSON.stringify({ queryEmbedding }),
        });

        if (!response.ok) {
            console.error('[VectorSearch Shadow] API error:', response.status);
            return [];
        }

        const { results } = await response.json();
        if (!results || !Array.isArray(results)) return [];

        // Filter by threshold and map to VectorSearchResult
        return results
            .filter((r: { score: number }) => r.score >= effectiveThreshold)
            .map((r: { _id: { toString(): string }; entityName?: string; title?: string; score: number }) => ({
                id: r._id?.toString() ?? r._id,
                title: r.entityName ?? r.title ?? '',
                score: r.score,
            }));
    } catch (error) {
        console.error('[VectorSearch Shadow] Network error:', error);
        return [];
    }
}

/**
 * Finds the single nearest ShadowCase (backward compatibility).
 * @deprecated Use findNearestShadowCases (plural) for entity-name-aware matching.
 */
export async function findNearestShadowCase(
    queryEmbedding: number[],
    threshold = 0.82,
    textLength?: number
): Promise<VectorSearchResult | null> {
    const results = await findNearestShadowCases(queryEmbedding, threshold, textLength);
    return results.length > 0 ? results[0] : null;
}


