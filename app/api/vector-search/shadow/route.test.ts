/**
 * @file Tests for /api/vector-search/shadow (ShadowCase) route handler.
 *
 * Mirror of the CoreIssue route test — same trust boundary, different
 * index + projection. The body-supplied-tenantId-is-ignored contract
 * is the most important assertion here.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ObjectId } from 'mongodb';

// ─── Mocks ───────────────────────────────────────────────────────────

jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/auth/tenant', () => ({
    getCurrentUserTenantId: jest.fn(),
}));

const mockAggregate = jest.fn();
const mockToArray = jest.fn();
const mockCollection = jest.fn(() => ({
    aggregate: mockAggregate.mockReturnValue({ toArray: mockToArray }),
}));

jest.mock('@/lib/mongodb', () => ({
    __esModule: true,
    default: Promise.resolve({
        db: jest.fn(() => ({
            collection: mockCollection,
        })),
    }),
}));

import { auth } from '@clerk/nextjs/server';
import { getCurrentUserTenantId } from '@/lib/auth/tenant';
import { POST } from './route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockTenant = getCurrentUserTenantId as jest.MockedFunction<typeof getCurrentUserTenantId>;

const fakeEmbedding = new Array(3072).fill(0).map((_, i) => Math.cos(i));
const TENANT_A = '6a02c50a22125e51485906e9';
const TENANT_B = '6b13d61b33236f62596a17fa';

function makeRequest(body: any, ip = '10.0.0.2') {
    return new Request('http://localhost:3000/api/vector-search/shadow', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-forwarded-for': ip,
        },
        body: JSON.stringify(body),
    });
}

beforeEach(() => {
    mockAuth.mockReset();
    mockTenant.mockReset();
    mockAggregate.mockClear();
    mockToArray.mockReset();
    mockCollection.mockClear();
});

describe('POST /api/vector-search/shadow — guards', () => {
    it('returns 401 when not signed in', async () => {
        mockAuth.mockResolvedValueOnce({ userId: null } as any);
        const res = await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);
        expect(res.status).toBe(401);
        expect(mockAggregate).not.toHaveBeenCalled();
    });

    it('returns 403 when no tenant resolves', async () => {
        mockAuth.mockResolvedValueOnce({ userId: 'user_1' } as any);
        mockTenant.mockResolvedValueOnce(null);
        const res = await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);
        expect(res.status).toBe(403);
    });
});

describe('POST /api/vector-search/shadow — body validation', () => {
    beforeEach(() => {
        mockAuth.mockResolvedValue({ userId: 'user_1' } as any);
        mockTenant.mockResolvedValue(TENANT_A);
    });

    it('rejects empty body', async () => {
        const res = await POST(makeRequest({}) as any);
        expect(res.status).toBe(400);
    });

    it('rejects wrong embedding dimensions', async () => {
        const res = await POST(makeRequest({ queryEmbedding: [1, 2, 3] }) as any);
        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/3072/);
    });
});

describe('POST /api/vector-search/shadow — aggregate pipeline', () => {
    beforeEach(() => {
        mockAuth.mockResolvedValue({ userId: 'user_1' } as any);
        mockTenant.mockResolvedValue(TENANT_A);
        mockToArray.mockResolvedValue([
            { _id: 'sc-1', entityName: 'Match', score: 0.87 },
        ]);
    });

    it('hits the ShadowCase collection', async () => {
        await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);
        expect(mockCollection).toHaveBeenCalledWith('ShadowCase');
    });

    it('places $vectorSearch first with shadow_vector_index + numCandidates 200', async () => {
        await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);

        const pipeline = mockAggregate.mock.calls[0][0];
        expect(pipeline[0]).toEqual({
            $vectorSearch: {
                index: 'shadow_vector_index',
                path: 'embedding',
                queryVector: fakeEmbedding,
                numCandidates: 200,
                limit: 20,
            },
        });
    });

    it('places a $match on session-derived tenantId after $vectorSearch', async () => {
        await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);

        const pipeline = mockAggregate.mock.calls[0][0];
        expect(pipeline[1]).toEqual({
            $match: { tenantId: new ObjectId(TENANT_A) },
        });
    });

    it('IGNORES body-supplied tenantId', async () => {
        await POST(
            makeRequest({ queryEmbedding: fakeEmbedding, tenantId: TENANT_B }) as any
        );

        const pipeline = mockAggregate.mock.calls[0][0];
        expect(pipeline[1].$match.tenantId.toString()).toBe(TENANT_A);
        expect(pipeline[1].$match.tenantId.toString()).not.toBe(TENANT_B);
    });

    it('returns the aggregate results', async () => {
        const res = await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.results[0]).toEqual({
            _id: 'sc-1',
            entityName: 'Match',
            score: 0.87,
        });
    });
});
