import { config } from 'dotenv';
// Explicitly load .env.local for development
config({ path: '.env.local' });

// import '@/ai/flows/classify-incident-report.ts';
// import '@/ai/flows/mental-health-chat-flow.ts';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
    plugins: [googleAI()],
    // PINNED: Do not change without re-validating self-harm detection prompts.
    // Last validated: 2026-02-19
    model: 'googleai/gemini-2.0-flash-001',
});
