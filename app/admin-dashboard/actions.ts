'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/roles';
import { isValidCategory, INCIDENT_CATEGORIES } from './admin-validation';



/**
 * Retrieves all 6 incident categories along with their currently assigned faculty.
 * Requires admin authorization and performs a database read.
 *
 * @returns { categories: Array } Array of category objects mapping each category to its assigned faculty, or { error: string } if unauthorized
 */
export async function getCategoryAssignments() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const assignments = await prisma.categoryAssignment.findMany();

  // Build a map of category -> assignment
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

  // Return all categories with their assignment status
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
 * Assigns a specific faculty member to handle incident reports of a given category.
 * Requires admin authorization, validates category, and performs a database upsert.
 *
 * @param category - The incident category to assign (must be one of INCIDENT_CATEGORIES)
 * @param facultyId - Unique identifier of the faculty member
 * @param facultyName - Email or localized name of the faculty member
 * @returns { success: true } if update succeeds, or { error: string } if unauthorized or invalid category
 */
export async function assignCategory(category: string, facultyId: string, facultyName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return { error: 'Unauthorized' };
  }

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
 * Removes the currently assigned faculty member from a specific incident category.
 * Requires admin authorization. Resets assigned faculty on any pending incidents of this category.
 *
 * @param category - The incident category to unassign
 * @returns { success: true } if removal succeeds, or { error: string } if unauthorized
 */
export async function removeAssignment(category: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    // Get the current assignment so we know which faculty to un-assign
    const assignment = await prisma.categoryAssignment.findUnique({
      where: { category },
    });

    await prisma.categoryAssignment.delete({
      where: { category },
    });

    // Reset any incidents that were assigned to this faculty under this category
    if (assignment) {
      await prisma.incidentReport.updateMany({
        where: {
          incidentType: category,
          assignedTo: assignment.facultyId,
          status: 'pending', // only reset if still in "pending" stage
        },
        data: {
          assignedTo: null,
          assignedToEmail: null,
          status: 'pending',
        },
      });
    }
  } catch {
    // Assignment didn't exist, that's fine
  }

  return { success: true };
}

/**
 * Retrieves a list of all faculty users from the profiles table.
 * Requires admin authorization and performs a database read bypassing row-level security for admins.
 *
 * @returns { users: Array } Array of faculty user objects, or { error: string, users: [] } if unauthorized
 */
export async function getFacultyUsers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return { error: 'Unauthorized', users: [] };
  }

  // Query profiles table — admin RLS allows reading all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .in('role', ['faculty', 'admin']);

  if (error) {
    console.error('Failed to fetch faculty profiles:', error);
    return { error: 'Failed to fetch faculty users', users: [] };
  }

  // We need emails — get them from Supabase auth via the current session
  // Since profiles don't store email, we'll use the user ID to look them up
  // For now, show full_name and store the ID.    // Map raw profile data to User interface
  const users = (profiles ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: (p.full_name as string) || 'Unknown',
    role: p.role as string,
  }));

  return { users };
}
