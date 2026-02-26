/**
 * Validation utilities for shadow case operations.
 */

/** Valid statuses for a ShadowCase. */
const VALID_SHADOW_STATUSES = [
    'collecting',
    'interrogating',
    'escalated',
    'flagged_collusion',
    'closed',
] as const;

/**
 * Type for valid shadow case statuses.
 */
export type ShadowCaseStatus = (typeof VALID_SHADOW_STATUSES)[number];

/**
 * Checks whether a given string is a valid ShadowCase status.
 *
 * @param status - The status string to validate
 * @returns True if the status is one of the valid shadow case statuses
 */
export function isValidShadowStatus(status: string): status is ShadowCaseStatus {
    return VALID_SHADOW_STATUSES.includes(status as ShadowCaseStatus);
}

/**
 * Checks whether a shadow case ID is a valid non-empty string.
 *
 * @param id - The case ID to validate
 * @returns True if the ID is a non-empty string
 */
export function isValidCaseId(id: unknown): id is string {
    return typeof id === 'string' && id.trim().length > 0;
}
