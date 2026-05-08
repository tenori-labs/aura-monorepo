import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { rateLimit, getRequestIP } from '@/lib/rate-limit';

/**
 * POST /api/vector-search/shadow
 *
 * Internal API route for Atlas Vector Search on the ShadowCase collection.
 * Requires an authenticated Supabase session.
 *
 * Body: { queryEmbedding: number[] }
 * Returns: { results: Array<{ _id, entityName, score }> }
 */
export async function POST(req: NextRequest) {
    try {
        // Auth guard
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        const results = await db
            .collection('ShadowCase')
            .aggregate([
                {
                    $vectorSearch: {
                        index: 'shadow_vector_index',
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: 50,
                        limit: 5,
                    },
                },
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
