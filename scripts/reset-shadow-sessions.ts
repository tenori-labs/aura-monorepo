/**
 * Reset script — clears InterrogationSession data and resets
 * the ShadowCase status back to "collecting" so you can re-trigger.
 *
 * Usage: pnpm exec tsx scripts/reset-shadow-sessions.ts
 */
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();

    try {
        // 1. Delete all interrogation sessions
        const deleted = await prisma.interrogationSession.deleteMany({});
        console.log(`Deleted ${deleted.count} InterrogationSession(s)`);

        // 2. Reset all ShadowCase statuses back to "collecting"
        //    and set threshold to 2 for easy testing
        const updated = await prisma.shadowCase.updateMany({
            data: {
                status: 'collecting',
                threshold: 2,
                vcScore: null,
                vcDetails: undefined,
            },
        });
        console.log(`Reset ${updated.count} ShadowCase(s) to "collecting" with threshold=2`);

        console.log('\nDone! Now submit one more report about the same entity to trigger interrogation.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
