'use server';

import prisma from '@/lib/db';
import { authorizeAdmin } from '@/lib/auth/guards';
import { isValidCategory, INCIDENT_CATEGORIES } from './admin-validation';
import { DEFAULT_SLA, type SlaConfig } from '@/lib/sla';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Retrieves all 6 incident categories along with their currently assigned faculty.
 */
export async function getCategoryAssignments() {
  const auth = await authorizeAdmin();
  if ('error' in auth) return auth;

  const assignments = await prisma.categoryAssignment.findMany();

  const assignmentMap = new Map(
    assignments.map(
      (a: {
        category: string;
        facultyId: string;
        facultyEmail: string;
        assignedBy: string | null;
      }) => [a.category, a]
    )
  );

  const categories = INCIDENT_CATEGORIES.map((category) => {
    const assignment = assignmentMap.get(category);
    return {
      category,
      facultyId: assignment?.facultyId ?? null,
      facultyEmail: assignment?.facultyEmail ?? null,
      assignedBy: assignment?.assignedBy ?? null,
    };
  });

  return { categories };
}

/**
 * Assigns a faculty member to handle a category.
 */
export async function assignCategory(category: string, facultyId: string, facultyName: string) {
  const auth = await authorizeAdmin();
  if ('error' in auth) return auth;
  const { user } = auth;

  if (!isValidCategory(category)) {
    return { error: 'Invalid category' };
  }

  await prisma.categoryAssignment.upsert({
    where: { category },
    update: {
      facultyId,
      facultyEmail: facultyName,
      assignedBy: user.email ?? user.id,
    },
    create: {
      category,
      facultyId,
      facultyEmail: facultyName,
      assignedBy: user.email ?? user.id,
    },
  });

  return { success: true };
}

/**
 * Unassigns a faculty member from a category.
 */
export async function removeAssignment(category: string) {
  const auth = await authorizeAdmin();
  if ('error' in auth) return auth;

  try {
    const assignment = await prisma.categoryAssignment.findUnique({
      where: { category },
    });

    await prisma.categoryAssignment.delete({
      where: { category },
    });

    if (assignment) {
      await prisma.incidentReport.updateMany({
        where: {
          incidentType: category,
          assignedTo: assignment.facultyId,
          status: 'submitted',
        },
        data: {
          assignedTo: null,
          assignedToEmail: null,
          status: 'submitted',
        },
      });
    }
  } catch {
    // Assignment didn't exist, that's fine
  }

  return { success: true };
}

/**
 * Lists Clerk users whose `publicMetadata.role` is exactly `faculty`.
 *
 * Used by the admin dashboard's category-assignment dropdown. Admins are
 * deliberately EXCLUDED — incidents in a category should be triaged by
 * faculty, not by admins (who oversee the whole system).
 */
export async function getFacultyUsers() {
  const auth = await authorizeAdmin();
  if ('error' in auth) return { error: auth.error, users: [] };

  try {
    const client = await clerkClient();
    const allUsers: Array<{ id: string; name: string; role: string }> = [];

    // Page through all Clerk users (max 500 per page).
    let offset = 0;
    const limit = 500;
    // Hard safety cap so we don't loop forever on giant orgs.
    const maxIterations = 20;

    for (let i = 0; i < maxIterations; i++) {
      const { data: users, totalCount } = await client.users.getUserList({
        limit,
        offset,
        orderBy: '-created_at',
      });

      for (const u of users) {
        const role = (u.publicMetadata?.role as string | undefined) ?? null;
        if (role !== 'faculty') continue;
        const fullName =
          [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
          u.username ||
          u.emailAddresses[0]?.emailAddress ||
          'Unknown';
        allUsers.push({ id: u.id, name: fullName, role });
      }

      offset += users.length;
      if (users.length < limit || offset >= totalCount) break;
    }

    return { users: allUsers };
  } catch (error) {
    console.error('Failed to fetch faculty users from Clerk:', error);
    return { error: 'Failed to fetch faculty users', users: [] };
  }
}

// ─── SLA Configuration ───────────────────────────────────────────────

/**
 * Fetches the global SLA configuration. Anyone authenticated can read it.
 */
export async function getSlaConfig(): Promise<{ sla: SlaConfig }> {
  const record = await prisma.slaConfig.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!record) {
    return { sla: DEFAULT_SLA };
  }

  return {
    sla: {
      acknowledgeWithinHours: record.acknowledgeWithinHours,
      investigateWithinHours: record.investigateWithinHours,
      resolveWithinHours: record.resolveWithinHours,
    },
  };
}

/**
 * Updates the global SLA configuration. Admin-only.
 */
export async function updateSlaConfig(input: {
  acknowledgeWithinHours: number;
  investigateWithinHours: number;
  resolveWithinHours: number;
}) {
  const auth = await authorizeAdmin();
  if ('error' in auth) return auth;
  const { user } = auth;

  const { acknowledgeWithinHours, investigateWithinHours, resolveWithinHours } = input;

  if (
    !Number.isFinite(acknowledgeWithinHours) ||
    !Number.isFinite(investigateWithinHours) ||
    !Number.isFinite(resolveWithinHours) ||
    acknowledgeWithinHours <= 0 ||
    investigateWithinHours <= 0 ||
    resolveWithinHours <= 0
  ) {
    return { error: 'All SLA durations must be positive integers (hours).' };
  }

  const existing = await prisma.slaConfig.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  try {
    if (existing) {
      await prisma.slaConfig.update({
        where: { id: existing.id },
        data: {
          acknowledgeWithinHours: Math.round(acknowledgeWithinHours),
          investigateWithinHours: Math.round(investigateWithinHours),
          resolveWithinHours: Math.round(resolveWithinHours),
          updatedBy: user.email ?? user.id,
        },
      });
    } else {
      await prisma.slaConfig.create({
        data: {
          acknowledgeWithinHours: Math.round(acknowledgeWithinHours),
          investigateWithinHours: Math.round(investigateWithinHours),
          resolveWithinHours: Math.round(resolveWithinHours),
          updatedBy: user.email ?? user.id,
        },
      });
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to update SLA config:', err);
    return { error: 'Failed to save SLA configuration.' };
  }
}
