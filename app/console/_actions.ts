'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import {
  CONSOLE_COOKIE_NAME,
  verifyConsoleToken,
} from '@/lib/console-auth';
import {
  CONSOLE_TENANT_FIELDS,
  serializeTenant,
  whitelistTenantPatch,
} from '@/lib/console-tenants';
import type { ConsoleTenant, ConsoleTenantListItem } from './_types';

/**
 * Verify the caller has a valid console session. The route-level middleware
 * also gates this, but each server action checks again as defense-in-depth.
 */
async function requireConsoleSession(): Promise<{ ok: true } | { error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CONSOLE_COOKIE_NAME)?.value;
  if (!verifyConsoleToken(token)) {
    return { error: 'Unauthorized' };
  }
  return { ok: true };
}

// ─── Reads ──────────────────────────────────────────────────────────

/** List every tenant for the console table. */
export async function listTenants(): Promise<
  { tenants: ConsoleTenantListItem[] } | { error: string }
> {
  const auth = await requireConsoleSession();
  if ('error' in auth) return auth;

  const rows = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      subdomain: true,
      name: true,
      status: true,
      planType: true,
      creditsRemaining: true,
      createdAt: true,
    },
  });

  return {
    tenants: rows.map((r) => ({
      id: r.id,
      subdomain: r.subdomain,
      name: r.name,
      status: r.status as ConsoleTenantListItem['status'],
      planType: r.planType as ConsoleTenantListItem['planType'],
      creditsRemaining: r.creditsRemaining,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** Fetch one tenant by ID. */
export async function getTenant(
  id: string
): Promise<{ tenant: ConsoleTenant } | { error: string }> {
  const auth = await requireConsoleSession();
  if ('error' in auth) return auth;

  const row = await prisma.tenant.findUnique({ where: { id } });
  if (!row) return { error: 'Tenant not found.' };
  return { tenant: serializeTenant(row) };
}

// ─── Writes ─────────────────────────────────────────────────────────

/**
 * Create a new tenant. Seeds a default SLA config so the tenant is
 * immediately functional. Categories are left empty until an admin
 * assigns faculty in the per-category page.
 */
export async function createTenant(input: {
  subdomain: string;
  name: string;
  planType?: 'free' | 'pro' | 'enterprise';
}): Promise<{ tenant: ConsoleTenant } | { error: string }> {
  const auth = await requireConsoleSession();
  if ('error' in auth) return auth;

  const subdomain = input.subdomain.trim().toLowerCase();
  const name = input.name.trim();
  if (!/^[a-z0-9-]{2,40}$/.test(subdomain)) {
    return {
      error:
        'Subdomain must be 2–40 chars, lowercase letters, digits, or hyphens.',
    };
  }
  if (!name) return { error: 'Name is required.' };

  // Uniqueness check (Prisma will also enforce via @unique, this gives a
  // friendlier error).
  const existing = await prisma.tenant.findUnique({ where: { subdomain } });
  if (existing) return { error: `Subdomain "${subdomain}" is already taken.` };

  try {
    const created = await prisma.tenant.create({
      data: {
        subdomain,
        name,
        planType: input.planType ?? 'free',
        createdBy: 'console',
      },
    });

    // Seed default SLA — every tenant gets one row to start.
    await prisma.slaConfig.create({
      data: {
        tenantId: created.id,
        acknowledgeWithinHours: 24,
        investigateWithinHours: 72,
        resolveWithinHours: 168,
        updatedBy: 'console',
      },
    });

    revalidatePath('/console');
    return { tenant: serializeTenant(created) };
  } catch (err) {
    console.error('[console] createTenant failed:', err);
    return { error: 'Failed to create tenant.' };
  }
}

/**
 * Patch a tenant. Body is filtered through the whitelist — unknown keys
 * are dropped silently.
 */
export async function updateTenant(
  id: string,
  patch: Record<string, unknown>
): Promise<{ tenant: ConsoleTenant } | { error: string }> {
  const auth = await requireConsoleSession();
  if ('error' in auth) return auth;

  const { patch: clean, rejected } = whitelistTenantPatch(patch);
  if (rejected.length > 0) {
    console.warn('[console] updateTenant rejected keys:', rejected);
  }
  if (Object.keys(clean).length === 0) {
    return { error: 'No valid fields to update.' };
  }

  // Subdomain uniqueness is enforced at the DB layer (@unique), but we
  // also normalize/validate it here so we can return a friendlier error.
  if (typeof clean.subdomain === 'string') {
    const s = clean.subdomain.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,40}$/.test(s)) {
      return {
        error: 'Subdomain must be 2–40 chars, lowercase letters, digits, or hyphens.',
      };
    }
    clean.subdomain = s;
  }

  try {
    const updated = await prisma.tenant.update({
      where: { id },
      data: clean as Record<(typeof CONSOLE_TENANT_FIELDS)[number], never>,
    });
    revalidatePath('/console');
    revalidatePath(`/console/${id}`);
    return { tenant: serializeTenant(updated) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[console] updateTenant failed:', msg);
    if (msg.includes('Unique constraint')) {
      return { error: 'That subdomain is already taken.' };
    }
    return { error: 'Failed to update tenant.' };
  }
}

/**
 * Add credits to a tenant. Immediate write (not part of the dirty/save
 * flow) so admins can top up urgent demos.
 */
export async function topupTenant(
  id: string,
  amount: number
): Promise<{ tenant: ConsoleTenant } | { error: string }> {
  const auth = await requireConsoleSession();
  if ('error' in auth) return auth;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Amount must be a positive number.' };
  }

  try {
    const updated = await prisma.tenant.update({
      where: { id },
      data: { creditsRemaining: { increment: Math.round(amount) } },
    });
    revalidatePath(`/console/${id}`);
    return { tenant: serializeTenant(updated) };
  } catch (err) {
    console.error('[console] topupTenant failed:', err);
    return { error: 'Failed to top up.' };
  }
}

/**
 * Delete a tenant. Confirmed in the UI by typing the subdomain. Note:
 * this leaves the tenant's incidents/reports/etc. in MongoDB (orphaned
 * data, since the tenant row is gone). Full cascade cleanup is a
 * separate, careful operation.
 */
export async function deleteTenant(
  id: string,
  confirmSubdomain: string
): Promise<{ ok: true } | { error: string }> {
  const auth = await requireConsoleSession();
  if ('error' in auth) return auth;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return { error: 'Tenant not found.' };
  if (tenant.subdomain !== confirmSubdomain.trim().toLowerCase()) {
    return { error: 'Subdomain confirmation does not match.' };
  }

  try {
    await prisma.tenant.delete({ where: { id } });
    revalidatePath('/console');
    return { ok: true };
  } catch (err) {
    console.error('[console] deleteTenant failed:', err);
    return { error: 'Failed to delete tenant.' };
  }
}
