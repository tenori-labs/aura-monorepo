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
 * Minimal shape of a Clerk user used by the role helpers.
 * Accepts any object with `publicMetadata` so server-only Clerk types
 * and the simpler shapes used in tests/middleware all work.
 */
export interface RoleBearer {
  publicMetadata?: Record<string, unknown>;
}

/**
 * Extracts the user role from a Clerk user's `publicMetadata.role`.
 * `publicMetadata` is server-set and tamper-proof from the client's perspective.
 *
 * @returns The user's role ("admin" | "faculty" | "student"), defaulting to "student".
 */
export function getUserRole(user: RoleBearer | null | undefined): UserRole {
  const role = user?.publicMetadata?.role;
  if (role === 'admin') return 'admin';
  if (role === 'faculty') return 'faculty';
  return 'student';
}

/** Variant that takes the role string directly (for middleware / claims). */
export function getDashboardPathForRole(role: string | null | undefined): string {
  if (role === 'admin') return '/admin-dashboard';
  if (role === 'faculty') return '/faculty-dashboard';
  return '/dashboard';
}

/** Strict faculty check (does NOT include admin). Use `canAccessFacultyRoutes` for inclusive checks. */
export function isFaculty(user: RoleBearer | null | undefined): boolean {
  return getUserRole(user) === 'faculty';
}

/** Strict admin check. */
export function isAdmin(user: RoleBearer | null | undefined): boolean {
  return getUserRole(user) === 'admin';
}

/**
 * True if the user can access faculty-level routes. Admins are treated as a
 * superset of faculty.
 */
export function canAccessFacultyRoutes(user: RoleBearer | null | undefined): boolean {
  const role = getUserRole(user);
  return role === 'faculty' || role === 'admin';
}

/**
 * Resolves the post-login dashboard path for a user.
 */
export function getDashboardPath(user: RoleBearer | null | undefined): string {
  return getDashboardPathForRole(getUserRole(user));
}
