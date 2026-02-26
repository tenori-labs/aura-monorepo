import {
    isValidGrievance,
    isValidIssueStatus,
    MIN_GRIEVANCE_LENGTH,
    MAX_GRIEVANCE_LENGTH,
    VALID_ISSUE_STATUSES,
} from './bulletin-validation';

// ─── isValidGrievance ───────────────────────────────────────────────

describe('isValidGrievance', () => {
    it('accepts text within valid range', () => {
        expect(isValidGrievance('The library AC has been broken for weeks')).toBe(true);
    });

    it('accepts text at exactly MIN_GRIEVANCE_LENGTH', () => {
        expect(isValidGrievance('a'.repeat(MIN_GRIEVANCE_LENGTH))).toBe(true);
    });

    it('accepts text at exactly MAX_GRIEVANCE_LENGTH', () => {
        expect(isValidGrievance('a'.repeat(MAX_GRIEVANCE_LENGTH))).toBe(true);
    });

    it('rejects text shorter than MIN_GRIEVANCE_LENGTH', () => {
        expect(isValidGrievance('a'.repeat(MIN_GRIEVANCE_LENGTH - 1))).toBe(false);
    });

    it('rejects text longer than MAX_GRIEVANCE_LENGTH', () => {
        expect(isValidGrievance('a'.repeat(MAX_GRIEVANCE_LENGTH + 1))).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isValidGrievance('')).toBe(false);
    });

    it('rejects whitespace-only string shorter than min', () => {
        expect(isValidGrievance('     ')).toBe(false);
    });

    it('rejects null', () => {
        expect(isValidGrievance(null)).toBe(false);
    });

    it('rejects undefined', () => {
        expect(isValidGrievance(undefined)).toBe(false);
    });

    it('rejects non-string values', () => {
        expect(isValidGrievance(123 as unknown as string)).toBe(false);
        expect(isValidGrievance({} as unknown as string)).toBe(false);
    });

    it('trims whitespace before checking length', () => {
        // 10 chars of text + whitespace = should pass
        expect(isValidGrievance('   ' + 'a'.repeat(MIN_GRIEVANCE_LENGTH) + '   ')).toBe(true);
    });
});

// ─── isValidIssueStatus ─────────────────────────────────────────────

describe('isValidIssueStatus', () => {
    for (const status of VALID_ISSUE_STATUSES) {
        it(`accepts "${status}"`, () => {
            expect(isValidIssueStatus(status)).toBe(true);
        });
    }

    it('rejects unknown status', () => {
        expect(isValidIssueStatus('hacked')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isValidIssueStatus('')).toBe(false);
    });

    it('is case-sensitive', () => {
        expect(isValidIssueStatus('Pending')).toBe(false);
    });

    it('rejects null', () => {
        expect(isValidIssueStatus(null)).toBe(false);
    });

    it('rejects undefined', () => {
        expect(isValidIssueStatus(undefined)).toBe(false);
    });

    it('rejects non-string values', () => {
        expect(isValidIssueStatus(42 as unknown as string)).toBe(false);
    });
});

// ─── Constants ───────────────────────────────────────────────────────

describe('VALID_ISSUE_STATUSES', () => {
    it('contains exactly 4 statuses', () => {
        expect(VALID_ISSUE_STATUSES).toHaveLength(4);
    });

    it('contains all expected statuses', () => {
        expect(VALID_ISSUE_STATUSES).toContain('pending');
        expect(VALID_ISSUE_STATUSES).toContain('acknowledged');
        expect(VALID_ISSUE_STATUSES).toContain('investigating');
        expect(VALID_ISSUE_STATUSES).toContain('resolved');
    });

    it('is frozen (immutable)', () => {
        expect(Object.isFrozen(VALID_ISSUE_STATUSES)).toBe(true);
    });
});

describe('Length constants', () => {
    it('MIN_GRIEVANCE_LENGTH is 10', () => {
        expect(MIN_GRIEVANCE_LENGTH).toBe(10);
    });

    it('MAX_GRIEVANCE_LENGTH is 500', () => {
        expect(MAX_GRIEVANCE_LENGTH).toBe(500);
    });
});
