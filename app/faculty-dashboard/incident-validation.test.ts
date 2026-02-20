import { describe, it, expect } from 'vitest';
import {
    isValidStatus,
    getInvalidStatusError,
    VALID_STATUSES,
} from './incident-validation';

// ─── isValidStatus ──────────────────────────────────────────────────

describe('isValidStatus', () => {
    it('accepts "pending" as a valid status', () => {
        expect(isValidStatus('pending')).toBe(true);
    });

    it('accepts "reviewing" as a valid status', () => {
        expect(isValidStatus('reviewing')).toBe(true);
    });

    it('accepts "closed" as a valid status', () => {
        expect(isValidStatus('closed')).toBe(true);
    });

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
});
