'use server';

import prisma from '@/lib/db';
import { authorizeFaculty } from '@/lib/auth/guards';
import {
  isValidStatus,
  isValidTransition,
  normalizeLegacyStatus,
  VALID_STATUSES,
} from './incident-validation';

/**
 * Updates the status of an incident report, enforcing sequential transitions.
 * Sets the corresponding stage timestamp automatically.
 */
export async function updateIncidentStatus(incidentId: string, newStatus: string) {
  const auth = await authorizeFaculty();
  if ('error' in auth) return auth;

  if (!isValidStatus(newStatus)) {
    return { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` };
  }

  const incident = await prisma.incidentReport.findUnique({
    where: { id: incidentId },
    select: { status: true },
  });
  if (!incident) {
    return { error: 'Incident not found.' };
  }

  const currentStatus = normalizeLegacyStatus(incident.status);

  // No-op if already there.
  if (currentStatus === newStatus) {
    return { success: true };
  }

  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      error: `Cannot transition from "${currentStatus}" to "${newStatus}". Stages must progress in order: submitted → acknowledged → investigating → resolved.`,
    };
  }

  const now = new Date();
  const stampField =
    newStatus === 'acknowledged'
      ? { acknowledgedAt: now }
      : newStatus === 'investigating'
        ? { investigatingAt: now }
        : newStatus === 'resolved'
          ? { resolvedAt: now }
          : {};

  try {
    await prisma.incidentReport.update({
      where: { id: incidentId },
      data: { status: newStatus, ...stampField },
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to update incident status:', err);
    return { error: 'Failed to update status.' };
  }
}

/**
 * Convenience action — moves a `submitted` incident to `acknowledged`.
 */
export async function acknowledgeIncident(incidentId: string) {
  return updateIncidentStatus(incidentId, 'acknowledged');
}

/**
 * Convenience action — moves an `acknowledged` incident to `investigating`.
 */
export async function startInvestigation(incidentId: string) {
  return updateIncidentStatus(incidentId, 'investigating');
}

/**
 * Convenience action — moves an `investigating` incident to `resolved`.
 */
export async function resolveIncident(incidentId: string) {
  return updateIncidentStatus(incidentId, 'resolved');
}

/**
 * Updates faculty notes on an incident report.
 */
export async function updateIncidentNotes(incidentId: string, notes: string) {
  const auth = await authorizeFaculty();
  if ('error' in auth) return auth;

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
