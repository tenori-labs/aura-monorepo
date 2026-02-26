import { ai } from '@/lib/ai/genkit';
import { z } from 'genkit';

/**
 * Input schema for generating a CoreIssue title and summary.
 */
const GenerateIssueSummaryInputSchema = z.object({
    grievanceText: z
        .string()
        .describe('The PII-filtered grievance text to summarize into a CoreIssue.'),
});

/**
 * Output schema for the generated CoreIssue title and summary.
 */
export const GenerateIssueSummaryOutputSchema = z.object({
    title: z
        .string()
        .describe(
            'A short, neutral title for the issue (max 10 words). Example: "Library Air Conditioning Malfunction"'
        ),
    summary: z
        .string()
        .describe(
            'A neutral 1-2 sentence summary of the systemic issue. Must not contain any personal details, names, or accusations. Focus on the infrastructure/policy problem.'
        ),
});

export type GenerateIssueSummaryInput = z.infer<typeof GenerateIssueSummaryInputSchema>;
export type GenerateIssueSummaryOutput = z.infer<typeof GenerateIssueSummaryOutputSchema>;

const generateIssueSummaryPrompt = ai.definePrompt({
    name: 'generateIssueSummaryPrompt',
    input: { schema: GenerateIssueSummaryInputSchema },
    output: { schema: GenerateIssueSummaryOutputSchema },
    prompt: `You are a campus operations assistant. A student has submitted an anonymous grievance about an institutional issue (infrastructure, policy, or operations).

Your task is to:
1. Generate a short, neutral TITLE (max 10 words) that describes the systemic issue.
2. Generate a neutral 1-2 sentence SUMMARY that describes the issue objectively.

Rules:
- NEVER include personal names, student IDs, or any identifying information.
- Focus on the SYSTEMIC issue, not the individual's experience.
- Use professional, objective language.
- The title should be scannable — like a news headline.

Student Grievance: {{grievanceText}}

Respond with a JSON object containing "title" and "summary".
`,
});

/**
 * Genkit flow that generates a neutral title and summary for a new CoreIssue
 * from a student's grievance text.
 *
 * Used when a grievance doesn't match any existing CoreIssue via k-NN,
 * requiring a new cluster to be created.
 */
export const generateIssueSummary = ai.defineFlow(
    {
        name: 'generateIssueSummary',
        inputSchema: GenerateIssueSummaryInputSchema,
        outputSchema: GenerateIssueSummaryOutputSchema,
    },
    async (input) => {
        const { filterPII, reconstructPII, clearPIISession } = await import('@/lib/ai/pii-filter');
        const [sanitizedText, sessionId] = filterPII(input.grievanceText);

        const { output } = await generateIssueSummaryPrompt({
            grievanceText: sanitizedText,
        });

        // Reconstruct PII in output fields (in case any leaked through)
        const result = {
            title: reconstructPII(sessionId, output!.title),
            summary: reconstructPII(sessionId, output!.summary),
        };

        clearPIISession(sessionId);
        return result;
    }
);
