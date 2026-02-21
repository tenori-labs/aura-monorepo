import { isValidRevealReason, MIN_REASON_LENGTH } from './wellbeing-validation';

// ─── isValidRevealReason ────────────────────────────────────────────

describe('isValidRevealReason', () => {
    it('accepts a reason with 5+ characters', () => {
        expect(isValidRevealReason('Student welfare concern')).toBe(true);
    });

    it('accepts a reason with exactly 5 characters (boundary)', () => {
        expect(isValidRevealReason('abcde')).toBe(true);
    });

    it('rejects a reason with fewer than 5 characters (boundary - 1)', () => {
        expect(isValidRevealReason('abcd')).toBe(false);
    });

    it('rejects an empty string', () => {
        expect(isValidRevealReason('')).toBe(false);
    });

    it('rejects null', () => {
        expect(isValidRevealReason(null)).toBe(false);
    });

    it('rejects undefined', () => {
        expect(isValidRevealReason(undefined)).toBe(false);
    });

    it('rejects a whitespace-only string shorter than 5 chars when trimmed', () => {
        expect(isValidRevealReason('    ')).toBe(false);
    });

    it('rejects a string that is 5+ chars but only whitespace', () => {
        expect(isValidRevealReason('     ')).toBe(false);
    });

    it('accepts a reason with leading/trailing whitespace but 5+ trimmed chars', () => {
        expect(isValidRevealReason('  hello  ')).toBe(true);
    });

    // Type safety
    it('rejects non-string values', () => {
        expect(isValidRevealReason(123 as any)).toBe(false);
        expect(isValidRevealReason({} as any)).toBe(false);
        expect(isValidRevealReason([] as any)).toBe(false);
    });
});

// ─── MIN_REASON_LENGTH constant ─────────────────────────────────────

describe('MIN_REASON_LENGTH', () => {
    it('equals 5', () => {
        expect(MIN_REASON_LENGTH).toBe(5);
    });
});
