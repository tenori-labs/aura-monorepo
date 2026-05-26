import { config } from 'dotenv';
// dotenv@17 prints a banner to stdout by default — suppress so the token
// is the only thing on stdout and shells can capture it cleanly.
config({ path: '.env.local', quiet: true } as any);

import { issueConsoleToken } from '@/lib/console-auth';

process.stdout.write(issueConsoleToken());
