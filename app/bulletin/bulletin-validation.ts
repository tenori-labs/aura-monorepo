/**
 * Validation utilities for the Public Bulletin system.
 * Pure functions for grievance text and issue status validation.
 */

/** Minimum character length for a grievance submission */
export const MIN_GRIEVANCE_LENGTH = 10;

/** Maximum character length for a grievance submission */
export const MAX_GRIEVANCE_LENGTH = 500;

/** Valid statuses for a CoreIssue on the bulletin board */
export const VALID_ISSUE_STATUSES = Object.freeze(
    ['pending', 'acknowledged', 'investigating', 'resolved'] as const
);

/**
 * Validates whether a grievance text meets length requirements.
 *
 * @param text - The grievance text to validate
 * @returns true if text is between MIN and MAX length after trimming
 */
export function isValidGrievance(text: string | null | undefined): boolean {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    return trimmed.length >= MIN_GRIEVANCE_LENGTH && trimmed.length <= MAX_GRIEVANCE_LENGTH;
}

/**
 * Validates whether a status string is a valid CoreIssue status.
 *
 * @param status - The status string to validate
 * @returns true if the status is one of the allowed issue statuses
 */
export function isValidIssueStatus(status: string | null | undefined): boolean {
    if (!status || typeof status !== 'string') return false;
    return (VALID_ISSUE_STATUSES as readonly string[]).includes(status);
}
