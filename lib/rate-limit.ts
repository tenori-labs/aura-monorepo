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

// ─── Failure-counting bucket (auth brute-force defense) ─────────────────

/**
 * Separate from the request-rate limiter above. Tracks **failed** attempts
 * for a key (e.g. `<route>:<ip>`) and enforces a cooldown once the threshold
 * is crossed. Success calls `resetFailures` to wipe the bucket so legitimate
 * users aren't punished for a single typo.
 */
interface FailureEntry {
    count: number;
    lockedUntil: number;
    firstAt: number;
}

const failureStore = new Map<string, FailureEntry>();

/**
 * Returns the lockout state for a key. If the key is currently locked,
 * `lockedUntil` is the absolute timestamp (ms) the lock expires.
 */
export function getLockoutState(key: string): { locked: boolean; lockedUntil: number } {
    const entry = failureStore.get(key);
    if (!entry) return { locked: false, lockedUntil: 0 };
    const now = Date.now();
    if (entry.lockedUntil > now) {
        return { locked: true, lockedUntil: entry.lockedUntil };
    }
    // Lock expired — wipe stale entry so the next failure starts fresh.
    if (entry.lockedUntil !== 0) {
        failureStore.delete(key);
    }
    return { locked: false, lockedUntil: 0 };
}

/**
 * Record a failed attempt for the given key. Returns the post-increment state.
 * When `count` reaches `limit` within `windowMs`, the bucket is locked for
 * `lockoutMs`.
 *
 * Defaults: 5 failures per 60s → 60s lockout. Calibrated for `/console/login`.
 */
export function recordFailedAttempt(
    key: string,
    limit = 5,
    windowMs = 60_000,
    lockoutMs = 60_000
): { locked: boolean; lockedUntil: number; remaining: number } {
    const now = Date.now();
    const entry = failureStore.get(key) ?? { count: 0, lockedUntil: 0, firstAt: now };

    // Reset the count if the window has rolled over since the first failure.
    if (now - entry.firstAt > windowMs) {
        entry.count = 0;
        entry.firstAt = now;
        entry.lockedUntil = 0;
    }

    entry.count += 1;

    if (entry.count >= limit) {
        entry.lockedUntil = now + lockoutMs;
    }

    failureStore.set(key, entry);

    return {
        locked: entry.lockedUntil > now,
        lockedUntil: entry.lockedUntil,
        remaining: Math.max(0, limit - entry.count),
    };
}

/** Wipe the failure bucket for a key — call this on a successful login. */
export function resetFailures(key: string): void {
    failureStore.delete(key);
}
