import { ai } from '@/lib/ai/genkit';
import { z } from 'genkit';

/**
 * Input schema for the shadow trigger detection flow.
 */
const ShadowTriggerInputSchema = z.object({
    grievanceText: z.string().describe('The raw grievance text submitted by the user.'),
});

/**
 * Output schema for the shadow trigger detection flow.
 */
const ShadowTriggerOutputSchema = z.object({
    isShadow: z
        .boolean()
        .describe(
            'True if the text contains personal identifiers or safety keywords that require private investigation.'
        ),
    detectedNames: z
        .array(z.string())
        .describe(
            'Personal names, titles, or designations detected (e.g., "Prof. Kumar", "Dr. Rao", "the HOD").'
        ),
    keywords: z
        .array(z.string())
        .describe(
            'Safety keywords found (e.g., "harassment", "abuse", "assault", "stalking", "discrimination").'
        ),
    entityName: z
        .string()
        .describe(
            'The primary person/entity being reported, used for case grouping. Empty string if isShadow is false.'
        ),
});

/**
 * Type definitions for the shadow trigger flow input and output.
 */
export type ShadowTriggerInput = z.infer<typeof ShadowTriggerInputSchema>;
export type ShadowTriggerOutput = z.infer<typeof ShadowTriggerOutputSchema>;

/**
 * Prompt for shadow trigger detection.
 * Analyzes grievance text for personal identifiers and safety-related keywords.
 */
const shadowTriggerPrompt = ai.definePrompt({
    name: 'shadowTriggerPrompt',
    input: { schema: ShadowTriggerInputSchema },
    output: { schema: ShadowTriggerOutputSchema },
    prompt: `You are a safety triage system for a campus grievance platform.

Analyze the following grievance text and determine if it contains:

1. **Personal Identifiers**: Any person's name, title, or designation (e.g., "Prof. Kumar", "Dr. Rao", "the HOD", "Mr. Sharma", "our warden", "that faculty member"). This includes indirect references that clearly identify a specific person.

2. **Safety Keywords**: Any language related to harassment, abuse, assault, threats, stalking, discrimination, misconduct, bullying, intimidation, coercion, or exploitation.

Rules:
- Set isShadow to true if EITHER personal identifiers OR safety keywords are present.
- If there are no personal identifiers and no safety keywords, set isShadow to false.
- For entityName, use the most specific name/title found. If multiple people are named, pick the primary subject of the complaint.
- If isShadow is false, set entityName to an empty string.
- Report ALL detected names and keywords, not just the first one.
- Institutional complaints (broken AC, bad food, parking) are NOT shadow triggers unless they name a specific person.

Grievance Text: {{grievanceText}}

Respond with a JSON object.`,
});

/**
 * Shadow trigger detection flow.
 *
 * Analyzes a grievance for personal identifiers (names, titles) and
 * safety keywords (harassment, abuse, assault). If detected, the
 * grievance is diverted from the public bulletin into a private
 * case docket visible only to admins.
 *
 * @param input - Object containing the grievance text
 * @returns Detection result with isShadow flag, detected names, keywords, and entityName
 */
export const detectShadowTrigger = ai.defineFlow(
    {
        name: 'detectShadowTrigger',
        inputSchema: ShadowTriggerInputSchema,
        outputSchema: ShadowTriggerOutputSchema,
    },
    async (input) => {
        const { output } = await shadowTriggerPrompt(input);
        return output!;
    }
);
