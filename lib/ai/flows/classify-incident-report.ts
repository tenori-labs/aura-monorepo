import { ai } from '@/lib/ai/genkit';
import { z } from 'genkit';

/**
 * Input schema for classifying incident reports.
 */
const ClassifyIncidentReportInputSchema = z.object({
  reportText: z.string().describe('The text content of the incident report.'),
  media: z
    .string()
    .optional()
    .describe(
      "Optional media (image) attached to the report, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

/**
 * Type definition for the input to the classifyIncidentReport function.
 */
export type ClassifyIncidentReportInput = z.infer<typeof ClassifyIncidentReportInputSchema>;

/**
 * Output schema for the classified incident report.
 */
export const ClassifyIncidentReportOutputSchema = z.object({
  category: z
    .string()
    .describe(
      'The predicted category of the incident report (e.g., harassment, theft, vandalism).'
    ),
  confidence: z
    .number()
    .describe('A confidence score (0-1) indicating the certainty of the category assignment.'),
  keywords: z
    .array(z.string())
    .describe('Keywords extracted from the incident report text and/or image.'),
  validity: z
    .enum(['Likely Valid', 'Needs Review', 'Invalid'])
    .describe(
      'Assessment of whether the report appears to be a genuine incident or spam/irrelevant.'
    ),
  validityReason: z.string().describe('A brief explanation for the validity assessment.'),
});

/**
 * Type definition for the output of the classifyIncidentReport function.
 */
export type ClassifyIncidentReportOutput = z.infer<typeof ClassifyIncidentReportOutputSchema>;

// Define the Prompt
const classifyIncidentReportPrompt = ai.definePrompt({
  name: 'classifyIncidentReportPrompt',
  input: { schema: ClassifyIncidentReportInputSchema },
  output: { schema: ClassifyIncidentReportOutputSchema },
  prompt: `You are an AI assistant that classifies incident reports based on their text content and an optional attached image.

  Analyze the following incident report. determine:
  1. The most appropriate category.
  2. A confidence score (between 0 and 1).
  3. Relevant keywords from both the text and the image if provided.
  4. The validity of the report ('Likely Valid', 'Needs Review', 'Invalid').
     - 'Likely Valid': Describes a plausible incident relevant to safety, maintenance, or conduct.
     - 'Needs Review': Ambiguous, lacks detail, or potentially borderline.
     - 'Invalid': Obvious spam, nonsense, testing data, or completely irrelevant topics.
  5. A brief reason for your validity assessment.

  Report Text: {{reportText}}
  
  {{#if media}}
  Attached Image: {{media url=media}}
  Analyze the image for context, objects, and actions relevant to the report.
  {{/if}}

  Respond with a JSON object containing the category, confidence score, keywords, validity, and validityReason.
  `,
});

// Define the Flow
export const classifyIncidentReport = ai.defineFlow(
  {
    name: 'classifyIncidentReport',
    inputSchema: ClassifyIncidentReportInputSchema,
    outputSchema: ClassifyIncidentReportOutputSchema,
  },
  async (input) => {
    // --- PII Filter: sanitize before sending to LLM ---
    const { filterPII, reconstructPII, clearPIISession } = await import('@/lib/ai/pii-filter');
    const [sanitizedText, sessionId] = filterPII(input.reportText);

    try {
      const { output } = await classifyIncidentReportPrompt({
        ...input,
        reportText: sanitizedText, // Send sanitized text to Gemini
      });

      if (!output) {
        throw new Error('[ClassifyIncident] AI returned empty response');
      }

      // --- PII Filter: reconstruct PII in keywords ---
      return {
        ...output,
        keywords: output.keywords.map((kw: string) => reconstructPII(sessionId, kw)),
      };
    } finally {
      clearPIISession(sessionId);
    }
  }
);
