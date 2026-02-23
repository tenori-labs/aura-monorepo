import {
    validateRequiredFields,
    validateFileSize,
    MAX_FILE_SIZE,
} from './report-validation';

// ─── validateRequiredFields ─────────────────────────────────────────

describe('validateRequiredFields', () => {
    it('returns true when all required fields are present', () => {
        expect(
            validateRequiredFields({
                type: 'Harassment/Bullying',
                date: '2026-02-20',
                location: 'Library',
                description: 'An incident occurred',
            })
        ).toBe(true);
    });

    const requiredKeys = ['type', 'date', 'location', 'description'] as const;

    for (const key of requiredKeys) {
        it(`returns false when ${key} is null`, () => {
            const fields = {
                type: 'Safety/Security',
                date: '2026-02-20',
                location: 'Library',
                description: 'An incident occurred',
            };
            expect(validateRequiredFields({ ...fields, [key]: null })).toBe(false);
        });

        it(`returns false when ${key} is an empty string`, () => {
            const fields = {
                type: 'Safety/Security',
                date: '2026-02-20',
                location: 'Library',
                description: 'An incident occurred',
            };
            expect(validateRequiredFields({ ...fields, [key]: '' })).toBe(false);
        });
    }

    it('returns false when all fields are null', () => {
        expect(
            validateRequiredFields({
                type: null,
                date: null,
                location: null,
                description: null,
            })
        ).toBe(false);
    });

    // Type safety
    it('handles undefined values gracefully', () => {
        expect(
            validateRequiredFields({
                type: undefined as any,
                date: '2026-02-20',
                location: 'Library',
                description: 'test',
            })
        ).toBe(false);
    });
});

// ─── validateFileSize ───────────────────────────────────────────────

describe('validateFileSize', () => {
    it('accepts files under 5MB', () => {
        expect(validateFileSize(1024)).toBe(true);
    });

    it('accepts files exactly at 5MB (boundary)', () => {
        expect(validateFileSize(MAX_FILE_SIZE)).toBe(true);
    });

    it('rejects files over 5MB (boundary + 1)', () => {
        expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe(false);
    });

    it('accepts zero byte files', () => {
        expect(validateFileSize(0)).toBe(true);
    });

    // Type safety
    it('handles negative numbers', () => {
        expect(validateFileSize(-1)).toBe(true); // -1 <= MAX is true
    });

    it('handles NaN gracefully', () => {
        expect(validateFileSize(NaN)).toBe(false);
    });
});

// ─── MAX_FILE_SIZE constant ─────────────────────────────────────────

describe('MAX_FILE_SIZE', () => {
    it('equals 5MB in bytes', () => {
        expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });
});
