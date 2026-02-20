/**
 * Extracted validation logic from report-incident/actions.ts for unit testing.
 * Pure functions containing form field and file size decision logic.
 */

/** Maximum allowed file size in bytes (5MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validates that all required incident report fields are present and non-empty.
 *
 * @param fields - Object containing the core required fields from the incident form
 * @returns true if all required fields are non-empty strings, false otherwise
 */
export function validateRequiredFields(fields: {
    type: string | null;
    date: string | null;
    location: string | null;
    description: string | null;
}): boolean {
    return !!(fields.type && fields.date && fields.location && fields.description);
}

/**
 * Validates that a file's size does not exceed the maximum allowed limit.
 *
 * @param fileSize - The file size in bytes
 * @returns true if the file size is within the allowed limit, false if it exceeds 5MB
 */
export function validateFileSize(fileSize: number): boolean {
    return fileSize <= MAX_FILE_SIZE;
}
