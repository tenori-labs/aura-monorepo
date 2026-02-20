/**
 * Extracted validation logic from consent-form/actions.ts for unit testing.
 * Pure functions for consent form signature verification.
 */

/**
 * Validates that the typed signature matches the full name (case-sensitive, trimmed).
 *
 * @param signature - The signature string typed by the student
 * @param fullName - The student's full legal name
 * @returns true if trimmed signature matches trimmed fullName exactly, false otherwise
 */
export function isSignatureValid(signature: string, fullName: string): boolean {
    return signature.trim() === fullName.trim();
}
