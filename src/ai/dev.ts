import { config } from 'dotenv';
// Explicitly load .env.local for development
config({ path: '.env.local' });

import '@/ai/flows/classify-incident-report.ts';
import '@/ai/flows/mental-health-chat-flow.ts';
