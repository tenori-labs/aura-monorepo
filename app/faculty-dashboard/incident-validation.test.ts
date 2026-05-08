import {
    isValidStatus,
    getInvalidStatusError,
    isValidTransition,
    getNextStatus,
    normalizeLegacyStatus,
    VALID_STATUSES,
} from './incident-validation';

// ─── isValidStatus ──────────────────────────────────────────────────

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

    it('is case-sensitive (rejects "Submitted")', () => {
        expect(isValidStatus('Submitted')).toBe(false);
    });

    it('rejects whitespace-padded valid statuses', () => {
        expect(isValidStatus(' submitted ')).toBe(false);
    });

    it('rejects non-string values', () => {
        expect(isValidStatus(null as unknown as string)).toBe(false);
        expect(isValidStatus(undefined as unknown as string)).toBe(false);
        expect(isValidStatus(123 as unknown as string)).toBe(false);
        expect(isValidStatus({} as unknown as string)).toBe(false);
    });

    it('rejects legacy status names', () => {
        expect(isValidStatus('pending')).toBe(false);
        expect(isValidStatus('reviewing')).toBe(false);
        expect(isValidStatus('closed')).toBe(false);
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
    it('contains exactly 4 statuses', () => {
        expect(VALID_STATUSES).toHaveLength(4);
    });

    it('contains the canonical 4-stage workflow', () => {
        expect(VALID_STATUSES).toContain('submitted');
        expect(VALID_STATUSES).toContain('acknowledged');
        expect(VALID_STATUSES).toContain('investigating');
        expect(VALID_STATUSES).toContain('resolved');
    });

    it('preserves canonical order', () => {
        expect([...VALID_STATUSES]).toEqual([
            'submitted',
            'acknowledged',
            'investigating',
            'resolved',
        ]);
    });

    it('should be immutable (frozen)', () => {
        expect(Object.isFrozen(VALID_STATUSES)).toBe(true);
    });
});

// ─── isValidTransition ──────────────────────────────────────────────

describe('isValidTransition', () => {
    it.each([
        ['submitted', 'acknowledged'],
        ['acknowledged', 'investigating'],
        ['investigating', 'resolved'],
    ] as const)('allows %s → %s', (from, to) => {
        expect(isValidTransition(from, to)).toBe(true);
    });

    it.each([
        ['submitted', 'investigating'],
        ['submitted', 'resolved'],
        ['acknowledged', 'submitted'],
        ['acknowledged', 'resolved'],
        ['investigating', 'submitted'],
        ['investigating', 'acknowledged'],
        ['resolved', 'submitted'],
        ['resolved', 'acknowledged'],
        ['resolved', 'investigating'],
    ] as const)('rejects %s → %s', (from, to) => {
        expect(isValidTransition(from, to)).toBe(false);
    });

    it('rejects self-transitions', () => {
        for (const status of VALID_STATUSES) {
            expect(isValidTransition(status, status)).toBe(false);
        }
    });

    it('rejects unknown statuses on either side', () => {
        expect(isValidTransition('garbage', 'submitted')).toBe(false);
        expect(isValidTransition('submitted', 'garbage')).toBe(false);
    });
});

// ─── getNextStatus ──────────────────────────────────────────────────

describe('getNextStatus', () => {
    it('returns the next sequential status', () => {
        expect(getNextStatus('submitted')).toBe('acknowledged');
        expect(getNextStatus('acknowledged')).toBe('investigating');
        expect(getNextStatus('investigating')).toBe('resolved');
    });

    it('returns null for the terminal status', () => {
        expect(getNextStatus('resolved')).toBeNull();
    });

    it('returns null for unknown statuses', () => {
        expect(getNextStatus('garbage')).toBeNull();
    });
});

// ─── normalizeLegacyStatus ──────────────────────────────────────────

describe('normalizeLegacyStatus', () => {
    it('maps legacy values to new schema', () => {
        expect(normalizeLegacyStatus('pending')).toBe('submitted');
        expect(normalizeLegacyStatus('reviewing')).toBe('investigating');
        expect(normalizeLegacyStatus('closed')).toBe('resolved');
    });

    it('passes through new schema values unchanged', () => {
        for (const status of VALID_STATUSES) {
            expect(normalizeLegacyStatus(status)).toBe(status);
        }
    });

    it('falls back to "submitted" for unknown values', () => {
        expect(normalizeLegacyStatus('garbage')).toBe('submitted');
        expect(normalizeLegacyStatus('')).toBe('submitted');
    });
});
