import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/vector-search
 *
 * Internal API route for Atlas Vector Search using the native MongoDB driver.
 * Requires an authenticated Supabase session.
 *
 * Body: { queryEmbedding: number[] }
 * Returns: { results: Array<{ _id, title, score }> }
 */
export async function POST(req: NextRequest) {
    try {
        // Auth guard
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
            .collection('CoreIssue')
            .aggregate([
                {
                    $vectorSearch: {
                        index: 'vector_index',
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: 50,
                        limit: 1,
                    },
                },
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
