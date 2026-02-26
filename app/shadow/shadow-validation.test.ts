import { describe, it, expect } from '@jest/globals';
import { isValidShadowStatus, isValidCaseId } from './shadow-validation';

describe('isValidShadowStatus', () => {
    it('accepts all valid statuses', () => {
        expect(isValidShadowStatus('collecting')).toBe(true);
        expect(isValidShadowStatus('interrogating')).toBe(true);
        expect(isValidShadowStatus('escalated')).toBe(true);
        expect(isValidShadowStatus('flagged_collusion')).toBe(true);
        expect(isValidShadowStatus('closed')).toBe(true);
    });

    it('rejects invalid statuses', () => {
        expect(isValidShadowStatus('pending')).toBe(false);
        expect(isValidShadowStatus('resolved')).toBe(false);
        expect(isValidShadowStatus('')).toBe(false);
        expect(isValidShadowStatus('COLLECTING')).toBe(false);
    });
});

describe('isValidCaseId', () => {
    it('accepts valid IDs', () => {
        expect(isValidCaseId('abc123')).toBe(true);
        expect(isValidCaseId('699ecf44d7795965fde6bf06')).toBe(true);
    });

    it('rejects invalid IDs', () => {
        expect(isValidCaseId('')).toBe(false);
        expect(isValidCaseId('   ')).toBe(false);
        expect(isValidCaseId(null)).toBe(false);
        expect(isValidCaseId(undefined)).toBe(false);
        expect(isValidCaseId(123)).toBe(false);
    });
});
