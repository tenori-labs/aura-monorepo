/**
 * @file Tests for consistency engine utility functions.
 *
 * Covers jaccardSimilarity, cosineSimilarity, and averagePairwiseSimilarity —
 * the pure math functions used when calculating the Verification Coefficient (Vc).
 */
import {
    jaccardSimilarity,
    cosineSimilarity,
    averagePairwiseSimilarity,
} from './similarity-utils';

// ─── jaccardSimilarity ───────────────────────────────────────────────

describe('jaccardSimilarity', () => {
    it('returns 1 for identical strings', () => {
        expect(jaccardSimilarity('room 301 floor 3', 'room 301 floor 3')).toBe(1);
    });

    it('returns 0 for completely different strings', () => {
        expect(jaccardSimilarity('room 301', 'auditorium basement')).toBe(0);
    });

    it('returns a partial score for overlapping words', () => {
        // "room" is shared → 1 intersection / 3 union = 0.333...
        const score = jaccardSimilarity('room 301', 'room 405');
        expect(score).toBeCloseTo(1 / 3, 5);
    });

    it('is case-sensitive (callers should lowercase first)', () => {
        expect(jaccardSimilarity('Room', 'room')).toBe(0);
    });

    it('returns 1 for two empty strings (identical token sets)', () => {
        // ''.split(/\s+/) → [''] for both, so sets match
        expect(jaccardSimilarity('', '')).toBe(1);
    });

    it('handles single-word identical strings', () => {
        expect(jaccardSimilarity('morning', 'morning')).toBe(1);
    });
});

// ─── cosineSimilarity ────────────────────────────────────────────────

describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
        expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
        expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 5);
    });

    it('returns a high score for similar vectors', () => {
        const score = cosineSimilarity([1, 2, 3], [1, 2, 4]);
        expect(score).toBeGreaterThan(0.95);
    });

    it('returns low score for opposing vectors', () => {
        const score = cosineSimilarity([1, 0, 0], [-1, 0, 0]);
        expect(score).toBeCloseTo(-1, 5);
    });

    it('returns 0 for zero vectors', () => {
        expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
    });

    it('handles single-dimension vectors', () => {
        expect(cosineSimilarity([5], [10])).toBeCloseTo(1, 5);
    });
});

// ─── averagePairwiseSimilarity ───────────────────────────────────────

describe('averagePairwiseSimilarity', () => {
    it('returns 0 for a single string (needs >= 2)', () => {
        expect(averagePairwiseSimilarity(['monday morning'])).toBe(0);
    });

    it('returns 0 for empty array', () => {
        expect(averagePairwiseSimilarity([])).toBe(0);
    });

    it('returns 1 when all strings are identical', () => {
        expect(
            averagePairwiseSimilarity(['monday 3pm', 'monday 3pm', 'monday 3pm'])
        ).toBe(1);
    });

    it('returns 0 when all strings are completely different', () => {
        expect(
            averagePairwiseSimilarity(['monday', 'friday', 'wednesday'])
        ).toBe(0);
    });

    it('returns partial score for mixed overlap', () => {
        const score = averagePairwiseSimilarity([
            'monday morning',
            'monday afternoon',
            'tuesday morning',
        ]);
        // Each pair shares one word out of three unique → partial overlap
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(1);
    });

    it('filters out empty strings', () => {
        expect(averagePairwiseSimilarity(['hello', '', 'hello'])).toBe(1);
    });
});
