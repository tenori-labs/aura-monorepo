import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getTenant } from '../_actions';
import { TenantConsole } from './TenantConsole';

/**
 * Server-component shell — fetches the tenant + a small bundle of
 * tenant-scoped metadata (SLA, counts) once on load, then hands off to
 * the client `TenantConsole` for the editable 7-tab UI.
 */
export default async function TenantConsolePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const result = await getTenant(tenantId);
  if ('error' in result) redirect('/console');

  // Sidecar data — cheap reads we can do up front so each tab doesn't
  // have to fetch its own.
  const [sla, wellbeingCount, incidentCount, categoryAssignments] = await Promise.all([
    prisma.slaConfig.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    prisma.wellbeingReport.count({ where: { tenantId } }),
    prisma.incidentReport.count({ where: { tenantId } }),
    prisma.categoryAssignment.findMany({ where: { tenantId } }),
  ]);

  return (
    <TenantConsole
      tenant={result.tenant}
      sla={
        sla
          ? {
              id: sla.id,
              acknowledgeWithinHours: sla.acknowledgeWithinHours,
              investigateWithinHours: sla.investigateWithinHours,
              resolveWithinHours: sla.resolveWithinHours,
            }
          : null
      }
      counts={{ wellbeingReports: wellbeingCount, incidents: incidentCount }}
      categoryAssignments={categoryAssignments.map((c) => ({
        id: c.id,
        category: c.category,
        facultyId: c.facultyId,
        facultyEmail: c.facultyEmail,
      }))}
    />
  );
}
