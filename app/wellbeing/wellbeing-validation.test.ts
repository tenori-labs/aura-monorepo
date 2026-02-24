import { isValidRevealReason, isValidWellbeingStatus, MIN_REASON_LENGTH, VALID_WELLBEING_STATUSES } from './wellbeing-validation';

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
        expect(isValidRevealReason(123 as unknown as string | null | undefined)).toBe(false);
        expect(isValidRevealReason({} as unknown as string | null | undefined)).toBe(false);
        expect(isValidRevealReason([] as unknown as string | null | undefined)).toBe(false);
    });
});

// ─── MIN_REASON_LENGTH constant ─────────────────────────────────────

describe('MIN_REASON_LENGTH', () => {
    it('equals 5', () => {
        expect(MIN_REASON_LENGTH).toBe(5);
    });
});

// ─── isValidWellbeingStatus ─────────────────────────────────────────

describe('isValidWellbeingStatus', () => {
    for (const status of VALID_WELLBEING_STATUSES) {
        it(`accepts "${status}"`, () => {
            expect(isValidWellbeingStatus(status)).toBe(true);
        });
    }

    it('rejects an unknown status string', () => {
        expect(isValidWellbeingStatus('hacked')).toBe(false);
    });

    it('rejects an empty string', () => {
        expect(isValidWellbeingStatus('')).toBe(false);
    });

    it('is case-sensitive (rejects "Pending")', () => {
        expect(isValidWellbeingStatus('Pending')).toBe(false);
    });

    it('rejects null', () => {
        expect(isValidWellbeingStatus(null)).toBe(false);
    });

    it('rejects undefined', () => {
        expect(isValidWellbeingStatus(undefined)).toBe(false);
    });

    it('rejects non-string values', () => {
        expect(isValidWellbeingStatus(123 as unknown as string)).toBe(false);
        expect(isValidWellbeingStatus({} as unknown as string)).toBe(false);
    });
});

// ─── VALID_WELLBEING_STATUSES constant ──────────────────────────────

describe('VALID_WELLBEING_STATUSES', () => {
    it('contains exactly 3 statuses', () => {
        expect(VALID_WELLBEING_STATUSES).toHaveLength(3);
    });

    it('contains pending, reviewed, and passed_on', () => {
        expect(VALID_WELLBEING_STATUSES).toContain('pending');
        expect(VALID_WELLBEING_STATUSES).toContain('reviewed');
        expect(VALID_WELLBEING_STATUSES).toContain('passed_on');
    });

    it('should be immutable (frozen)', () => {
        expect(Object.isFrozen(VALID_WELLBEING_STATUSES)).toBe(true);
    });
});
