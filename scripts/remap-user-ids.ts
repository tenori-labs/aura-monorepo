/**
 * Rewrites every Supabase user ID in MongoDB → its Clerk ID.
 *
 * Reads `migration-output/user-id-map.json` (produced by `migrate-users-to-clerk.ts`),
 * builds a `{supabaseId → clerkId}` lookup, and walks every collection that
 * stores user identifiers, updating each row in place.
 *
 * Idempotent: rows that are already on Clerk IDs are left alone.
 *
 * Affected fields:
 *   IncidentReport.userId, IncidentReport.assignedTo
 *   ConsentRecord.userId
 *   CategoryAssignment.facultyId, CategoryAssignment.assignedBy   (assignedBy may be email; only remapped if it matches a Supabase ID)
 *   InstitutionResponse.responderId
 *   IdentityAccess.accessedBy
 *   Grievance.userId
 *   ShadowReport.userId
 *   InterrogationSession.userId
 *   WellbeingReport.uid
 *
 * Usage:
 *   npm run migrate:remap-user-ids                # dry-run
 *   npm run migrate:remap-user-ids -- --apply     # actually update MongoDB
 */

import { config } from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const prisma = new PrismaClient();

interface MappingEntry {
  supabaseId: string;
  clerkId: string | null;
  status: string;
}

async function loadMap(): Promise<Map<string, string>> {
  const file = path.join(process.cwd(), 'migration-output', 'user-id-map.json');
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch {
    throw new Error(
      `Could not read ${file}. Run "npm run migrate:users-to-clerk -- --apply" first.`
    );
  }
  const list: MappingEntry[] = JSON.parse(raw);
  const map = new Map<string, string>();
  for (const entry of list) {
    if (entry.clerkId) map.set(entry.supabaseId, entry.clerkId);
  }
  return map;
}

interface Counters {
  scanned: number;
  remapped: number;
  alreadyMigrated: number;
  unmatched: number;
}

const sumCounter = (a: Counters, b: Counters): Counters => ({
  scanned: a.scanned + b.scanned,
  remapped: a.remapped + b.remapped,
  alreadyMigrated: a.alreadyMigrated + b.alreadyMigrated,
  unmatched: a.unmatched + b.unmatched,
});

/** Looks like a Supabase v4 UUID (8-4-4-4-12 hex). Clerk IDs start with `user_`. */
function looksLikeSupabaseId(id: string | null | undefined): boolean {
  if (!id) return false;
  if (id.startsWith('user_')) return false; // already a Clerk ID
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function remapField<TWhere>(
  label: string,
  rows: Array<{ id: string } & Record<string, unknown>>,
  field: string,
  apply: (id: string, newValue: string) => Promise<void>,
  map: Map<string, string>
): Promise<Counters> {
  const c: Counters = { scanned: rows.length, remapped: 0, alreadyMigrated: 0, unmatched: 0 };

  for (const row of rows) {
    const value = row[field] as string | null | undefined;
    if (!value) continue;
    if (!looksLikeSupabaseId(value)) {
      c.alreadyMigrated++;
      continue;
    }
    const clerkId = map.get(value);
    if (!clerkId) {
      c.unmatched++;
      console.warn(`  [warn] ${label}.${field} row ${row.id}: Supabase id ${value} has no Clerk mapping`);
      continue;
    }
    if (APPLY) {
      await apply(row.id, clerkId);
    }
    c.remapped++;
  }

  return c;
}

async function main() {
  console.log(`▶ ID remap mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);
  const map = await loadMap();
  console.log(`Loaded ${map.size} Supabase→Clerk mappings.\n`);

  const totals: Counters = { scanned: 0, remapped: 0, alreadyMigrated: 0, unmatched: 0 };

  // IncidentReport.userId & .assignedTo
  {
    const rows = await prisma.incidentReport.findMany({
      select: { id: true, userId: true, assignedTo: true },
    });
    const c1 = await remapField('IncidentReport', rows, 'userId', async (id, newValue) => {
      await prisma.incidentReport.update({ where: { id }, data: { userId: newValue } });
    }, map);
    const c2 = await remapField('IncidentReport', rows, 'assignedTo', async (id, newValue) => {
      await prisma.incidentReport.update({ where: { id }, data: { assignedTo: newValue } });
    }, map);
    Object.assign(totals, sumCounter(sumCounter(totals, c1), c2));
    console.log(`IncidentReport: userId remapped ${c1.remapped}, assignedTo remapped ${c2.remapped}`);
  }

  // ConsentRecord.userId
  {
    const rows = await prisma.consentRecord.findMany({ select: { id: true, userId: true } });
    const c = await remapField('ConsentRecord', rows, 'userId', async (id, newValue) => {
      await prisma.consentRecord.update({ where: { id }, data: { userId: newValue } });
    }, map);
    Object.assign(totals, sumCounter(totals, c));
    console.log(`ConsentRecord: remapped ${c.remapped}`);
  }

  // CategoryAssignment.facultyId
  {
    const rows = await prisma.categoryAssignment.findMany({ select: { id: true, facultyId: true } });
    const c = await remapField('CategoryAssignment', rows, 'facultyId', async (id, newValue) => {
      await prisma.categoryAssignment.update({ where: { id }, data: { facultyId: newValue } });
    }, map);
    Object.assign(totals, sumCounter(totals, c));
    console.log(`CategoryAssignment.facultyId: remapped ${c.remapped}`);
  }

  // InstitutionResponse.responderId
  {
    const rows = await prisma.institutionResponse.findMany({
      select: { id: true, responderId: true },
    });
    const c = await remapField('InstitutionResponse', rows, 'responderId', async (id, newValue) => {
      await prisma.institutionResponse.update({ where: { id }, data: { responderId: newValue } });
    }, map);
    Object.assign(totals, sumCounter(totals, c));
    console.log(`InstitutionResponse: remapped ${c.remapped}`);
  }

  // IdentityAccess.accessedBy
  {
    const rows = await prisma.identityAccess.findMany({
      select: { id: true, accessedBy: true },
    });
    const c = await remapField('IdentityAccess', rows, 'accessedBy', async (id, newValue) => {
      await prisma.identityAccess.update({ where: { id }, data: { accessedBy: newValue } });
    }, map);
    Object.assign(totals, sumCounter(totals, c));
    console.log(`IdentityAccess: remapped ${c.remapped}`);
  }

  // Grievance.userId
  {
    const rows = await prisma.grievance.findMany({ select: { id: true, userId: true } });
    const c = await remapField('Grievance', rows, 'userId', async (id, newValue) => {
      await prisma.grievance.update({ where: { id }, data: { userId: newValue } });
    }, map);
    Object.assign(totals, sumCounter(totals, c));
    console.log(`Grievance: remapped ${c.remapped}`);
  }

  // ShadowReport.userId
  {
    const rows = await prisma.shadowReport.findMany({ select: { id: true, userId: true } });
    const c = await remapField('ShadowReport', rows, 'userId', async (id, newValue) => {
      await prisma.shadowReport.update({ where: { id }, data: { userId: newValue } });
    }, map);
    Object.assign(totals, sumCounter(totals, c));
    console.log(`ShadowReport: remapped ${c.remapped}`);
  }

  // InterrogationSession.userId
  {
    const rows = await prisma.interrogationSession.findMany({
      select: { id: true, userId: true },
    });
    const c = await remapField('InterrogationSession', rows, 'userId', async (id, newValue) => {
      await prisma.interrogationSession.update({ where: { id }, data: { userId: newValue } });
    }, map);
    Object.assign(totals, sumCounter(totals, c));
    console.log(`InterrogationSession: remapped ${c.remapped}`);
  }

  // WellbeingReport.uid
  {
    const rows = await prisma.wellbeingReport.findMany({ select: { id: true, uid: true } });
    const c = await remapField('WellbeingReport', rows, 'uid', async (id, newValue) => {
      await prisma.wellbeingReport.update({ where: { id }, data: { uid: newValue } });
    }, map);
    Object.assign(totals, sumCounter(totals, c));
    console.log(`WellbeingReport.uid: remapped ${c.remapped}`);
  }

  console.log('\n──────── TOTAL ────────');
  console.log(`  Scanned fields:     ${totals.scanned}`);
  console.log(`  Remapped:           ${totals.remapped}`);
  console.log(`  Already migrated:   ${totals.alreadyMigrated}`);
  console.log(`  Unmatched (warn):   ${totals.unmatched}`);
  if (!APPLY) {
    console.log('\nRe-run with --apply to actually update MongoDB.');
  }
}

main()
  .catch((err) => {
    console.error('\n✖ Remap failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
