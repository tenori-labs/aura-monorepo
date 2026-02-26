import { MongoClient } from 'mongodb';

const globalForMongo = globalThis as unknown as {
    mongoPromise: Promise<MongoClient> | undefined;
};

/**
 * Native MongoDB client promise — used ONLY for Atlas Vector Search.
 * All other DB operations go through Prisma.
 *
 * Reason: Prisma's aggregateRaw and $runCommandRaw do not properly
 * serialize $vectorSearch pipeline stages, returning empty results.
 * The native MongoDB driver handles this correctly.
 */
const clientPromise =
    globalForMongo.mongoPromise ??
    new MongoClient(process.env.DATABASE_URL!).connect();

if (process.env.NODE_ENV !== 'production') {
    globalForMongo.mongoPromise = clientPromise;
}

export default clientPromise;
