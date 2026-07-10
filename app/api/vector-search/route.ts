import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { rateLimit, getRequestIP } from '@/lib/rate-limit';
import { getCurrentUserTenantId } from '@/lib/auth/tenant';

/**
 * POST /api/vector-search
 *
 * Internal API route for Atlas Vector Search using the native MongoDB driver.
 * Requires an authenticated Clerk session.
 *
 * Tenant scope: results are filtered to the caller's tenant via a `$match`
 * stage immediately after `$vectorSearch`. Tenant ID is derived server-side
 * from the session — body-supplied tenant IDs are ignored to prevent
 * cross-tenant leakage.
 *
 * Body: { queryEmbedding: number[] }   // tenantId in body is ignored
 * Returns: { results: Array<{ _id, title, score }> }
 */
export async function POST(req: NextRequest) {
    try {
        // Auth guard
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Tenant scope — derived from the session, NOT from the request body.
        // Trusting body input here would let a caller probe other tenants.
        const tenantId = await getCurrentUserTenantId();
        if (!tenantId) {
            return NextResponse.json({ error: 'No tenant for current user' }, { status: 403 });
        }

        const { queryEmbedding } = await req.json();

        if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
            return NextResponse.json(
                { error: 'queryEmbedding is required and must be an array' },
                { status: 400 }
            );
        }

        if (queryEmbedding.length !== 3072) {
            return NextResponse.json(
                { error: 'queryEmbedding must have exactly 3072 dimensions' },
                { status: 400 }
            );
        }

        // Rate limit: 20 requests per minute per IP
        const ip = getRequestIP(req.headers);
        const { allowed } = rateLimit(ip);
        if (!allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const client = await clientPromise;
        const db = client.db('aura');

        // numCandidates bumped 50→200 to compensate for the post-filter.
        // $vectorSearch is the only stage allowed at the top of the pipeline,
        // so tenant scoping has to happen via $match downstream — which means
        // candidates from other tenants eat into our shortlist before filter.
        // TODO(atlas-index): when we can rebuild the Atlas index with `tenantId`
        // as a filter field, move this scope into $vectorSearch.filter so the
        // index itself enforces tenancy.
        const results = await db
            .collection('CoreIssue')
            .aggregate([
                {
                    $vectorSearch: {
                        index: 'vector_index',
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: 200,
                        limit: 20,
                    },
                },
                {
                    $match: {
                        tenantId: new ObjectId(tenantId),
                    },
                },
                { $limit: 1 },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        score: { $meta: 'vectorSearchScore' },
                    },
                },
            ])
            .toArray();

        return NextResponse.json({ results });
    } catch (error) {
        console.error('[VectorSearch API] Error:', error);
        return NextResponse.json({ error: 'Vector search failed' }, { status: 500 });
    }
}
