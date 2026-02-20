import { describe, it, expect } from 'vitest';
import { isValidCategory, INCIDENT_CATEGORIES } from './admin-validation';

// ─── isValidCategory ────────────────────────────────────────────────

describe('isValidCategory', () => {
    it('accepts "Academic Integrity"', () => {
        expect(isValidCategory('Academic Integrity')).toBe(true);
    });

    it('accepts "Harassment/Bullying"', () => {
        expect(isValidCategory('Harassment/Bullying')).toBe(true);
    });

    it('accepts "Safety/Security"', () => {
        expect(isValidCategory('Safety/Security')).toBe(true);
    });

    it('accepts "Medical Emergency"', () => {
        expect(isValidCategory('Medical Emergency')).toBe(true);
    });

    it('accepts "Facilities Issue"', () => {
        expect(isValidCategory('Facilities Issue')).toBe(true);
    });

    it('accepts "Other"', () => {
        expect(isValidCategory('Other')).toBe(true);
    });

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
});

// ─── INCIDENT_CATEGORIES constant ───────────────────────────────────

describe('INCIDENT_CATEGORIES', () => {
    it('contains exactly 6 categories', () => {
        expect(INCIDENT_CATEGORIES).toHaveLength(6);
    });

    it('includes all expected categories', () => {
        expect(INCIDENT_CATEGORIES).toContain('Academic Integrity');
        expect(INCIDENT_CATEGORIES).toContain('Harassment/Bullying');
        expect(INCIDENT_CATEGORIES).toContain('Safety/Security');
        expect(INCIDENT_CATEGORIES).toContain('Medical Emergency');
        expect(INCIDENT_CATEGORIES).toContain('Facilities Issue');
        expect(INCIDENT_CATEGORIES).toContain('Other');
    });
});
