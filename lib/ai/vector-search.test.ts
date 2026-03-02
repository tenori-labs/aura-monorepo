/**
 * @file Tests for vector-search.ts
 *
 * Covers:
 * - adaptiveThreshold: pure threshold adjustment logic
 * - findNearestIssue: mocked fetch + cookies for CoreIssue search
 * - findNearestShadowCase: mocked fetch + cookies for ShadowCase search
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { adaptiveThreshold, findNearestIssue, findNearestShadowCase } from './vector-search';

// ─── Mocks ───────────────────────────────────────────────────────────

// Mock next/headers cookies()
jest.mock('next/headers', () => ({
    cookies: jest.fn().mockResolvedValue({
        toString: () => 'sb-auth-token=mock',
    }),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
    mockFetch.mockReset();
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
});

// ─── adaptiveThreshold ──────────────────────────────────────────────

describe('adaptiveThreshold', () => {
    const BASE = 0.82;

    // Short text (< 30 chars)
    it('raises threshold by 0.06 for very short text', () => {
        expect(adaptiveThreshold(BASE, 10)).toBeCloseTo(0.88, 5);
    });

    it('raises threshold by 0.06 for text just under 30 chars', () => {
        expect(adaptiveThreshold(BASE, 29)).toBeCloseTo(0.88, 5);
    });

    it('raises threshold by 0.06 for zero-length text', () => {
        expect(adaptiveThreshold(BASE, 0)).toBeCloseTo(0.88, 5);
    });

    // Medium text (30-80 chars)
    it('returns base threshold for exactly 30 chars', () => {
        expect(adaptiveThreshold(BASE, 30)).toBeCloseTo(BASE, 5);
    });

    it('returns base threshold for 50 chars', () => {
        expect(adaptiveThreshold(BASE, 50)).toBeCloseTo(BASE, 5);
    });

    it('returns base threshold for exactly 80 chars', () => {
        expect(adaptiveThreshold(BASE, 80)).toBeCloseTo(BASE, 5);
    });

    // Long text (> 80 chars)
    it('lowers threshold by 0.03 for text over 80 chars', () => {
        expect(adaptiveThreshold(BASE, 100)).toBeCloseTo(0.79, 5);
    });

    it('lowers threshold by 0.03 for text at 81 chars', () => {
        expect(adaptiveThreshold(BASE, 81)).toBeCloseTo(0.79, 5);
    });

    // Clamping
    it('clamps to max 1.0 when base is already very high', () => {
        expect(adaptiveThreshold(0.97, 5)).toBe(1);
    });

    it('clamps to min 0.0 when base is already very low', () => {
        expect(adaptiveThreshold(0.01, 100)).toBe(0);
    });

    // Different base thresholds
    it('works with CoreIssue threshold (0.88)', () => {
        expect(adaptiveThreshold(0.88, 10)).toBeCloseTo(0.94, 5);
        expect(adaptiveThreshold(0.88, 50)).toBeCloseTo(0.88, 5);
        expect(adaptiveThreshold(0.88, 100)).toBeCloseTo(0.85, 5);
    });

    it('works with ShadowCase threshold (0.82)', () => {
        expect(adaptiveThreshold(0.82, 10)).toBeCloseTo(0.88, 5);
        expect(adaptiveThreshold(0.82, 50)).toBeCloseTo(0.82, 5);
        expect(adaptiveThreshold(0.82, 100)).toBeCloseTo(0.79, 5);
    });
});

// ─── findNearestIssue ───────────────────────────────────────────────

describe('findNearestIssue', () => {
    const fakeEmbedding = [0.1, 0.2, 0.3];

    it('returns a match when score exceeds threshold', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'issue-1', title: 'Parking issue', score: 0.92 }],
            }),
        });

        const result = await findNearestIssue(fakeEmbedding);
        expect(result).toEqual({ id: 'issue-1', title: 'Parking issue', score: 0.92 });
    });

    it('returns null when score is below threshold', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'issue-2', title: 'Low match', score: 0.70 }],
            }),
        });

        const result = await findNearestIssue(fakeEmbedding);
        expect(result).toBeNull();
    });

    it('returns null when no results', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ results: [] }),
        });

        const result = await findNearestIssue(fakeEmbedding);
        expect(result).toBeNull();
    });

    it('returns null on API error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

        const result = await findNearestIssue(fakeEmbedding);
        expect(result).toBeNull();
    });

    it('returns null on network failure (fetch throws)', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error: DNS resolution failed'));

        const result = await findNearestIssue(fakeEmbedding);
        expect(result).toBeNull();
    });

    it('applies adaptive threshold for short text (stricter)', async () => {
        // Score 0.90 would pass default 0.88, but adaptive raises to 0.94
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'issue-3', title: 'Short match', score: 0.90 }],
            }),
        });

        const result = await findNearestIssue(fakeEmbedding, 0.88, 15);
        expect(result).toBeNull(); // 0.90 < 0.94 (adaptive)
    });

    it('applies adaptive threshold for long text (lenient)', async () => {
        // Score 0.86 would fail default 0.88, but adaptive lowers to 0.85
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'issue-4', title: 'Long match', score: 0.86 }],
            }),
        });

        const result = await findNearestIssue(fakeEmbedding, 0.88, 120);
        expect(result).toEqual({ id: 'issue-4', title: 'Long match', score: 0.86 });
    });

    it('uses default threshold when textLength is not provided', async () => {
        // Score 0.89 passes default 0.88
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'issue-5', title: 'Default match', score: 0.89 }],
            }),
        });

        const result = await findNearestIssue(fakeEmbedding);
        expect(result).toEqual({ id: 'issue-5', title: 'Default match', score: 0.89 });
    });

    it('sends correct request to API', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ results: [] }),
        });

        await findNearestIssue(fakeEmbedding);

        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/vector-search',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({ queryEmbedding: fakeEmbedding }),
            })
        );
    });
});

// ─── findNearestShadowCase ──────────────────────────────────────────

describe('findNearestShadowCase', () => {
    const fakeEmbedding = [0.4, 0.5, 0.6];

    it('returns a match when score exceeds threshold', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'shadow-1', entityName: 'A staff', score: 0.90 }],
            }),
        });

        const result = await findNearestShadowCase(fakeEmbedding);
        expect(result).toEqual({ id: 'shadow-1', title: 'A staff', score: 0.90 });
    });

    it('returns null when score is below threshold', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'shadow-2', entityName: 'Low match', score: 0.60 }],
            }),
        });

        const result = await findNearestShadowCase(fakeEmbedding);
        expect(result).toBeNull();
    });

    it('returns null when no results', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ results: [] }),
        });

        const result = await findNearestShadowCase(fakeEmbedding);
        expect(result).toBeNull();
    });

    it('returns null on API error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

        const result = await findNearestShadowCase(fakeEmbedding);
        expect(result).toBeNull();
    });

    it('returns null on network failure (fetch throws)', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error: connection refused'));

        const result = await findNearestShadowCase(fakeEmbedding);
        expect(result).toBeNull();
    });

    it('applies adaptive threshold for short text (stricter)', async () => {
        // Score 0.85 passes default 0.82 but fails adaptive 0.88
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'shadow-3', entityName: 'staff', score: 0.85 }],
            }),
        });

        const result = await findNearestShadowCase(fakeEmbedding, 0.82, 10);
        expect(result).toBeNull(); // 0.85 < 0.88 (adaptive)
    });

    it('applies adaptive threshold for long text (lenient)', async () => {
        // Score 0.80 fails default 0.82 but passes adaptive 0.79
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'shadow-4', entityName: 'Head of CSE', score: 0.80 }],
            }),
        });

        const result = await findNearestShadowCase(fakeEmbedding, 0.82, 150);
        expect(result).toEqual({ id: 'shadow-4', title: 'Head of CSE', score: 0.80 });
    });

    it('sends correct request to shadow API', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ results: [] }),
        });

        await findNearestShadowCase(fakeEmbedding);

        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/vector-search/shadow',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ queryEmbedding: fakeEmbedding }),
            })
        );
    });

    it('falls back to title when entityName is missing', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                results: [{ _id: 'shadow-5', title: 'Fallback', score: 0.90 }],
            }),
        });

        const result = await findNearestShadowCase(fakeEmbedding);
        expect(result).toEqual({ id: 'shadow-5', title: 'Fallback', score: 0.90 });
    });
});
