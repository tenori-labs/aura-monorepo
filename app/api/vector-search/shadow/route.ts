import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { rateLimit, getRequestIP } from '@/lib/rate-limit';
import { getCurrentUserTenantId } from '@/lib/auth/tenant';

/**
 * POST /api/vector-search/shadow
 *
 * Internal API route for Atlas Vector Search on the ShadowCase collection.
 * Requires an authenticated Clerk session.
 *
 * Tenant scope: results are filtered to the caller's tenant via a `$match`
 * stage immediately after `$vectorSearch`. Tenant ID is derived server-side
 * from the session — body-supplied tenant IDs are ignored to prevent
 * cross-tenant leakage.
 *
 * Body: { queryEmbedding: number[] }   // tenantId in body is ignored
 * Returns: { results: Array<{ _id, entityName, score }> }
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
        // See note on the CoreIssue route — same pattern, same TODO.
        // TODO(atlas-index): rebuild `shadow_vector_index` with tenantId as
        // a filter field, then move scope into $vectorSearch.filter.
        const results = await db
            .collection('ShadowCase')
            .aggregate([
                {
                    $vectorSearch: {
                        index: 'shadow_vector_index',
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
                { $limit: 5 },
                {
                    $project: {
                        _id: 1,
                        entityName: 1,
                        score: { $meta: 'vectorSearchScore' },
                    },
                },
            ])
            .toArray();

        return NextResponse.json({ results });
    } catch (error) {
        console.error('[VectorSearch Shadow API] Error:', error);
        return NextResponse.json({ error: 'Vector search failed' }, { status: 500 });
    }
}
