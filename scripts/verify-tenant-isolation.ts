/**
 * Real-DB tenant-isolation test for /api/vector-search.
 *
 * Mock-based tests verify that the route ASSEMBLES the right pipeline.
 * They do NOT verify that MongoDB actually filters rows — for that we
 * need real data and the real Atlas aggregate.
 *
 * What this script does:
 *   1. Seeds two ephemeral Tenants (subdomain prefixed `iso-test-…`)
 *   2. Seeds, for each tenant, one CoreIssue + one ShadowCase, both
 *      stamped with that tenant's id, both using the SAME embedding
 *      vector so they'd otherwise tie for first place
 *   3. Runs the exact aggregate pipeline from the route handlers
 *      (including numCandidates=200 and the $match stage), once per
 *      tenant
 *   4. Asserts: each query returns ONLY its own tenant's row, and
 *      never the other tenant's
 *   5. Cleans up — deletes every doc it created
 *
 * Run:
 *   pnpm exec ts-node -r tsconfig-paths/register --project tsconfig.scripts.json scripts/verify-tenant-isolation.ts
 *
 * The script is safe to run against shared dev DBs because every test
 * row is uniquely tagged and gets removed in the `finally` block, even
 * on failure.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { config } from 'dotenv';
config({ path: '.env.local', quiet: true } as any);

import { MongoClient, ObjectId } from 'mongodb';
import { PrismaClient } from '@prisma/client';

const RUN_ID = `iso-test-${Date.now()}`;
const SUBDOMAIN_A = `${RUN_ID}-A`;
const SUBDOMAIN_B = `${RUN_ID}-B`;

const prisma = new PrismaClient();

/** Build a deterministic 3072-dim embedding so both tenants tie on score. */
function makeEmbedding(seed: number): number[] {
    const v = new Array(3072);
    for (let i = 0; i < 3072; i++) v[i] = Math.sin(i * 0.0001 + seed) * 0.5;
    return v;
}

/** Wait up to N seconds for the vector index to see freshly inserted rows. */
async function waitForIndex(
    client: MongoClient,
    collection: string,
    tenantId: ObjectId,
    embedding: number[],
    indexName: string,
    timeoutMs = 60_000
): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const results = await client
            .db('aura')
            .collection(collection)
            .aggregate([
                {
                    $vectorSearch: {
                        index: indexName,
                        path: 'embedding',
                        queryVector: embedding,
                        numCandidates: 200,
                        limit: 20,
                    },
                },
                { $match: { tenantId } },
                { $limit: 1 },
                { $project: { _id: 1 } },
            ])
            .toArray();
        if (results.length > 0) return true;
        await new Promise((r) => setTimeout(r, 2_000));
    }
    return false;
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set. Did you load .env.local?');
    }

    const client = await new MongoClient(process.env.DATABASE_URL).connect();
    const db = client.db('aura');

    const cleanup: Array<() => Promise<unknown>> = [];

    try {
        console.log(`\n▶ Run ID: ${RUN_ID}\n`);

        // ─── 1. Seed two tenants ─────────────────────────────────────
        console.log('1. Seeding two tenants…');
        const tenantA = await prisma.tenant.create({
            data: { subdomain: SUBDOMAIN_A, name: `Iso Test A (${RUN_ID})`, createdBy: 'iso-test' },
            select: { id: true },
        });
        const tenantB = await prisma.tenant.create({
            data: { subdomain: SUBDOMAIN_B, name: `Iso Test B (${RUN_ID})`, createdBy: 'iso-test' },
            select: { id: true },
        });
        cleanup.push(() => prisma.tenant.delete({ where: { id: tenantA.id } }));
        cleanup.push(() => prisma.tenant.delete({ where: { id: tenantB.id } }));
        console.log(`   tenant A: ${tenantA.id}`);
        console.log(`   tenant B: ${tenantB.id}\n`);

        const tenantAObj = new ObjectId(tenantA.id);
        const tenantBObj = new ObjectId(tenantB.id);

        // ─── 2. Seed identical embeddings into both collections ──────
        console.log('2. Seeding CoreIssues + ShadowCases with identical embeddings…');
        const SHARED_VEC = makeEmbedding(42);

        const titleA = `iso-test CoreIssue A ${RUN_ID}`;
        const titleB = `iso-test CoreIssue B ${RUN_ID}`;
        const entityA = `iso-test Entity A ${RUN_ID}`;
        const entityB = `iso-test Entity B ${RUN_ID}`;

        const coreIssueA = await prisma.coreIssue.create({
            data: {
                tenantId: tenantA.id,
                title: titleA,
                summary: 'iso-test',
                embedding: SHARED_VEC,
                uniqueCount: 1,
            },
            select: { id: true },
        });
        const coreIssueB = await prisma.coreIssue.create({
            data: {
                tenantId: tenantB.id,
                title: titleB,
                summary: 'iso-test',
                embedding: SHARED_VEC,
                uniqueCount: 1,
            },
            select: { id: true },
        });
        cleanup.push(() => prisma.coreIssue.delete({ where: { id: coreIssueA.id } }));
        cleanup.push(() => prisma.coreIssue.delete({ where: { id: coreIssueB.id } }));

        const shadowCaseA = await prisma.shadowCase.create({
            data: { tenantId: tenantA.id, entityName: entityA, embedding: SHARED_VEC, reportCount: 1 },
            select: { id: true },
        });
        const shadowCaseB = await prisma.shadowCase.create({
            data: { tenantId: tenantB.id, entityName: entityB, embedding: SHARED_VEC, reportCount: 1 },
            select: { id: true },
        });
        cleanup.push(() => prisma.shadowCase.delete({ where: { id: shadowCaseA.id } }));
        cleanup.push(() => prisma.shadowCase.delete({ where: { id: shadowCaseB.id } }));

        console.log(`   CoreIssue A:  ${coreIssueA.id}`);
        console.log(`   CoreIssue B:  ${coreIssueB.id}`);
        console.log(`   ShadowCase A: ${shadowCaseA.id}`);
        console.log(`   ShadowCase B: ${shadowCaseB.id}\n`);

        // ─── 3. Wait for Atlas vector index to ingest ────────────────
        // Both tenants' rows must be ingested before we query, otherwise
        // we can't distinguish "tenant B isolation works" from "tenant B
        // hasn't shown up in the index yet".
        console.log('3. Waiting for vector index to ingest new rows (Atlas is async)…');
        const readiness = await Promise.all([
            waitForIndex(client, 'CoreIssue', tenantAObj, SHARED_VEC, 'vector_index'),
            waitForIndex(client, 'CoreIssue', tenantBObj, SHARED_VEC, 'vector_index'),
            waitForIndex(client, 'ShadowCase', tenantAObj, SHARED_VEC, 'shadow_vector_index'),
            waitForIndex(client, 'ShadowCase', tenantBObj, SHARED_VEC, 'shadow_vector_index'),
        ]);
        const [ciA, ciB, scA, scB] = readiness;
        if (!ciA || !ciB || !scA || !scB) {
            throw new Error(
                `Vector index did not ingest within 60s ` +
                    `(CoreIssue A=${ciA} B=${ciB}, ShadowCase A=${scA} B=${scB}). ` +
                    `This is Atlas lag — retry shortly.`
            );
        }
        console.log('   ✓ Both tenants visible in both indexes\n');

        // ─── 4. Run the pipeline as tenant A ─────────────────────────
        console.log('4. Querying as tenant A — must return ONLY A\'s rows…');

        const coreIssueResultsA = await db
            .collection('CoreIssue')
            .aggregate([
                {
                    $vectorSearch: {
                        index: 'vector_index',
                        path: 'embedding',
                        queryVector: SHARED_VEC,
                        numCandidates: 200,
                        limit: 20,
                    },
                },
                { $match: { tenantId: tenantAObj } },
                { $project: { _id: 1, title: 1, tenantId: 1, score: { $meta: 'vectorSearchScore' } } },
            ])
            .toArray();
        const shadowResultsA = await db
            .collection('ShadowCase')
            .aggregate([
                {
                    $vectorSearch: {
                        index: 'shadow_vector_index',
                        path: 'embedding',
                        queryVector: SHARED_VEC,
                        numCandidates: 200,
                        limit: 20,
                    },
                },
                { $match: { tenantId: tenantAObj } },
                { $project: { _id: 1, entityName: 1, tenantId: 1, score: { $meta: 'vectorSearchScore' } } },
            ])
            .toArray();

        console.log(`   CoreIssue results: ${coreIssueResultsA.length}`);
        coreIssueResultsA.forEach((r) =>
            console.log(`     - ${r._id} "${r.title}" (tenant ${r.tenantId})`)
        );
        console.log(`   ShadowCase results: ${shadowResultsA.length}`);
        shadowResultsA.forEach((r) =>
            console.log(`     - ${r._id} "${r.entityName}" (tenant ${r.tenantId})`)
        );

        // ─── 5. Run the pipeline as tenant B ─────────────────────────
        console.log('\n5. Querying as tenant B — must return ONLY B\'s rows…');

        const coreIssueResultsB = await db
            .collection('CoreIssue')
            .aggregate([
                {
                    $vectorSearch: {
                        index: 'vector_index',
                        path: 'embedding',
                        queryVector: SHARED_VEC,
                        numCandidates: 200,
                        limit: 20,
                    },
                },
                { $match: { tenantId: tenantBObj } },
                { $project: { _id: 1, title: 1, tenantId: 1, score: { $meta: 'vectorSearchScore' } } },
            ])
            .toArray();
        const shadowResultsB = await db
            .collection('ShadowCase')
            .aggregate([
                {
                    $vectorSearch: {
                        index: 'shadow_vector_index',
                        path: 'embedding',
                        queryVector: SHARED_VEC,
                        numCandidates: 200,
                        limit: 20,
                    },
                },
                { $match: { tenantId: tenantBObj } },
                { $project: { _id: 1, entityName: 1, tenantId: 1, score: { $meta: 'vectorSearchScore' } } },
            ])
            .toArray();

        console.log(`   CoreIssue results: ${coreIssueResultsB.length}`);
        coreIssueResultsB.forEach((r) =>
            console.log(`     - ${r._id} "${r.title}" (tenant ${r.tenantId})`)
        );
        console.log(`   ShadowCase results: ${shadowResultsB.length}`);
        shadowResultsB.forEach((r) =>
            console.log(`     - ${r._id} "${r.entityName}" (tenant ${r.tenantId})`)
        );

        // ─── 6. Assertions ───────────────────────────────────────────
        console.log('\n6. Verifying isolation…');

        // Restrict to our test rows (the prod DB has unrelated rows).
        const tenantATestRowIdsCi = new Set([coreIssueA.id]);
        const tenantBTestRowIdsCi = new Set([coreIssueB.id]);
        const tenantATestRowIdsSc = new Set([shadowCaseA.id]);
        const tenantBTestRowIdsSc = new Set([shadowCaseB.id]);

        const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

        const ciAFromA = coreIssueResultsA.filter((r) => tenantATestRowIdsCi.has(r._id.toString()));
        const ciBFromA = coreIssueResultsA.filter((r) => tenantBTestRowIdsCi.has(r._id.toString()));
        checks.push({
            name: 'tenant-A query returns CoreIssue A',
            ok: ciAFromA.length === 1,
            detail: ciAFromA.length === 1 ? undefined : 'expected exactly 1',
        });
        checks.push({
            name: 'tenant-A query does NOT return CoreIssue B (cross-tenant leak)',
            ok: ciBFromA.length === 0,
            detail: ciBFromA.length === 0 ? undefined : `LEAKED ${ciBFromA.length} row(s)`,
        });

        const ciAFromB = coreIssueResultsB.filter((r) => tenantATestRowIdsCi.has(r._id.toString()));
        const ciBFromB = coreIssueResultsB.filter((r) => tenantBTestRowIdsCi.has(r._id.toString()));
        checks.push({
            name: 'tenant-B query returns CoreIssue B',
            ok: ciBFromB.length === 1,
        });
        checks.push({
            name: 'tenant-B query does NOT return CoreIssue A',
            ok: ciAFromB.length === 0,
            detail: ciAFromB.length === 0 ? undefined : `LEAKED ${ciAFromB.length} row(s)`,
        });

        const scAFromA = shadowResultsA.filter((r) => tenantATestRowIdsSc.has(r._id.toString()));
        const scBFromA = shadowResultsA.filter((r) => tenantBTestRowIdsSc.has(r._id.toString()));
        checks.push({
            name: 'tenant-A query returns ShadowCase A',
            ok: scAFromA.length === 1,
        });
        checks.push({
            name: 'tenant-A query does NOT return ShadowCase B',
            ok: scBFromA.length === 0,
            detail: scBFromA.length === 0 ? undefined : `LEAKED ${scBFromA.length} row(s)`,
        });

        const scAFromB = shadowResultsB.filter((r) => tenantATestRowIdsSc.has(r._id.toString()));
        const scBFromB = shadowResultsB.filter((r) => tenantBTestRowIdsSc.has(r._id.toString()));
        checks.push({
            name: 'tenant-B query returns ShadowCase B',
            ok: scBFromB.length === 1,
        });
        checks.push({
            name: 'tenant-B query does NOT return ShadowCase A',
            ok: scAFromB.length === 0,
            detail: scAFromB.length === 0 ? undefined : `LEAKED ${scAFromB.length} row(s)`,
        });

        // Sanity: tenantId field on returned rows must match the queried tenant.
        checks.push({
            name: 'every CoreIssue row returned for tenant A is stamped with tenant A',
            ok: coreIssueResultsA.every((r: any) => r.tenantId?.toString() === tenantA.id),
        });
        checks.push({
            name: 'every CoreIssue row returned for tenant B is stamped with tenant B',
            ok: coreIssueResultsB.every((r: any) => r.tenantId?.toString() === tenantB.id),
        });

        for (const c of checks) {
            console.log(`   ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
        }

        const failed = checks.filter((c) => !c.ok);
        if (failed.length > 0) {
            console.log(`\n──────── ${checks.length - failed.length}/${checks.length} passed ────────`);
            throw new Error(`${failed.length} isolation check(s) failed`);
        }

        console.log(`\n──────── ${checks.length}/${checks.length} passed — tenant isolation HOLDS ────────`);
    } finally {
        console.log('\nCleaning up test data…');
        // Run in reverse so child rows go before tenants.
        for (const fn of cleanup.reverse()) {
            try {
                await fn();
            } catch (e) {
                console.warn('   cleanup error (continuing):', (e as Error).message);
            }
        }
        await client.close();
        await prisma.$disconnect();
        console.log('   done.\n');
    }
}

main().catch((err) => {
    console.error('\n✖ verify-tenant-isolation failed:', err);
    process.exit(1);
});
