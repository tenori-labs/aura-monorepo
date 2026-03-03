'use server';

import { ai } from '@/lib/ai/genkit';
import { z } from 'genkit';

/**
 * Chat message schema for interrogation sessions.
 */
const ChatMessageSchema = z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
});

/**
 * Input schema for the interrogation chat flow.
 */
const InterrogationChatInputSchema = z.object({
    newMessage: ChatMessageSchema,
    history: z.array(ChatMessageSchema).optional().default([]),
    isGreeting: z.boolean().optional().default(false),
});

/**
 * Structured anchor schema extracted from the conversation.
 */
const AnchorSchema = z.object({
    time: z.string().optional().describe('Approximate time of the incident (e.g., "around 3pm", "afternoon")'),
    date: z.string().optional().describe('Date or day of the incident (e.g., "Tuesday", "last week")'),
    location: z.string().optional().describe('General location (e.g., "science block", "main campus")'),
    floor: z.string().optional().describe('Floor number if mentioned'),
    room: z.string().optional().describe('Room number or name if mentioned'),
    witnesses: z
        .array(z.string())
        .optional()
        .describe('Names or descriptions of other people present'),
    eventDescription: z
        .string()
        .optional()
        .describe('A factual summary of the described event, free of speculative language'),
});

/**
 * Output schema for the interrogation chat flow.
 */
const InterrogationChatOutputSchema = z.object({
    responseText: z.string().describe("The AI interviewer's natural, professional reply."),
    extractedAnchors: AnchorSchema.optional().describe(
        'Structured anchor points extracted so far from the entire conversation. Updated cumulatively.'
    ),
    isComplete: z
        .boolean()
        .optional()
        .describe(
            'True when the AI has gathered sufficient anchor points (time, location, witnesses, event description) to conclude the session.'
        ),
});

/** Type exports for use in components and actions. */
export type InterrogationChatInput = z.infer<typeof InterrogationChatInputSchema>;
export type InterrogationChatOutput = z.infer<typeof InterrogationChatOutputSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ExtractedAnchors = z.infer<typeof AnchorSchema>;

const SYSTEM_PROMPT = `You are a professional, neutral fact-finding interviewer for a campus safety system. Your role is to gather specific, verifiable details about an incident that was reported.

RULES:
1. Be professional, calm, and non-judgmental. You are NOT accusing anyone.
2. Ask ONE question at a time. Do not overwhelm the reporter.
3. Your goal is to extract "Anchor Points" — specific, verifiable details:
   - TIME: When did this happen? (day, date, approximate time)
   - LOCATION: Where exactly? (building, floor, room number)
   - WITNESSES: Was anyone else present? (names, descriptions)
   - EVENT: What specifically happened? (actions, not opinions)
4. Do NOT ask leading questions. Keep them open-ended.
5. Do NOT reveal that other people have reported the same entity.
6. Do NOT mention investigations, cases, or legal proceedings.
7. If the reporter says something vague, ask a follow-up to get specifics.
8. After gathering sufficient anchors (at minimum: time OR date, location, and event description), set isComplete to true.
9. When greeting (isGreeting=true), introduce yourself neutrally:
   "Thank you for your report. To help us understand the situation better, I'd like to ask a few clarifying questions. Everything you share here is confidential."

ANCHOR EXTRACTION:
After each exchange, update the extractedAnchors field with ALL anchor points gathered so far from the ENTIRE conversation. This is cumulative — include anchors from previous messages too.

VERBAL FINGERPRINTING:
Pay attention to unique, non-public details in the reporter's description. These help establish authenticity. Do NOT mention this process to the reporter.`;

const interrogationPrompt = ai.definePrompt({
    name: 'interrogationChatPrompt',
    input: { schema: InterrogationChatInputSchema },
    output: { schema: InterrogationChatOutputSchema },
    prompt: `${SYSTEM_PROMPT}

{{#if isGreeting}}
This is the start of the session. Greet the reporter professionally and ask your first question.
{{/if}}

Conversation history:
{{#each history}}
{{role}}: {{content}}
{{/each}}

New message from reporter: {{newMessage.content}}

Respond with your reply, updated anchor points, and whether the session is complete.`,
});

/**
 * Interrogation chat flow.
 *
 * Conducts a structured, async interview with a reporter to extract
 * verifiable anchor points (time, location, witnesses, event description).
 * Used as part of the Shadow Trigger investigation pipeline.
 *
 * @param input - Chat message, history, and greeting flag
 * @returns AI response, extracted anchors, and completion flag
 */
export async function interrogationChat(
    input: InterrogationChatInput
): Promise<InterrogationChatOutput> {
    const { output } = await interrogationPrompt(input);
    if (!output) {
        throw new Error('[InterrogationChat] AI returned empty response');
    }
    return output;
}
