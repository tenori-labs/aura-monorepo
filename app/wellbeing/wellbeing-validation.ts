/**
 * Extracted validation logic from wellbeing-actions.ts for unit testing.
 * Pure functions for identity reveal reason validation.
 */

/** Minimum character length required for an identity reveal reason */
export const MIN_REASON_LENGTH = 5;

/**
 * Validates whether a reason string is sufficient for revealing a student's identity.
 * Must be non-empty and at least 5 characters after trimming.
 *
 * @param reason - The justification string provided by the faculty member
 * @returns true if the reason is non-empty and at least MIN_REASON_LENGTH characters, false otherwise
 */
export function isValidRevealReason(reason: string | null | undefined): boolean {
    if (!reason || typeof reason !== 'string') return false;
    return reason.trim().length >= MIN_REASON_LENGTH;
}

/** Valid statuses for wellbeing reports */
export const VALID_WELLBEING_STATUSES = Object.freeze(
    ['pending', 'reviewed', 'passed_on'] as const
);

/**
 * Validates whether a status string is a valid wellbeing report status.
 *
 * @param status - The status string to validate
 * @returns true if the status is one of the allowed wellbeing report statuses
 */
export function isValidWellbeingStatus(status: string | null | undefined): boolean {
    if (!status || typeof status !== 'string') return false;
    return (VALID_WELLBEING_STATUSES as readonly string[]).includes(status);
}
