import { PIIFilter } from "@philotheephilix/piifilter";

/**
 * PII Filter — scoped for wellbeing chat context.
 *
 * INTENTIONALLY EXCLUDED: Student names.
 * ────────────────────────────────────────
 * Names are NOT filtered because:
 * 1. The WellbeingReport DB model stores `studentName` separately
 *    for staff identification.
 * 2. The neutral report generator never receives names — it only
 *    gets themes and a clarification summary.
 * 3. Filtering names would break the staff identification flow.
 *
 * DO NOT add name detection here without updating the entire
 * report pipeline (generateAndStoreReport, faculty dashboard).
 *
 * What IS filtered:
 * - Email addresses
 * - Phone numbers
 * - Institution-specific: roll numbers, department codes, hostel codes
 */
const pf = new PIIFilter({ detectors: ["EMAIL", "PHONE"] });

// Institution-specific patterns — adjust regex to match your college's formats
pf.addCustomPattern("ROLL_NUMBER", "\\d{2}[A-Z]{2,4}\\d{3,5}");
pf.addCustomPattern("DEPT_CODE", "\\b(CSE|ECE|MECH|CIVIL|EEE|IT|AIDS|AIML|BME|CHE)\\b");
pf.addCustomPattern("HOSTEL", "\\b(BH-[A-Z]|GH-[A-Z])\\b");

/**
 * Sanitize text by replacing PII with placeholders like [EMAIL_1], [PHONE_2], etc.
 * Returns the sanitized text and a sessionId for later reconstruction.
 */
export function filterPII(text: string): [sanitized: string, sessionId: string] {
    return pf.filter(text);
}

/**
 * Reconstruct original PII values from placeholders in an LLM response.
 */
export function reconstructPII(sessionId: string, text: string): string {
    return pf.reconstruct(sessionId, text);
}

/**
 * Clean up a session after use to free memory.
 */
export function clearPIISession(sessionId: string): void {
    pf.clearSession(sessionId);
}

/**
 * Get the instruction text that tells the LLM to preserve placeholders.
 */
export function getPIIPromptInstruction(): string {
    return PIIFilter.getPromptInstruction();
}
