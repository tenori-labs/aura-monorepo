/**
 * @file Tests for /api/vector-search (CoreIssue) route handler.
 *
 * The route is the trust boundary for tenant isolation. These tests
 * verify the pipeline shape, the auth/tenant guards, and — critically —
 * that the tenantId comes from the session, NOT from request body input.
 * Anyone who can edit the body must not be able to query other tenants.
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

// Helper: 3072-dim vector for the embedding size check
const fakeEmbedding = new Array(3072).fill(0).map((_, i) => Math.sin(i));

// Tenant-shaped 24-hex string (valid ObjectId input)
const TENANT_A = '6a02c50a22125e51485906e9';
const TENANT_B = '6b13d61b33236f62596a17fa';

function makeRequest(body: any, ip = '10.0.0.1') {
    return new Request('http://localhost:3000/api/vector-search', {
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

// ─── Auth & tenant guards ────────────────────────────────────────────

describe('POST /api/vector-search — guards', () => {
    it('returns 401 when not signed in', async () => {
        mockAuth.mockResolvedValueOnce({ userId: null } as any);

        const res = await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ error: 'Unauthorized' });
        expect(mockTenant).not.toHaveBeenCalled();
        expect(mockAggregate).not.toHaveBeenCalled();
    });

    it('returns 403 when no tenant resolves for the signed-in user', async () => {
        mockAuth.mockResolvedValueOnce({ userId: 'user_1' } as any);
        mockTenant.mockResolvedValueOnce(null);

        const res = await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);

        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ error: 'No tenant for current user' });
        expect(mockAggregate).not.toHaveBeenCalled();
    });
});

// ─── Body validation ─────────────────────────────────────────────────

describe('POST /api/vector-search — body validation', () => {
    beforeEach(() => {
        mockAuth.mockResolvedValue({ userId: 'user_1' } as any);
        mockTenant.mockResolvedValue(TENANT_A);
    });

    it('rejects when queryEmbedding is missing', async () => {
        const res = await POST(makeRequest({}) as any);
        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/queryEmbedding is required/);
    });

    it('rejects when queryEmbedding is not an array', async () => {
        const res = await POST(makeRequest({ queryEmbedding: 'nope' }) as any);
        expect(res.status).toBe(400);
    });

    it('rejects when queryEmbedding has wrong dimensions', async () => {
        const res = await POST(makeRequest({ queryEmbedding: [0.1, 0.2] }) as any);
        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/3072 dimensions/);
    });
});

// ─── Pipeline shape (the actual tenant-scoping contract) ─────────────

describe('POST /api/vector-search — aggregate pipeline', () => {
    beforeEach(() => {
        mockAuth.mockResolvedValue({ userId: 'user_1' } as any);
        mockTenant.mockResolvedValue(TENANT_A);
        mockToArray.mockResolvedValue([
            { _id: 'issue-1', title: 'Match', score: 0.91 },
        ]);
    });

    it('hits the CoreIssue collection', async () => {
        await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);
        expect(mockCollection).toHaveBeenCalledWith('CoreIssue');
    });

    it('places $vectorSearch first with the correct index and numCandidates', async () => {
        await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);

        const pipeline = mockAggregate.mock.calls[0][0];
        expect(pipeline[0]).toEqual({
            $vectorSearch: {
                index: 'vector_index',
                path: 'embedding',
                queryVector: fakeEmbedding,
                numCandidates: 200,
                limit: 20,
            },
        });
    });

    it('places a $match on session-derived tenantId immediately after $vectorSearch', async () => {
        await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);

        const pipeline = mockAggregate.mock.calls[0][0];
        expect(pipeline[1]).toEqual({
            $match: { tenantId: new ObjectId(TENANT_A) },
        });
    });

    it('the $match casts the tenantId string to a real ObjectId (not a string)', async () => {
        await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);

        const pipeline = mockAggregate.mock.calls[0][0];
        const tenantFilter = pipeline[1].$match.tenantId;
        expect(tenantFilter).toBeInstanceOf(ObjectId);
        expect(tenantFilter.toString()).toBe(TENANT_A);
    });

    it('IGNORES body-supplied tenantId — uses session tenant only', async () => {
        // A malicious caller tries to probe tenant B by sending it in the body.
        await POST(
            makeRequest({ queryEmbedding: fakeEmbedding, tenantId: TENANT_B }) as any
        );

        const pipeline = mockAggregate.mock.calls[0][0];
        // Filter must still be session tenant (A), not body tenant (B)
        expect(pipeline[1].$match.tenantId.toString()).toBe(TENANT_A);
        expect(pipeline[1].$match.tenantId.toString()).not.toBe(TENANT_B);
    });

    it('returns the aggregate results', async () => {
        const res = await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            results: [{ _id: 'issue-1', title: 'Match', score: 0.91 }],
        });
    });

    it('returns 500 if the aggregate throws', async () => {
        mockToArray.mockRejectedValueOnce(new Error('mongo died'));

        const res = await POST(makeRequest({ queryEmbedding: fakeEmbedding }) as any);

        expect(res.status).toBe(500);
        expect((await res.json()).error).toMatch(/Vector search failed/);
    });
});
