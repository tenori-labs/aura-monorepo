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

    it('returns false when signature is empty but name is not', () => {
        expect(isSignatureValid('', 'John Doe')).toBe(false);
    });

    it('returns false when full name is empty but signature is not', () => {
        expect(isSignatureValid('John Doe', '')).toBe(false);
    });

    it('is case-sensitive', () => {
        expect(isSignatureValid('john doe', 'John Doe')).toBe(false);
    });

    it('returns true when both are empty strings', () => {
        expect(isSignatureValid('', '')).toBe(true);
    });

    // Type safety — production forms can submit garbage
    it('handles null values gracefully', () => {
        expect(() => isSignatureValid(null as any, 'John')).toThrow();
    });

    it('handles undefined values gracefully', () => {
        expect(() => isSignatureValid(undefined as any, 'John')).toThrow();
    });

    it('handles numeric input gracefully', () => {
        expect(() => isSignatureValid(123 as any, 'John')).toThrow();
    });
});
