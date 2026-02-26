/**
 * One-off script to delete all existing shadow cases, reports, and
 * interrogation sessions so the system can be tested fresh with the
 * new enriched embeddings (entity name + keywords).
 *
 * Usage: npx tsx scripts/cleanup-shadow-cases.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.interrogationSession.deleteMany({});
    console.log(`Deleted ${sessions.count} interrogation sessions`);

    const reports = await prisma.shadowReport.deleteMany({});
    console.log(`Deleted ${reports.count} shadow reports`);

    const cases = await prisma.shadowCase.deleteMany({});
    console.log(`Deleted ${cases.count} shadow cases`);

    console.log('\nAll shadow data cleared. Ready for fresh testing.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
