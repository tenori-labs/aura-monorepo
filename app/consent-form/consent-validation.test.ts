import { describe, it, expect } from 'vitest';
import { isSignatureValid } from './consent-validation';

// ─── isSignatureValid ───────────────────────────────────────────────

describe('isSignatureValid', () => {
    it('returns true when signature matches full name exactly', () => {
        expect(isSignatureValid('John Doe', 'John Doe')).toBe(true);
    });

    it('returns true when both have leading/trailing whitespace that trims to match', () => {
        expect(isSignatureValid('  John Doe  ', '  John Doe  ')).toBe(true);
    });

    it('returns true when signature has extra whitespace but trims to match', () => {
        expect(isSignatureValid('  John Doe', 'John Doe  ')).toBe(true);
    });

    it('returns false when signature does not match full name', () => {
        expect(isSignatureValid('Jane Doe', 'John Doe')).toBe(false);
    });

    it('returns false when signature is empty', () => {
        expect(isSignatureValid('', 'John Doe')).toBe(false);
    });

    it('returns false when full name is empty', () => {
        expect(isSignatureValid('John Doe', '')).toBe(false);
    });

    it('is case-sensitive', () => {
        expect(isSignatureValid('john doe', 'John Doe')).toBe(false);
    });

    it('returns true when both are empty strings', () => {
        expect(isSignatureValid('', '')).toBe(true);
    });
});
