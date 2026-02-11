import { config } from 'dotenv';
// Explicitly load .env.local for development
config({ path: '.env.local' });

// import '@/ai/flows/classify-incident-report.ts';
// import '@/ai/flows/mental-health-chat-flow.ts';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.0-flash',
});
