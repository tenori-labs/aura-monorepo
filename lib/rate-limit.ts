/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Tracks request timestamps per IP and rejects requests that exceed
 * the configured limit within the window. Designed for API routes
 * like /api/vector-search that make expensive Gemini calls.
 */

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

/** Default: 20 requests per 60 seconds */
const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;

/**
 * Check if a request should be rate-limited.
 *
 * @param key - Unique identifier (usually IP address or user ID)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with `allowed` boolean and `remaining` count
 */
export function rateLimit(
    key: string,
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS
): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = store.get(key) ?? { timestamps: [] };

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    if (entry.timestamps.length >= limit) {
        store.set(key, entry);
        return { allowed: false, remaining: 0 };
    }

    entry.timestamps.push(now);
    store.set(key, entry);
    return { allowed: true, remaining: limit - entry.timestamps.length };
}

/**
 * Get the IP address from a request for rate limiting.
 * Falls back to 'unknown' if headers aren't available.
 */
export function getRequestIP(headers: Headers): string {
    return (
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        'unknown'
    );
}
