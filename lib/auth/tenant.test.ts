/**
 * @file Tests for lib/auth/tenant.ts
 *
 * Verifies the tenant resolver — it must:
 *   1. Read tenantId from Clerk publicMetadata when present
 *   2. Fall back to the default tenant (subdomain='default') when not
 *   3. Return null for unauthenticated users (no tenant probing)
 *   4. requireCurrentUserTenantId() throws on null
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mocks must be declared before the module under test is imported.
jest.mock('@/lib/auth/server', () => ({
    getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        tenant: {
            findUnique: jest.fn(),
        },
    },
}));

// React's `cache()` memoizes per-request — in Node tests there's no request
// boundary, so each test would get the prior test's cached result. Replace
// with an identity passthrough so mocks behave per-test.
jest.mock('react', () => ({
    cache: (fn: any) => fn,
}));

import { getCurrentUser } from '@/lib/auth/server';
import prisma from '@/lib/db';
import { getCurrentUserTenantId, requireCurrentUserTenantId } from './tenant';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockTenantFindUnique = (prisma as any).tenant.findUnique as jest.Mock;

beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockTenantFindUnique.mockReset();
});

// ─── getCurrentUserTenantId ──────────────────────────────────────────

describe('getCurrentUserTenantId', () => {
    it('returns tenantId from publicMetadata when present', async () => {
        mockGetCurrentUser.mockResolvedValueOnce({
            id: 'user_1',
            email: 'a@x.com',
            fullName: 'A',
            imageUrl: null,
            role: 'student',
            publicMetadata: { tenantId: 'tenant-from-meta' },
        });

        const result = await getCurrentUserTenantId();

        expect(result).toBe('tenant-from-meta');
        // Default tenant should NOT be queried when metadata is set
        expect(mockTenantFindUnique).not.toHaveBeenCalled();
    });

    it('falls back to default tenant when metadata is absent', async () => {
        mockGetCurrentUser.mockResolvedValueOnce({
            id: 'user_2',
            email: 'b@x.com',
            fullName: 'B',
            imageUrl: null,
            role: 'student',
            publicMetadata: {},
        });
        mockTenantFindUnique.mockResolvedValueOnce({ id: 'default-tenant-id' });

        const result = await getCurrentUserTenantId();

        expect(result).toBe('default-tenant-id');
        expect(mockTenantFindUnique).toHaveBeenCalledWith({
            where: { subdomain: 'default' },
            select: { id: true },
        });
    });

    it('falls back to default tenant when metadata.tenantId is empty string', async () => {
        mockGetCurrentUser.mockResolvedValueOnce({
            id: 'user_3',
            email: 'c@x.com',
            fullName: 'C',
            imageUrl: null,
            role: 'student',
            publicMetadata: { tenantId: '' },
        });
        mockTenantFindUnique.mockResolvedValueOnce({ id: 'default-tenant-id' });

        const result = await getCurrentUserTenantId();

        expect(result).toBe('default-tenant-id');
    });

    it('falls back to default tenant when metadata.tenantId is wrong type', async () => {
        mockGetCurrentUser.mockResolvedValueOnce({
            id: 'user_4',
            email: 'd@x.com',
            fullName: 'D',
            imageUrl: null,
            role: 'student',
            // Non-string — could happen with bad data shape
            publicMetadata: { tenantId: 12345 as any },
        });
        mockTenantFindUnique.mockResolvedValueOnce({ id: 'default-tenant-id' });

        const result = await getCurrentUserTenantId();

        expect(result).toBe('default-tenant-id');
    });

    it('returns null when not signed in', async () => {
        mockGetCurrentUser.mockResolvedValueOnce(null);

        const result = await getCurrentUserTenantId();

        expect(result).toBeNull();
        expect(mockTenantFindUnique).not.toHaveBeenCalled();
    });

    it('returns null when default tenant lookup misses (no default seeded)', async () => {
        mockGetCurrentUser.mockResolvedValueOnce({
            id: 'user_5',
            email: 'e@x.com',
            fullName: 'E',
            imageUrl: null,
            role: 'student',
            publicMetadata: {},
        });
        mockTenantFindUnique.mockResolvedValueOnce(null);

        const result = await getCurrentUserTenantId();

        expect(result).toBeNull();
    });
});

// ─── requireCurrentUserTenantId ──────────────────────────────────────

describe('requireCurrentUserTenantId', () => {
    it('returns the resolved tenantId on success', async () => {
        mockGetCurrentUser.mockResolvedValueOnce({
            id: 'user_6',
            email: 'f@x.com',
            fullName: 'F',
            imageUrl: null,
            role: 'student',
            publicMetadata: { tenantId: 't-1' },
        });

        await expect(requireCurrentUserTenantId()).resolves.toBe('t-1');
    });

    it('throws when no user is signed in', async () => {
        mockGetCurrentUser.mockResolvedValueOnce(null);

        await expect(requireCurrentUserTenantId()).rejects.toThrow(
            /No tenant resolved/
        );
    });

    it('throws when default tenant is missing', async () => {
        mockGetCurrentUser.mockResolvedValueOnce({
            id: 'user_7',
            email: 'g@x.com',
            fullName: 'G',
            imageUrl: null,
            role: 'student',
            publicMetadata: {},
        });
        mockTenantFindUnique.mockResolvedValueOnce(null);

        await expect(requireCurrentUserTenantId()).rejects.toThrow(
            /No tenant resolved/
        );
    });
});
