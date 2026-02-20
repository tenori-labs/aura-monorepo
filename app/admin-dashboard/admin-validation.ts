/**
 * Extracted validation logic from admin-dashboard/actions.ts for unit testing.
 * Pure functions for incident category validation.
 */

/** The 6 incident categories from the report form */
export const INCIDENT_CATEGORIES = [
    'Academic Integrity',
    'Harassment/Bullying',
    'Safety/Security',
    'Medical Emergency',
    'Facilities Issue',
    'Other',
] as const;

/**
 * Validates whether a given category string is one of the allowed incident categories.
 *
 * @param category - The category string to validate
 * @returns true if the category is one of INCIDENT_CATEGORIES, false otherwise
 */
export function isValidCategory(category: string): boolean {
    return (INCIDENT_CATEGORIES as readonly string[]).includes(category);
}
