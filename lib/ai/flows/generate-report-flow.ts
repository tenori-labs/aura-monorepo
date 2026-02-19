'use server';

import { ai } from '@/lib/ai/genkit';

/**
 * Generate a neutral wellbeing report from conversation themes.
 *
 * CRITICAL RULES enforced by the prompt:
 * - No names or identifying information
 * - No direct quotes from the student
 * - No clinical terms or diagnoses
 * - Neutral, observational language only
 * - 3-4 sentences maximum
 *
 * Input is themes[] + clarification summary — never raw chat messages.
 * This ensures the report generator never has access to PII.
 */
export async function generateNeutralReport(
    themes: string[],
    clarificationSummary: string
): Promise<string> {
    // Build a prompt that works even if themes are empty
    const themesSection = themes.length > 0
        ? `Observed themes: ${themes.join(", ")}`
        : 'No specific themes were extracted automatically.';

    try {
        const result = await ai.generate({
            model: 'googleai/gemini-2.0-flash-001',
            prompt: `Generate a neutral, observational wellbeing report for a student support team. This will be read by an external counselor who must not form judgements about the student before meeting them.

Rules:
- Do not include any names or identifying information
- Do not diagnose or use clinical terms
- Do not quote the student directly
- Use neutral, observational language only
- 3-4 sentences maximum
- Avoid alarming language while still communicating the concern
- If no specific themes are provided, use the context summary to write the report

${themesSection}
Context: ${clarificationSummary}

Example tone: "Student expressed language consistent with significant emotional distress. Themes of academic pressure and social isolation were observed. A supportive outreach conversation is recommended."

Generate the report now:`,
        });

        const reportText = result.text?.trim();

        if (!reportText) {
            // Even the fallback should use the clarification summary if available
            return clarificationSummary
                ? `Student was flagged for potential emotional distress. ${clarificationSummary} A supportive outreach conversation is recommended.`
                : 'Student was flagged for potential emotional distress during a wellbeing conversation. A supportive outreach conversation is recommended.';
        }

        return reportText;
    } catch (e: any) {
        console.error('Error generating neutral report:', e);
        return clarificationSummary
            ? `Student was flagged for potential emotional distress. ${clarificationSummary} Manual review and supportive outreach is recommended.`
            : 'Student was flagged for potential emotional distress during a wellbeing conversation. Automatic report generation encountered an error. Manual review and supportive outreach is recommended.';
    }
}
