import { PIIFilter } from '@philotheephilix/piifilter';

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
const pf = new PIIFilter({ detectors: ['EMAIL', 'PHONE'] });

// Institution-specific patterns — adjust regex to match your college's formats
pf.addCustomPattern('ROLL_NUMBER', '\\d{2}[A-Z]{2,4}\\d{3,5}');
pf.addCustomPattern('DEPT_CODE', '\\b(CSE|ECE|MECH|CIVIL|EEE|IT|AIDS|AIML|BME|CHE)\\b');
pf.addCustomPattern('HOSTEL', '\\b(BH-[A-Z]|GH-[A-Z])\\b');

/**
 * Sanitizes input text by replacing PII with deterministic placeholders like [EMAIL_1].
 * Creates an internal robust mapping session for safe LLM processing.
 *
 * @param text - The raw, potentially sensitive text input
 * @returns A tuple of `[sanitizedText, sessionId]` where `sessionId` is required for later reconstruction
 */
export function filterPII(text: string): [sanitized: string, sessionId: string] {
  return pf.filter(text);
}

/**
 * Reconstructs original PII values by substituting mapping placeholders back into LLM output.
 *
 * @param sessionId - The tracking identifier returned from the initial `filterPII` call
 * @param text - The sanitized text output from the LLM containing mapped placeholders
 * @returns The final restored text containing the original PII
 */
export function reconstructPII(sessionId: string, text: string): string {
  return pf.reconstruct(sessionId, text);
}

/**
 * Clears the internal PII mapping session to free memory.
 * Should be called immediately after reconstruction is complete.
 *
 * @param sessionId - The tracking identifier of the completed session
 */
export function clearPIISession(sessionId: string): void {
  pf.clearSession(sessionId);
}

/**
 * Retrieves the critical system prompt instructions ensuring the LLM handles PII placeholders correctly.
 *
 * @returns System prompt string instructing the LLM to preserve deterministic tags
 */
export function getPIIPromptInstruction(): string {
  return PIIFilter.getPromptInstruction();
}
