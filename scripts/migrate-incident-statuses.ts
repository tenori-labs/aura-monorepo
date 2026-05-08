/**
 * Migration: legacy incident statuses → new 4-stage workflow.
 *
 *   pending   → submitted
 *   reviewing → investigating  (acknowledgedAt + investigatingAt = updatedAt)
 *   closed    → resolved        (acknowledgedAt + investigatingAt + resolvedAt = updatedAt)
 *
 * Idempotent — running twice is safe; records already on the new schema are skipped.
 *
 * Run with:
 *   npm run db:migrate-statuses
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

interface MigrationCounts {
  scanned: number;
  pendingMigrated: number;
  assignedMigrated: number;
  reviewingMigrated: number;
  closedMigrated: number;
  alreadyNew: number;
  unknownSkipped: number;
}

async function migrateIncidents(): Promise<MigrationCounts> {
  const counts: MigrationCounts = {
    scanned: 0,
    pendingMigrated: 0,
    assignedMigrated: 0,
    reviewingMigrated: 0,
    closedMigrated: 0,
    alreadyNew: 0,
    unknownSkipped: 0,
  };

  const incidents = await prisma.incidentReport.findMany({
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      acknowledgedAt: true,
      investigatingAt: true,
      resolvedAt: true,
    },
  });

  counts.scanned = incidents.length;

  for (const incident of incidents) {
    const stamp = incident.updatedAt ?? incident.createdAt ?? new Date();

    switch (incident.status) {
      case 'pending': {
        await prisma.incidentReport.update({
          where: { id: incident.id },
          data: { status: 'submitted' },
        });
        counts.pendingMigrated++;
        break;
      }

      case 'assigned': {
        // Legacy intermediate status: faculty was assigned but no action yet.
        // Treat as "acknowledged" so it shows up at the right stage.
        await prisma.incidentReport.update({
          where: { id: incident.id },
          data: {
            status: 'acknowledged',
            acknowledgedAt: incident.acknowledgedAt ?? stamp,
          },
        });
        counts.assignedMigrated++;
        break;
      }

      case 'reviewing': {
        await prisma.incidentReport.update({
          where: { id: incident.id },
          data: {
            status: 'investigating',
            acknowledgedAt: incident.acknowledgedAt ?? stamp,
            investigatingAt: incident.investigatingAt ?? stamp,
          },
        });
        counts.reviewingMigrated++;
        break;
      }

      case 'closed': {
        await prisma.incidentReport.update({
          where: { id: incident.id },
          data: {
            status: 'resolved',
            acknowledgedAt: incident.acknowledgedAt ?? stamp,
            investigatingAt: incident.investigatingAt ?? stamp,
            resolvedAt: incident.resolvedAt ?? stamp,
          },
        });
        counts.closedMigrated++;
        break;
      }

      case 'submitted':
      case 'acknowledged':
      case 'investigating':
      case 'resolved':
        counts.alreadyNew++;
        break;

      default:
        console.warn(
          `[skip] Incident ${incident.id} has unknown status "${incident.status}" — leaving as-is.`
        );
        counts.unknownSkipped++;
    }
  }

  return counts;
}

async function ensureSlaConfig(): Promise<'created' | 'exists'> {
  const existing = await prisma.slaConfig.findFirst();
  if (existing) return 'exists';

  await prisma.slaConfig.create({
    data: {
      acknowledgeWithinHours: 24,
      investigateWithinHours: 72,
      resolveWithinHours: 168,
      updatedBy: 'migration',
    },
  });
  return 'created';
}

async function main() {
  console.log('▶ Starting incident status migration...\n');

  const counts = await migrateIncidents();

  console.log('Incident migration summary:');
  console.log(`  Scanned:                ${counts.scanned}`);
  console.log(`  pending   → submitted:  ${counts.pendingMigrated}`);
  console.log(`  assigned  → acknowl.:   ${counts.assignedMigrated}`);
  console.log(`  reviewing → investig.:  ${counts.reviewingMigrated}`);
  console.log(`  closed    → resolved:   ${counts.closedMigrated}`);
  console.log(`  Already on new schema:  ${counts.alreadyNew}`);
  console.log(`  Unknown / skipped:      ${counts.unknownSkipped}\n`);

  const slaResult = await ensureSlaConfig();
  console.log(
    slaResult === 'created'
      ? '✔ Default SlaConfig created (24h / 72h / 168h).'
      : '✔ SlaConfig already exists — left untouched.'
  );

  console.log('\n✔ Migration complete.');
}

main()
  .catch((err) => {
    console.error('\n✖ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
