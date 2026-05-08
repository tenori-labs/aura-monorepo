'use server';

import { ai } from '@/lib/ai/genkit';
import { z } from 'genkit';

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
      'TRUE when the original flagged message contained explicit self-harm/suicidal language AND the student affirmed (including short answers like "yes", "yeah", "i guess", "maybe"), or when the response itself contains explicit indicators. FALSE only when the student explicitly clarifies it was venting/exaggeration/a joke, or gives a clear reassurance.'
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
        prompt: `A student's earlier message was flagged as a possible self-harm signal.
They were gently asked "are you having thoughts of harming yourself?" and responded.

Original message: "${sanitizedOriginal}"
Student's response to check-in: "${sanitizedClarification}"

Your job: combine BOTH messages and decide whether the student is confirming a real self-harm or suicidal-ideation crisis.

Set isGenuineDistress = TRUE when ANY of:
1. The original message contains explicit self-harm/suicidal language (e.g. "kill myself", "kms", "end it all", "want to die", "don't want to be here", "hurt myself") AND the student's response is an affirmation or non-denial — including short ones: "yes", "yeah", "yep", "i think so", "i guess", "kinda", "maybe", "i don't know", "kind of"
2. The student's response itself contains explicit indicators (wanting to die, hurt themselves, suicidal thoughts, a method or plan)
3. The student's response describes active intent, hopelessness combined with desire to disappear, or a plan
4. The student is silent / says nothing dismissive

Set isGenuineDistress = FALSE ONLY when:
1. The student explicitly clarifies the original was venting / exaggeration / a joke (e.g. "no, just frustrated", "i was joking", "just venting", "i didn't mean it literally", "i'm fine", "no I'm okay")
2. The original message was about something else entirely (e.g. "this homework is killing me", "she'll kill me when she finds out") AND the student confirms that
3. The student gives a clear, articulate reassurance that they are not in crisis

A short "yes" or "yeah" to the explicit check-in question, after an explicit original message, is a CONFIRMATION — never treat it as ambiguous and FALSE. The whole point of the check-in is to give the student a chance to confirm or deny; "yes" is a confirmation.

For summary: one neutral observational sentence about the conversation context. No names. No direct quotes.`,
        output: { schema: ClarifyOutputSchema },
      });

      console.log('[Clarify Distress] Result:', output);
      clearPIISession(sessionId1);
      clearPIISession(sessionId2);

      if (!output) {
        throw new Error('[ClarifyDistress] AI returned empty response');
      }

      return output;
    } catch (e: unknown) {
      clearPIISession(sessionId1);
      clearPIISession(sessionId2);
      console.error('Error in clarifyDistress flow:', e);
      // Default to FALSE on error — we don't want to silently create wellbeing
      // reports for students whose only "evidence" is that the LLM call failed.
      // Aura will continue the conversation; staff can intervene through other
      // channels if the student is genuinely in crisis.
      return {
        isGenuineDistress: false,
        summary: 'Clarification assessment failed; no determination made.',
      };
    }
  }
);
