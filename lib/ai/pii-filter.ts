import { PIIFilter } from "@philotheephilix/piifilter";

// Shared PII filter instance — all built-in detectors enabled
const pf = new PIIFilter();

/**
 * Sanitize text by replacing PII with placeholders like [PAN_1], [EMAIL_2], etc.
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
