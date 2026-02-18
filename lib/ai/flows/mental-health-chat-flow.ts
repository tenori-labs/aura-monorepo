'use server';

import { ai } from '@/lib/ai/genkit';
import { z } from 'zod';

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
});
export type MentalHealthChatInput = z.infer<typeof MentalHealthChatInputSchema>;

// Strict schema for LLM generation (all fields required)
const GenerationSchema = z.object({
    responseText: z.string().describe("Aura's empathetic, conversational reply to the student."),
    riskAssessment: z.enum(["No Risk", "At Risk", "High Risk"]).describe("Background risk level assessment."),
    anxietyLevel: z.enum(["Low", "Moderate", "High", "Not Assessed"]).describe("Assessed anxiety level."),
    moodState: z.string().describe("Apparent mood state, e.g. 'Stable', 'Anxious', 'Depressed'."),
    cognitivePatterns: z.array(z.string()).describe("Observed cognitive patterns like 'Catastrophizing', 'Rumination'."),
    counselorNotes: z.string().describe("Brief observations for the counselor."),
});

// Loose schema for Flow output (fields optional to allow error handling)
const MentalHealthChatOutputSchema = z.object({
    responseText: z.string().optional(),
    riskAssessment: z.enum(["No Risk", "At Risk", "High Risk"]).optional(),
    anxietyLevel: z.enum(["Low", "Moderate", "High", "Not Assessed"]).optional(),
    moodState: z.string().optional(),
    cognitivePatterns: z.array(z.string()).optional(),
    counselorNotes: z.string().optional(),
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

Your "responseText" field must contain your natural, empathetic, conversational reply to the student. It should NOT mention any internal analysis fields.
`;

export async function mentalHealthChat(input: MentalHealthChatInput): Promise<MentalHealthChatOutput> {
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
        const { newMessage, history, isGreeting } = flowInput;

        // --- PII Filter: sanitize user message before LLM ---
        const { filterPII, reconstructPII, clearPIISession } = await import('@/lib/ai/pii-filter');
        const [sanitizedMessage, sessionId] = filterPII(newMessage.content || 'Hello');

        console.log('[PII Filter] Chat message sanitized:', sanitizedMessage);

        let systemPrompt = SYSTEM_INSTRUCTIONS;
        if (isGreeting) {
            systemPrompt += "\nThis is the first message. Provide a warm greeting as responseText. Default riskAssessment to 'No Risk', anxietyLevel to 'Not Assessed', moodState to 'Neutral', cognitivePatterns to empty array, counselorNotes to 'Initial greeting.'";
        }

        try {
            // Sanitize history: filter out messages with missing role or content
            const validHistory = (history || []).filter(
                (m: ChatMessage) => m && m.role && typeof m.content === 'string' && m.content.length > 0
            );

            // Sanitize history messages too
            let formattedHistory = validHistory.map((m: ChatMessage) => {
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
                model: 'googleai/gemini-2.0-flash',
                messages: [...formattedHistory, formattedNewMessage],
                system: systemPrompt,
                output: { schema: GenerationSchema },
            });

            if (!output || !output.responseText) {
                clearPIISession(sessionId);
                return { error: "I'm having trouble right now. Please try again." };
            }

            console.log("Aura Risk Assessment (background):", output.riskAssessment);
            console.log("Aura Mood (background):", output.moodState);
            console.log("Aura Anxiety (background):", output.anxietyLevel);

            // --- PII Filter: reconstruct PII in Aura's response ---
            const restoredResponse = reconstructPII(sessionId, output.responseText);
            clearPIISession(sessionId);

            return {
                responseText: restoredResponse,
                riskAssessment: output.riskAssessment,
                anxietyLevel: output.anxietyLevel,
                moodState: output.moodState,
                cognitivePatterns: output.cognitivePatterns,
                counselorNotes: output.counselorNotes,
            };
        } catch (e: any) {
            clearPIISession(sessionId);
            console.error('Error in mentalHealthChatFlow:', e);
            return { error: `Something went wrong. Please try again.` };
        }
    }
);
