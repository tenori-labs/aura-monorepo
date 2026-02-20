import { describe, it, expect } from 'vitest';
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

    it('returns false when type is missing', () => {
        expect(
            validateRequiredFields({
                type: null,
                date: '2026-02-20',
                location: 'Library',
                description: 'An incident occurred',
            })
        ).toBe(false);
    });

    it('returns false when date is missing', () => {
        expect(
            validateRequiredFields({
                type: 'Safety/Security',
                date: null,
                location: 'Library',
                description: 'An incident occurred',
            })
        ).toBe(false);
    });

    it('returns false when location is missing', () => {
        expect(
            validateRequiredFields({
                type: 'Safety/Security',
                date: '2026-02-20',
                location: null,
                description: 'An incident occurred',
            })
        ).toBe(false);
    });

    it('returns false when description is missing', () => {
        expect(
            validateRequiredFields({
                type: 'Safety/Security',
                date: '2026-02-20',
                location: 'Library',
                description: null,
            })
        ).toBe(false);
    });

    it('returns false when type is an empty string', () => {
        expect(
            validateRequiredFields({
                type: '',
                date: '2026-02-20',
                location: 'Library',
                description: 'An incident occurred',
            })
        ).toBe(false);
    });

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
});

// ─── validateFileSize ───────────────────────────────────────────────

describe('validateFileSize', () => {
    it('accepts files under 5MB', () => {
        expect(validateFileSize(1024)).toBe(true);
    });

    it('accepts files exactly at 5MB', () => {
        expect(validateFileSize(MAX_FILE_SIZE)).toBe(true);
    });

    it('rejects files over 5MB', () => {
        expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe(false);
    });

    it('accepts zero byte files', () => {
        expect(validateFileSize(0)).toBe(true);
    });
});

// ─── MAX_FILE_SIZE constant ─────────────────────────────────────────

describe('MAX_FILE_SIZE', () => {
    it('equals 5MB in bytes', () => {
        expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });
});
