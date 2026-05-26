import { config, type DotenvConfigOptions } from 'dotenv';
// dotenv@17 prints a banner to stdout by default — suppress so the token
// is the only thing on stdout and shells can capture it cleanly. The
// `quiet` option exists at runtime but isn't in the v17 .d.ts yet.
config({ path: '.env.local', quiet: true } as DotenvConfigOptions & { quiet: boolean });

import { issueConsoleToken } from '@/lib/console-auth';

process.stdout.write(issueConsoleToken());
