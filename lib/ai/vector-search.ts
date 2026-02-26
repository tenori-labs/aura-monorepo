/**
 * Result of a vector search match against the CoreIssue collection.
 */
export interface VectorSearchResult {
    id: string;
    title: string;
    score: number;
}

/**
 * Finds the nearest CoreIssue to the query embedding using MongoDB Atlas $vectorSearch.
 *
 * Calls the /api/vector-search API route, which uses the native MongoDB driver
 * because Prisma's aggregateRaw silently returns empty results for $vectorSearch.
 *
 * @param queryEmbedding - 3072-dim embedding vector from Gemini
 * @param threshold - Minimum cosine similarity score to consider a match (default 0.75)
 * @returns The best matching CoreIssue above the threshold, or null if no match
 */
export async function findNearestIssue(
    queryEmbedding: number[],
    threshold = 0.88
): Promise<VectorSearchResult | null> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/vector-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        match ? { title: match.title, score: match.score } : 'NO MATCH'
    );

    if (!match || match.score < threshold) return null;

    return {
        id: match._id?.toString() ?? match._id,
        title: match.title,
        score: match.score,
    };
}

/**
 * Finds the nearest ShadowCase to the query embedding using MongoDB Atlas $vectorSearch.
 *
 * Calls the /api/vector-search/shadow API route for searching the ShadowCase
 * collection by entity name embedding.
 *
 * @param queryEmbedding - 3072-dim embedding vector from Gemini
 * @param threshold - Minimum cosine similarity score to consider a match (default 0.75)
 * @returns The best matching ShadowCase above the threshold, or null if no match
 */
export async function findNearestShadowCase(
    queryEmbedding: number[],
    threshold = 0.82
): Promise<VectorSearchResult | null> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/vector-search/shadow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryEmbedding }),
    });

    if (!response.ok) {
        console.error('[VectorSearch Shadow] API error:', response.status);
        return null;
    }

    const { results } = await response.json();
    const match = results?.[0];

    console.log(
        '[VectorSearch Shadow] Match:',
        match ? { entity: match.entityName, score: match.score } : 'NO MATCH'
    );

    if (!match || match.score < threshold) return null;

    return {
        id: match._id?.toString() ?? match._id,
        title: match.entityName ?? match.title ?? '',
        score: match.score,
    };
}
