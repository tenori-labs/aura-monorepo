/**
 * Supabase → Clerk user migration.
 *
 * For every user that exists in Supabase but NOT in Clerk:
 *   1. Create a Clerk user with the same email
 *   2. Copy `user_metadata.role` (or `app_metadata.role`) into Clerk `publicMetadata.role`
 *   3. Store the original Supabase user ID as Clerk `externalId` so we can map them later
 *   4. Write the mapping `{supabaseId, clerkId, email, role}` to `migration-output/user-id-map.json`
 *
 * Passwords are NOT transferred — Clerk doesn't accept Supabase's password hashes.
 * Migrated users will have to use the "forgot password" flow on first sign-in.
 *
 * Usage:
 *   npm run migrate:users-to-clerk            # dry-run
 *   npm run migrate:users-to-clerk -- --apply # actually create Clerk users
 *
 * Required env vars (in .env.local):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY  (must be set manually before running — service role only,
 *                                 NOT the anon key. Get from the Supabase dashboard.)
 *   - CLERK_SECRET_KEY
 */

import { config } from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { createClerkClient } from '@clerk/backend';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('  The service-role key is required to list Supabase users via the admin API.');
  console.error('  Get it from: https://supabase.com/dashboard/project/_/settings/api');
  process.exit(1);
}

if (!CLERK_SECRET_KEY) {
  console.error('✖ Missing CLERK_SECRET_KEY in .env.local');
  process.exit(1);
}

const ALLOWED_ROLES = ['student', 'faculty', 'admin'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function coerceRole(value: unknown): AllowedRole {
  if (typeof value !== 'string') return 'student';
  return (ALLOWED_ROLES as readonly string[]).includes(value)
    ? (value as AllowedRole)
    : 'student';
}

interface SupabaseUser {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown> | null;
  app_metadata: Record<string, unknown> | null;
  created_at: string;
}

interface MappingEntry {
  supabaseId: string;
  clerkId: string | null;
  email: string;
  role: AllowedRole;
  status: 'created' | 'matched-existing' | 'skipped' | 'error';
  reason?: string;
}

async function fetchAllSupabaseUsers(): Promise<SupabaseUser[]> {
  const out: SupabaseUser[] = [];
  let page = 1;
  const perPage = 1000;
  for (let i = 0; i < 100; i++) {
    const url = `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY!}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase admin API failed (${res.status}): ${body}`);
    }

    const json = (await res.json()) as { users?: SupabaseUser[] };
    const users = json.users ?? [];
    out.push(...users);
    if (users.length < perPage) break;
    page += 1;
  }
  return out;
}

async function findClerkUserByExternalId(
  clerk: ReturnType<typeof createClerkClient>,
  externalId: string
): Promise<string | null> {
  try {
    const { data } = await clerk.users.getUserList({ externalId: [externalId], limit: 1 });
    return data[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function findClerkUserByEmail(
  clerk: ReturnType<typeof createClerkClient>,
  email: string
): Promise<string | null> {
  try {
    const { data } = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
    return data[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY! });

  console.log(`▶ Migration mode: ${APPLY ? 'APPLY (live writes to Clerk)' : 'DRY-RUN (no writes)'}\n`);

  const supabaseUsers = await fetchAllSupabaseUsers();
  console.log(`Fetched ${supabaseUsers.length} users from Supabase.\n`);

  const mapping: MappingEntry[] = [];
  const counters = {
    created: 0,
    matchedExisting: 0,
    skipped: 0,
    error: 0,
  };

  for (const u of supabaseUsers) {
    const email = u.email?.trim().toLowerCase();
    if (!email) {
      mapping.push({
        supabaseId: u.id,
        clerkId: null,
        email: '',
        role: 'student',
        status: 'skipped',
        reason: 'no email',
      });
      counters.skipped++;
      continue;
    }

    // Prefer app_metadata.role (Supabase trigger output), fall back to user_metadata.role.
    const rawRole = u.app_metadata?.role ?? u.user_metadata?.role;
    const role = coerceRole(rawRole);
    const fullName =
      (u.user_metadata?.full_name as string | undefined) ??
      (u.user_metadata?.name as string | undefined) ??
      '';
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ').trim() || undefined;

    // 1. Already migrated? (we set externalId = supabaseId)
    let existing = await findClerkUserByExternalId(clerk, u.id);
    if (existing) {
      mapping.push({
        supabaseId: u.id,
        clerkId: existing,
        email,
        role,
        status: 'matched-existing',
        reason: 'externalId match',
      });
      counters.matchedExisting++;
      continue;
    }

    // 2. Same email already in Clerk? Adopt that user (write externalId so we don't dup).
    existing = await findClerkUserByEmail(clerk, email);
    if (existing) {
      if (APPLY) {
        try {
          await clerk.users.updateUser(existing, {
            externalId: u.id,
            publicMetadata: { role },
          });
        } catch (err) {
          console.error(`  ✖ Failed to backfill externalId on ${existing}:`, err);
        }
      }
      mapping.push({
        supabaseId: u.id,
        clerkId: existing,
        email,
        role,
        status: 'matched-existing',
        reason: 'email match — backfilled externalId',
      });
      counters.matchedExisting++;
      continue;
    }

    // 3. Create a new Clerk user.
    if (!APPLY) {
      mapping.push({
        supabaseId: u.id,
        clerkId: null,
        email,
        role,
        status: 'created',
        reason: 'dry-run',
      });
      counters.created++;
      console.log(`  [dry-run] would create ${email} (role=${role})`);
      continue;
    }

    try {
      const created = await clerk.users.createUser({
        emailAddress: [email],
        firstName: firstName || undefined,
        lastName,
        externalId: u.id,
        publicMetadata: { role },
        skipPasswordRequirement: true,
        skipPasswordChecks: true,
      });
      mapping.push({
        supabaseId: u.id,
        clerkId: created.id,
        email,
        role,
        status: 'created',
      });
      counters.created++;
      console.log(`  ✓ created ${email} (role=${role}) → ${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      mapping.push({
        supabaseId: u.id,
        clerkId: null,
        email,
        role,
        status: 'error',
        reason: msg,
      });
      counters.error++;
      console.error(`  ✖ failed to create ${email}: ${msg}`);
    }
  }

  // Persist the mapping for the MongoDB ID-remap step.
  const outDir = path.join(process.cwd(), 'migration-output');
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'user-id-map.json');
  await fs.writeFile(outFile, JSON.stringify(mapping, null, 2));

  console.log('\n──────── SUMMARY ────────');
  console.log(`  Created:           ${counters.created}`);
  console.log(`  Matched existing:  ${counters.matchedExisting}`);
  console.log(`  Skipped:           ${counters.skipped}`);
  console.log(`  Errors:            ${counters.error}`);
  console.log(`  Mapping written:   ${outFile}\n`);
  if (!APPLY) {
    console.log('Re-run with --apply to actually create users in Clerk.');
  }
}

main().catch((err) => {
  console.error('\n✖ Migration failed:', err);
  process.exit(1);
});
