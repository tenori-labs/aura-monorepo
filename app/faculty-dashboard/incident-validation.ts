/**
 * Extracted validation logic from incident-actions.ts for unit testing.
 * These are pure functions that contain decision logic worth testing independently.
 */

/** The allowed incident report statuses, in canonical order */
export const VALID_STATUSES = Object.freeze([
    'submitted',
    'acknowledged',
    'investigating',
    'resolved',
] as const);

export type IncidentStatus = (typeof VALID_STATUSES)[number];

/** Defines the allowed forward transitions in the workflow. */
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = Object.freeze({
    submitted: ['acknowledged'],
    acknowledged: ['investigating'],
    investigating: ['resolved'],
    resolved: [],
});

/**
 * Validates whether a given status is an allowed incident report status.
 */
export function isValidStatus(status: string): boolean {
    return (VALID_STATUSES as readonly string[]).includes(status);
}

/**
 * Returns the formatted error message for an invalid status.
 */
export function getInvalidStatusError(status: string): string {
    return `Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`;
}

/**
 * Validates whether a transition between two statuses is allowed.
 * Only forward, sequential transitions are valid.
 */
export function isValidTransition(from: string, to: string): boolean {
    if (!isValidStatus(from) || !isValidStatus(to)) return false;
    return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Returns the next status in the workflow, or null if the report is resolved.
 */
export function getNextStatus(current: string): IncidentStatus | null {
    if (!isValidStatus(current)) return null;
    const next = ALLOWED_TRANSITIONS[current][0];
    return (next as IncidentStatus | undefined) ?? null;
}

/**
 * Maps legacy status values to the new schema. Used at read-time for any
 * incidents that haven't been migrated yet.
 */
export function normalizeLegacyStatus(status: string): IncidentStatus {
    switch (status) {
        case 'pending':
            return 'submitted';
        case 'assigned':
            return 'acknowledged';
        case 'reviewing':
            return 'investigating';
        case 'closed':
            return 'resolved';
        default:
            return isValidStatus(status) ? (status as IncidentStatus) : 'submitted';
    }
}
