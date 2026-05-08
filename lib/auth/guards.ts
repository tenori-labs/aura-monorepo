import { canAccessFacultyRoutes, getUserRole, isAdmin, type UserRole } from '@/lib/roles';
import { getCurrentUser, type AppUser } from './server';

export interface AuthError {
  error: string;
}

/**
 * Server-action friendly: returns either the user OR an `{ error }` object
 * suitable to forward back to the caller. Never redirects.
 */
export async function authorizeUser(): Promise<{ user: AppUser } | AuthError> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  return { user };
}

/**
 * Faculty OR admin. Mirrors the old `canAccessFacultyRoutes` check.
 */
export async function authorizeFaculty(): Promise<{ user: AppUser } | AuthError> {
  const result = await authorizeUser();
  if ('error' in result) return result;
  if (!canAccessFacultyRoutes(result.user)) return { error: 'Unauthorized' };
  return result;
}

/**
 * Admin only.
 */
export async function authorizeAdmin(): Promise<{ user: AppUser } | AuthError> {
  const result = await authorizeUser();
  if ('error' in result) return result;
  if (!isAdmin(result.user)) return { error: 'Unauthorized' };
  return result;
}

/** Convenience predicate. */
export async function currentUserHasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? getUserRole(user) === role : false;
}
