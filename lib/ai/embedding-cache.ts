/**
 * LRU in-memory cache for embedding vectors.
 *
 * Avoids redundant Gemini API calls when the consistency engine
 * computes pairwise similarity across many anchor strings.
 * Cache is per-process (server-action scope) and resets on restart.
 */

const MAX_CACHE_SIZE = 200;

const cache = new Map<string, number[]>();

/**
 * Get a cached embedding for the given text, or null if not cached.
 */
export function getCachedEmbedding(text: string): number[] | null {
    return cache.get(text) ?? null;
}

/**
 * Store an embedding in the cache. Evicts oldest entry if at capacity.
 */
export function setCachedEmbedding(text: string, embedding: number[]): void {
    // LRU eviction: delete oldest entry if full
    if (cache.size >= MAX_CACHE_SIZE) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(text, embedding);
}

/**
 * Get embedding from cache or compute it, caching the result.
 * Drop-in replacement for `embedText` in hot paths.
 */
export async function cachedEmbedText(text: string): Promise<number[]> {
    const cached = getCachedEmbedding(text);
    if (cached) return cached;

    const { embedText } = await import('@/lib/ai/embedding');
    const embedding = await embedText(text);
    setCachedEmbedding(text, embedding);
    return embedding;
}
