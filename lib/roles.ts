export type UserRole = 'student' | 'faculty' | 'admin';

/** Routes only accessible by admins */
export const ADMIN_ONLY_ROUTES = Object.freeze(['/admin-dashboard', '/wellbeing', '/shadow']);

/** Routes accessible by faculty AND admins (but not students) */
export const FACULTY_ROUTES = Object.freeze(['/faculty-dashboard']);

/** Routes accessible by all authenticated users */
export const SHARED_ROUTES = Object.freeze([
  '/dashboard',
  '/report-incident',
  '/ai-assistant',
  '/consent-form',
  '/charts',
  '/bulletin',
  '/shadow/chat',
]);

/** All protected routes (require login) */
export const ALL_PROTECTED_ROUTES = [...SHARED_ROUTES, ...FACULTY_ROUTES, ...ADMIN_ONLY_ROUTES];

/**
 * Extracts the user role from a Supabase user object's app_metadata.
 * Relies on tamper-proof metadata set by backend database triggers.
 *
 * @param user - Supabase auth user object containing app_metadata
 * @returns The user's role ("admin" | "faculty" | "student"), falling back to "student" if unset
 */
export function getUserRole(user: { app_metadata?: Record<string, unknown> } | null): UserRole {
  const role = user?.app_metadata?.role;
  if (role === 'admin') return 'admin';
  if (role === 'faculty') return 'faculty';
  return 'student';
}

/**
 * Checks specifically if an authenticated user holds the strict "faculty" role.
 * Does not include admins. For broad route access checks, use `canAccessFacultyRoutes`.
 *
 * @param user - Supabase auth user object containing app_metadata
 * @returns true if the user's role is exactly 'faculty', false otherwise
 */
export function isFaculty(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  return getUserRole(user) === 'faculty';
}

/**
 * Checks specifically if an authenticated user holds the strict "admin" role.
 *
 * @param user - Supabase auth user object containing app_metadata
 * @returns true if the user's role is exactly 'admin', false otherwise
 */
export function isAdmin(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  return getUserRole(user) === 'admin';
}

/**
 * Determines if a user has sufficient privileges to access faculty-level routes.
 * Admins are treated as a superset of faculty and inherently pass this check.
 *
 * @param user - Supabase auth user object containing app_metadata
 * @returns true if the user is 'faculty' or 'admin', false otherwise
 */
export function canAccessFacultyRoutes(
  user: { app_metadata?: Record<string, unknown> } | null
): boolean {
  const role = getUserRole(user);
  return role === 'faculty' || role === 'admin';
}

/**
 * Resolves the appropriate post-login dashboard redirect path based on user role.
 *
 * @param user - Supabase auth user object containing app_metadata
 * @returns The absolute URL path string corresponding to the user's dashboard
 */
export function getDashboardPath(user: { app_metadata?: Record<string, unknown> } | null): string {
  const role = getUserRole(user);
  if (role === 'admin') return '/admin-dashboard';
  if (role === 'faculty') return '/faculty-dashboard';
  return '/dashboard';
}
