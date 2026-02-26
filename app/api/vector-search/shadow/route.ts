import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

/**
 * POST /api/vector-search/shadow
 *
 * Internal API route for Atlas Vector Search on the ShadowCase collection.
 * Uses the native MongoDB driver to search for shadow cases by entity
 * name embedding.
 *
 * Body: { queryEmbedding: number[] }
 * Returns: { results: Array<{ _id, entityName, score }> }
 */
export async function POST(req: NextRequest) {
    try {
        const { queryEmbedding } = await req.json();

        if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
            return NextResponse.json(
                { error: 'queryEmbedding is required and must be an array' },
                { status: 400 }
            );
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
                        limit: 1,
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
