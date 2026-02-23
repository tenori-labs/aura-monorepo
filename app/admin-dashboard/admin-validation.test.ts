import { isValidCategory, INCIDENT_CATEGORIES } from './admin-validation';

// ─── isValidCategory — parametrized valid inputs ────────────────────

describe('isValidCategory', () => {
    for (const category of INCIDENT_CATEGORIES) {
        it(`accepts "${category}"`, () => {
            expect(isValidCategory(category)).toBe(true);
        });
    }

    it('rejects unknown category strings', () => {
        expect(isValidCategory('Vandalism')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isValidCategory('')).toBe(false);
    });

    it('is case-sensitive (rejects "academic integrity")', () => {
        expect(isValidCategory('academic integrity')).toBe(false);
    });

    it('rejects whitespace-padded categories', () => {
        expect(isValidCategory(' Other ')).toBe(false);
    });

    // Type safety — production code WILL get garbage input
    it('rejects non-string values', () => {
        expect(isValidCategory(null as unknown as string)).toBe(false);
        expect(isValidCategory(undefined as unknown as string)).toBe(false);
        expect(isValidCategory(123 as unknown as string)).toBe(false);
        expect(isValidCategory({} as unknown as string)).toBe(false);
    });
});

// ─── INCIDENT_CATEGORIES constant ───────────────────────────────────

describe('INCIDENT_CATEGORIES', () => {
    it('contains exactly 6 categories', () => {
        expect(INCIDENT_CATEGORIES).toHaveLength(6);
    });

    it('includes all expected categories', () => {
        const expected = [
            'Academic Integrity',
            'Harassment/Bullying',
            'Safety/Security',
            'Medical Emergency',
            'Facilities Issue',
            'Other',
        ];
        for (const cat of expected) {
            expect(INCIDENT_CATEGORIES).toContain(cat);
        }
    });

    it('should be immutable (frozen)', () => {
        expect(Object.isFrozen(INCIDENT_CATEGORIES)).toBe(true);
    });
});
