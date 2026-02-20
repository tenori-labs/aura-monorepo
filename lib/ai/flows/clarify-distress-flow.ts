'use server';

import { ai } from '@/lib/ai/genkit';
import { z } from 'zod';

const ClarifyInputSchema = z.object({
  originalMessage: z
    .string()
    .describe('The sanitized original message that triggered the self-harm signal.'),
  studentClarification: z
    .string()
    .describe("The student's response to Aura's gentle check-in question."),
});

const ClarifyOutputSchema = z.object({
  isGenuineDistress: z
    .boolean()
    .describe(
      'Whether this represents genuine distress requiring support. Be conservative — if uncertain, set to true.'
    ),
  summary: z
    .string()
    .describe(
      'One neutral sentence describing the context for a wellbeing report. No names. No quotes.'
    ),
});

export type ClarifyDistressInput = z.infer<typeof ClarifyInputSchema>;
export type ClarifyDistressOutput = z.infer<typeof ClarifyOutputSchema>;

/**
 * Clarification flow — determines if a flagged message represents genuine distress.
 *
 * Called after:
 * 1. Aura detects a self-harm signal (selfHarmSignal: true)
 * 2. Aura asks a gentle follow-up question
 * 3. The student responds
 *
 * This flow takes both messages and makes the final determination.
 * Conservative: if genuinely uncertain, defaults to isGenuineDistress: true.
 */
export const clarifyDistress = ai.defineFlow(
  {
    name: 'clarifyDistress',
    inputSchema: ClarifyInputSchema,
    outputSchema: ClarifyOutputSchema,
  },
  async ({ originalMessage, studentClarification }) => {
    // PII filter BOTH inputs before sending to Gemini
    const { filterPII, clearPIISession } = await import('@/lib/ai/pii-filter');
    const [sanitizedOriginal, sessionId1] = filterPII(originalMessage);
    const [sanitizedClarification, sessionId2] = filterPII(studentClarification);

    try {
      const { output } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-001',
        prompt: `A student sent a message that contained possible self-harm language.
They were gently asked how they were doing and responded.

Original message: "${sanitizedOriginal}"
Student's response to check-in: "${sanitizedClarification}"

Determine: is this genuine distress requiring support, or was the original message frustration/venting?

Guidelines:
- "I'm fine, just frustrated" → isGenuineDistress: false
- "I don't know... I just don't want to be here anymore" → isGenuineDistress: true
- Ambiguous or uncertain → isGenuineDistress: true (be conservative)

In summary, write one neutral sentence describing the context for a wellbeing report. No names. No direct quotes from the student. Use observational language only.`,
        output: { schema: ClarifyOutputSchema },
      });

      console.log('[Clarify Distress] Result:', output);
      clearPIISession(sessionId1);
      clearPIISession(sessionId2);

      return output!;
    } catch (e: unknown) {
      clearPIISession(sessionId1);
      clearPIISession(sessionId2);
      console.error('Error in clarifyDistress flow:', e);
      // Conservative default: if the flow fails, treat as genuine
      return {
        isGenuineDistress: true,
        summary: 'Unable to complete clarification assessment. Flagged for manual review.',
      };
    }
  }
);
