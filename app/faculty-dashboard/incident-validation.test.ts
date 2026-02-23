import {
    isValidStatus,
    getInvalidStatusError,
    VALID_STATUSES,
} from './incident-validation';

// ─── isValidStatus — parametrized valid inputs ──────────────────────

describe('isValidStatus', () => {
    for (const status of VALID_STATUSES) {
        it(`accepts "${status}"`, () => {
            expect(isValidStatus(status)).toBe(true);
        });
    }

    it('rejects an unknown status string', () => {
        expect(isValidStatus('archived')).toBe(false);
    });

    it('rejects an empty string', () => {
        expect(isValidStatus('')).toBe(false);
    });

    it('is case-sensitive (rejects "Pending")', () => {
        expect(isValidStatus('Pending')).toBe(false);
    });

    it('rejects whitespace-padded valid statuses', () => {
        expect(isValidStatus(' pending ')).toBe(false);
    });

    // Type safety — production code WILL get garbage input
    it('rejects non-string values', () => {
        expect(isValidStatus(null as unknown as string)).toBe(false);
        expect(isValidStatus(undefined as unknown as string)).toBe(false);
        expect(isValidStatus(123 as unknown as string)).toBe(false);
        expect(isValidStatus({} as unknown as string)).toBe(false);
    });
});

// ─── getInvalidStatusError ──────────────────────────────────────────

describe('getInvalidStatusError', () => {
    it('includes the rejected status in the error message', () => {
        const msg = getInvalidStatusError('archived');
        expect(msg).toContain('archived');
    });

    it('lists all valid statuses in the error message', () => {
        const msg = getInvalidStatusError('bad');
        for (const status of VALID_STATUSES) {
            expect(msg).toContain(status);
        }
    });

    it('has a consistent error format', () => {
        const msg = getInvalidStatusError('bad');
        expect(msg).toMatch(/Invalid status/i);
    });
});

// ─── VALID_STATUSES constant ────────────────────────────────────────

describe('VALID_STATUSES', () => {
    it('contains exactly 3 statuses', () => {
        expect(VALID_STATUSES).toHaveLength(3);
    });

    it('contains pending, reviewing, and closed', () => {
        expect(VALID_STATUSES).toContain('pending');
        expect(VALID_STATUSES).toContain('reviewing');
        expect(VALID_STATUSES).toContain('closed');
    });

    it('should be immutable (frozen)', () => {
        expect(Object.isFrozen(VALID_STATUSES)).toBe(true);
    });
});
