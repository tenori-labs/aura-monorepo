/**
 * Multi-tenant backfill migration.
 *
 * Creates a "default" tenant (subdomain: "default", name: "Default Institution")
 * if one doesn't already exist, then stamps every row across the 12 affected
 * collections with that tenant's _id.
 *
 * Idempotent: rows that already have `tenantId` set are left alone, so this
 * script can be re-run safely.
 *
 * Usage:
 *   pnpm run db:migrate-multitenant            # dry-run
 *   pnpm run db:migrate-multitenant -- --apply # actually write
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const prisma = new PrismaClient();

const DEFAULT_TENANT = {
  subdomain: 'default',
  name: 'Default Institution',
  planType: 'enterprise', // give the default tenant generous defaults
  maxStudents: 100_000,
  maxFaculty: 5_000,
  creditsRemaining: 100_000,
} as const;

interface Counts {
  scanned: number;
  stamped: number;
  alreadyHadTenantId: number;
}

const empty = (): Counts => ({ scanned: 0, stamped: 0, alreadyHadTenantId: 0 });
const add = (a: Counts, b: Counts): Counts => ({
  scanned: a.scanned + b.scanned,
  stamped: a.stamped + b.stamped,
  alreadyHadTenantId: a.alreadyHadTenantId + b.alreadyHadTenantId,
});

async function getOrCreateDefaultTenant(): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.tenant.findUnique({
    where: { subdomain: DEFAULT_TENANT.subdomain },
  });
  if (existing) return { id: existing.id, created: false };

  if (!APPLY) {
    return { id: '(would-be-created)', created: true };
  }

  const created = await prisma.tenant.create({
    data: { ...DEFAULT_TENANT, createdBy: 'migration' },
  });
  return { id: created.id, created: true };
}

/**
 * Stamps every row of one collection with `tenantId` if missing.
 * Returns counts. `model` is a thin wrapper around the Prisma delegate.
 */
async function backfillCollection<TRow extends { id: string; tenantId?: string | null }>(
  label: string,
  findMany: () => Promise<TRow[]>,
  update: (id: string, tenantId: string) => Promise<void>,
  tenantId: string
): Promise<Counts> {
  const rows = await findMany();
  const counts = empty();
  counts.scanned = rows.length;

  for (const row of rows) {
    if (row.tenantId) {
      counts.alreadyHadTenantId++;
      continue;
    }
    if (APPLY) {
      await update(row.id, tenantId);
    }
    counts.stamped++;
  }

  console.log(
    `  ${label.padEnd(22)} scanned=${counts.scanned}  stamped=${counts.stamped}  already=${counts.alreadyHadTenantId}`
  );
  return counts;
}

async function main() {
  console.log(`▶ Multi-tenant backfill — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const { id: defaultTenantId, created } = await getOrCreateDefaultTenant();
  console.log(
    created
      ? `Default tenant: ${APPLY ? `created (${defaultTenantId})` : 'will be created'}`
      : `Default tenant: exists (${defaultTenantId})`
  );
  console.log(`Tenant ID used for backfill: ${defaultTenantId}\n`);
  console.log('Backfilling...');

  let total = empty();

  total = add(
    total,
    await backfillCollection(
      'IncidentReport',
      () => prisma.incidentReport.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.incidentReport.update({ where: { id }, data: { tenantId } }).then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'SlaConfig',
      () => prisma.slaConfig.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.slaConfig.update({ where: { id }, data: { tenantId } }).then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'ConsentRecord',
      () => prisma.consentRecord.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.consentRecord.update({ where: { id }, data: { tenantId } }).then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'CategoryAssignment',
      () => prisma.categoryAssignment.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.categoryAssignment
          .update({ where: { id }, data: { tenantId } })
          .then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'WellbeingReport',
      () => prisma.wellbeingReport.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.wellbeingReport.update({ where: { id }, data: { tenantId } }).then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'IdentityAccess',
      () => prisma.identityAccess.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.identityAccess.update({ where: { id }, data: { tenantId } }).then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'Grievance',
      () => prisma.grievance.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.grievance.update({ where: { id }, data: { tenantId } }).then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'CoreIssue',
      () => prisma.coreIssue.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.coreIssue.update({ where: { id }, data: { tenantId } }).then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'InstitutionResponse',
      () => prisma.institutionResponse.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.institutionResponse
          .update({ where: { id }, data: { tenantId } })
          .then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'ShadowCase',
      () => prisma.shadowCase.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.shadowCase.update({ where: { id }, data: { tenantId } }).then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'ShadowReport',
      () => prisma.shadowReport.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.shadowReport.update({ where: { id }, data: { tenantId } }).then(() => undefined),
      defaultTenantId
    )
  );

  total = add(
    total,
    await backfillCollection(
      'InterrogationSession',
      () => prisma.interrogationSession.findMany({ select: { id: true, tenantId: true } }),
      (id, tenantId) =>
        prisma.interrogationSession
          .update({ where: { id }, data: { tenantId } })
          .then(() => undefined),
      defaultTenantId
    )
  );

  console.log('\n──────── TOTAL ────────');
  console.log(`  Scanned:               ${total.scanned}`);
  console.log(`  Stamped with tenantId: ${total.stamped}`);
  console.log(`  Already had tenantId:  ${total.alreadyHadTenantId}`);
  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to actually write.');
  }
}

main()
  .catch((err) => {
    console.error('\n✖ Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
