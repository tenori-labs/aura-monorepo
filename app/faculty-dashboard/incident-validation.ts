/**
 * Extracted validation logic from incident-actions.ts for unit testing.
 * These are pure functions that contain decision logic worth testing independently.
 */

/** The allowed incident report statuses */
export const VALID_STATUSES = ['pending', 'reviewing', 'closed'] as const;

/**
 * Validates whether a given status is an allowed incident report status.
 *
 * @param status - The status string to validate
 * @returns true if the status is one of "pending" | "reviewing" | "closed", false otherwise
 */
export function isValidStatus(status: string): boolean {
    return (VALID_STATUSES as readonly string[]).includes(status);
}

/**
 * Returns the formatted error message for an invalid status.
 *
 * @param status - The invalid status string that was rejected
 * @returns A descriptive error message listing the allowed statuses
 */
export function getInvalidStatusError(status: string): string {
    return `Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`;
}
