'use server';

import { ai } from '@/lib/ai/genkit';
import { z } from 'genkit';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const MentalHealthChatInputSchema = z.object({
  studentId: z.string().optional(),
  newMessage: ChatMessageSchema,
  history: z.array(ChatMessageSchema).optional(),
  isGreeting: z.boolean().optional().default(false),
  isClarificationResponse: z.boolean().optional().default(false),
});
export type MentalHealthChatInput = z.infer<typeof MentalHealthChatInputSchema>;

// Strict schema for LLM generation (all fields required)
const GenerationSchema = z.object({
  responseText: z.string().describe("Aura's empathetic, conversational reply to the student."),
  riskAssessment: z
    .enum(['No Risk', 'At Risk', 'High Risk'])
    .describe('Background risk level assessment.'),
  anxietyLevel: z
    .enum(['Low', 'Moderate', 'High', 'Not Assessed'])
    .describe('Assessed anxiety level.'),
  moodState: z.string().describe("Apparent mood state, e.g. 'Stable', 'Anxious', 'Depressed'."),
  cognitivePatterns: z
    .array(z.string())
    .describe("Observed cognitive patterns like 'Catastrophizing', 'Rumination'."),
  counselorNotes: z.string().describe('Brief observations for the counselor.'),
  // ─── Self-harm detection fields ───
  selfHarmSignal: z
    .boolean()
    .describe(
      "Set to true ONLY for explicit self-harm/suicidal language (e.g. 'I want to die', 'hurt myself', 'don't want to be here anymore', specific plans). Set to false for general sadness, frustration, stress, fatigue, or 'not doing well' — those are normal venting, not crisis."
    ),
  followUpQuestion: z
    .string()
    .optional()
    .describe(
      'When selfHarmSignal is true, a gentle one-sentence check-in question. Do NOT mention reports, counselors, or alerts.'
    ),
  conversationThemes: z
    .array(z.string())
    .optional()
    .describe(
      "General topics observed (e.g. 'academic pressure', 'social isolation'). Themes only, never verbatim quotes."
    ),
});

// Loose schema for Flow output (fields optional to allow error handling)
const MentalHealthChatOutputSchema = z.object({
  responseText: z.string().optional(),
  riskAssessment: z.enum(['No Risk', 'At Risk', 'High Risk']).optional(),
  anxietyLevel: z.enum(['Low', 'Moderate', 'High', 'Not Assessed']).optional(),
  moodState: z.string().optional(),
  cognitivePatterns: z.array(z.string()).optional(),
  counselorNotes: z.string().optional(),
  selfHarmSignal: z.boolean().optional(),
  followUpQuestion: z.string().optional(),
  conversationThemes: z.array(z.string()).optional(),
  error: z.string().optional(),
});
export type MentalHealthChatOutput = z.infer<typeof MentalHealthChatOutputSchema>;

const SYSTEM_INSTRUCTIONS = `You are Aura, an AI assistant trained in supportive conversational techniques inspired by principles of psychotherapy (like active listening, Socratic questioning, and cognitive-behavioral frameworks). Your goal is to provide a safe, structured, and reflective space for users to explore their thoughts and feelings.

Key characteristics and behaviors:
1.  **Reflective Listening & Validation**: Always start by reflecting and validating the user's stated feelings. Examples: "It sounds like you're feeling really frustrated with that situation.", "That sounds incredibly difficult, and it makes perfect sense that you would feel anxious about it."
2.  **Open-Ended Exploration (Socratic Questioning)**: Use open-ended questions to help the user explore their own thoughts and feelings. Avoid giving direct advice. Guide them to their own insights. Examples: "What was going through your mind when that happened?", "When you say 'overwhelmed,' what does that look like for you?"
3.  **Identify Patterns (Gently)**: As you notice recurring themes or thought patterns, gently reflect them back to the user as a question.
4.  **Maintain a Professional, Empathetic Tone**: Use a calm, professional, and consistently supportive tone. Use clear and accessible language. Avoid overly casual slang or emojis.
5.  **Proactive Greeting**: If it's the start of the conversation (indicated by isGreeting: true), initiate with a warm, open-ended, and professional question.
6.  **CRITICAL SAFETY PROTOCOL**: You are a supportive tool, NOT a licensed therapist. You must never diagnose conditions, provide medical advice, or handle a crisis directly.
    *   If a user expresses severe distress, thoughts of self-harm, harm to others, or describes a crisis situation, you MUST immediately and gently pivot to recommending professional help.
    *   Do NOT attempt to "talk them out of it" or explore the crisis feelings further. Your ONLY goal is a safe handoff to a human professional.

---
INTERNAL ANALYSIS (DO NOT reveal this to the student in your responseText):
---
In your JSON output, fill in the following fields based on your analysis of the conversation:
- riskAssessment: "No Risk", "At Risk", or "High Risk"
- anxietyLevel: "Low", "Moderate", "High", or "Not Assessed"
- moodState: describe the user's apparent mood in one or two words
- cognitivePatterns: array of observed patterns like "Catastrophizing", "Rumination", "Self-criticism"
- counselorNotes: brief notes about the conversation for the counselor

SELF-HARM DETECTION (be precise — false positives undermine trust):
Set selfHarmSignal to true ONLY when the student's message contains explicit, specific language about:
- Wanting to die, end their life, or stop existing
- Hurting themselves, cutting, or other self-injury
- Having a plan, method, or means to harm themselves
- Phrases like "I don't want to be here anymore", "I want to disappear forever", "no point in living"

Set selfHarmSignal to FALSE for general emotional content, even when negative. The following must NOT trigger:
- "I'm not doing well" / "I'm not okay" / "I had a bad day"
- "I'm sad", "I'm tired", "I'm exhausted", "I feel hopeless about [a specific thing]"
- "I'm stressed", "I'm anxious", "I'm overwhelmed"
- "Things are heavy" / "It's been rough" / "I'm struggling"
- Venting about academics, relationships, family, or work
- Casual greetings, even bleak ones

When in genuine doubt between an explicit indicator and general venting, choose FALSE — Aura's normal empathetic responses are appropriate for general distress.

When selfHarmSignal is TRUE:
- Set followUpQuestion to a gentle, natural check-in that gives the student space to clarify, in your OWN words. Do not mention reports, counselors, or alerts.
- Keep it conversational. One sentence. Warm tone.
- DO NOT copy any example phrasing verbatim — write a fresh sentence each time.
- The followUpQuestion should ALSO be used as your responseText.

When selfHarmSignal is FALSE:
- Set followUpQuestion to null/empty.
- Respond normally with empathy, reflective listening, and open-ended questions per the rest of these instructions.

CONVERSATION THEMES (REQUIRED when selfHarmSignal is true):
Always extract conversationThemes — a list of general topics observed (e.g. "academic pressure", "social isolation", "family stress", "suicidal ideation", "hopelessness"). These are themes only, never verbatim quotes.
When selfHarmSignal is true, you MUST provide at least one theme. Never return an empty array when selfHarmSignal is true.

Your "responseText" field must contain your natural, empathetic, conversational reply to the student. It should NOT mention any internal analysis fields.
`;

/**
 * Processes incoming chat messages via robust AI flows designed for mental wellbeing safely.
 * Includes explicit self-harm detection, distress flagging, and empathetic AI persona emulation.
 *
 * @param input - Deep context object incorporating chat history, counselor instructions, and raw new message
 * @returns The mental health chatbot response and internal observations structured via Zod
 */
export async function mentalHealthChat(
  input: MentalHealthChatInput
): Promise<MentalHealthChatOutput> {
  const output = await mentalHealthChatFlow(input);
  return output;
}

const mentalHealthChatFlow = ai.defineFlow(
  {
    name: 'mentalHealthChatFlow',
    inputSchema: MentalHealthChatInputSchema,
    outputSchema: MentalHealthChatOutputSchema,
  },
  async (flowInput: MentalHealthChatInput) => {
    const { newMessage, history, isGreeting, isClarificationResponse } = flowInput;

    // --- PII Filter: sanitize user message before LLM ---
    const { filterPII, reconstructPII, clearPIISession } = await import('@/lib/ai/pii-filter');
    const [sanitizedMessage, sessionId] = filterPII(newMessage.content || 'Hello');

    console.log('[PII Filter] Chat message sanitized:', sanitizedMessage);

    let systemPrompt = SYSTEM_INSTRUCTIONS;
    if (isGreeting) {
      systemPrompt +=
        "\nThis is the first message. Provide a warm greeting as responseText. Default riskAssessment to 'No Risk', anxietyLevel to 'Not Assessed', moodState to 'Neutral', cognitivePatterns to empty array, counselorNotes to 'Initial greeting.', selfHarmSignal to false, conversationThemes to empty array.";
    } else if (isClarificationResponse) {
      systemPrompt +=
        '\nThe user has just responded to your self-harm check-in. Do NOT set selfHarmSignal to true this time. Instead, provide a warm, validating, and supportive response acknowledging their feelings. Focus on creating a safe space.';
    }

    try {
      // Sanitize history: filter out messages with missing role or content
      const validHistory = (history || []).filter(
        (m: ChatMessage) => m && m.role && typeof m.content === 'string' && m.content.length > 0
      );

      // Sanitize history messages too
      const formattedHistory = validHistory.map((m: ChatMessage) => {
        if (m.role === 'user') {
          const [sanitizedHist] = filterPII(m.content);
          return {
            role: m.role as 'user' | 'model',
            content: [{ text: sanitizedHist }],
          };
        }
        return {
          role: m.role as 'user' | 'model',
          content: [{ text: m.content }],
        };
      });

      // Gemini requires first message from 'user'
      if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
        formattedHistory.unshift({
          role: 'user' as const,
          content: [{ text: 'Hello' }],
        });
      }

      const formattedNewMessage = {
        role: newMessage.role as 'user' | 'model',
        content: [{ text: sanitizedMessage }], // Use sanitized message
      };

      const { output } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-001',
        messages: [...formattedHistory, formattedNewMessage],
        system: systemPrompt,
        output: { schema: GenerationSchema },
      });

      if (!output || !output.responseText) {
        clearPIISession(sessionId);
        return { error: "I'm having trouble right now. Please try again." };
      }

      console.log('Aura Risk Assessment (background):', output.riskAssessment);
      console.log('Aura Mood (background):', output.moodState);
      console.log('Aura Anxiety (background):', output.anxietyLevel);
      console.log('Aura Self-Harm Signal:', output.selfHarmSignal);
      if (output.conversationThemes?.length) {
        console.log('Aura Themes:', output.conversationThemes.join(', '));
      }

      // --- PII Filter: reconstruct PII in Aura's response ---
      const restoredResponse = reconstructPII(sessionId, output.responseText);
      const restoredFollowUp = output.followUpQuestion
        ? reconstructPII(sessionId, output.followUpQuestion)
        : undefined;
      clearPIISession(sessionId);

      return {
        responseText: restoredResponse,
        riskAssessment: output.riskAssessment,
        anxietyLevel: output.anxietyLevel,
        moodState: output.moodState,
        cognitivePatterns: output.cognitivePatterns,
        counselorNotes: output.counselorNotes,
        selfHarmSignal: output.selfHarmSignal,
        followUpQuestion: restoredFollowUp,
        conversationThemes: output.conversationThemes,
      };
    } catch (e: unknown) {
      clearPIISession(sessionId);
      console.error('Error in mentalHealthChatFlow:', e);
      return { error: `Something went wrong. Please try again.` };
    }
  }
);
