import { cache } from 'react';
import prisma from '@/lib/db';
import { getCurrentUser } from './server';

/**
 * Resolves the tenant ID for the currently signed-in user.
 *
 * Source of truth is Clerk `publicMetadata.tenantId`, which is set during
 * tenant onboarding (and will eventually be set automatically once we
 * adopt Clerk Organizations). For users created before multi-tenancy
 * landed, we fall back to the default tenant (subdomain='default') that
 * the backfill script seeded.
 *
 * The result is wrapped in React `cache()`, so this is effectively
 * memoized per request — callers can invoke it freely without worrying
 * about repeated DB lookups.
 *
 * Returns `null` only when no user is signed in.
 */
export const getCurrentUserTenantId = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const fromMetadata = user.publicMetadata?.tenantId;
  if (typeof fromMetadata === 'string' && fromMetadata.length > 0) {
    return fromMetadata;
  }

  // Legacy users without a stamped tenant — bind them to the default tenant.
  // Long-term, the user-creation webhook should set publicMetadata.tenantId
  // and this fallback can be retired.
  return getDefaultTenantId();
});

/**
 * Looks up the default tenant by subdomain. Memoized per request so a
 * single request that resolves the tenant for multiple users still only
 * hits the DB once.
 */
const getDefaultTenantId = cache(async (): Promise<string | null> => {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'default' },
    select: { id: true },
  });
  return tenant?.id ?? null;
});

/**
 * Same as `getCurrentUserTenantId` but throws if it can't resolve a tenant.
 * Use this in server actions / API routes that have already auth-gated.
 */
export async function requireCurrentUserTenantId(): Promise<string> {
  const tenantId = await getCurrentUserTenantId();
  if (!tenantId) {
    throw new Error('No tenant resolved for current user.');
  }
  return tenantId;
}
