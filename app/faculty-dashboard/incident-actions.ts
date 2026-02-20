'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { canAccessFacultyRoutes } from '@/lib/roles';
import { isValidStatus, VALID_STATUSES } from './incident-validation';

/**
 * Updates the status of an incident report.
 * Requires faculty/admin authorization and performs a database update.
 *
 * @param incidentId - Unique ID of the incident report
 * @param newStatus - New status ("pending" | "reviewing" | "closed")
 * @returns { success: true } if update succeeds, or { error: string } if unauthorized, invalid status, or DB failure occurs
 */
export async function updateIncidentStatus(incidentId: string, newStatus: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessFacultyRoutes(user)) {
    return { error: 'Unauthorized' };
  }

  if (!isValidStatus(newStatus)) {
    return { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` };
  }

  try {
    await prisma.incidentReport.update({
      where: { id: incidentId },
      data: { status: newStatus },
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to update incident status:', err);
    return { error: 'Failed to update status.' };
  }
}

/**
 * Updates faculty notes on an incident report.
 * Requires faculty/admin authorization and performs a database update.
 *
 * @param incidentId - Unique ID of the incident report
 * @param notes - Faculty notes to attach to the incident for review tracking
 * @returns { success: true } if update succeeds, or { error: string } if unauthorized or DB failure occurs
 */
export async function updateIncidentNotes(incidentId: string, notes: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canAccessFacultyRoutes(user)) {
    return { error: 'Unauthorized' };
  }

  try {
    await prisma.incidentReport.update({
      where: { id: incidentId },
      data: { facultyNotes: notes },
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to update incident notes:', err);
    return { error: 'Failed to save notes.' };
  }
}
