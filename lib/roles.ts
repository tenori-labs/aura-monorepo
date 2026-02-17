export type UserRole = "student" | "faculty" | "admin";

/** Routes only accessible by admins */
export const ADMIN_ONLY_ROUTES = ["/admin-dashboard"];

/** Routes accessible by faculty AND admins (but not students) */
export const FACULTY_ROUTES = ["/faculty-dashboard"];

/** Routes accessible by all authenticated users */
export const SHARED_ROUTES = [
    "/dashboard",
    "/report-incident",
    "/well-being",
    "/consent-form",
    "/charts",
];

/** All protected routes (require login) */
export const ALL_PROTECTED_ROUTES = [
    ...SHARED_ROUTES,
    ...FACULTY_ROUTES,
    ...ADMIN_ONLY_ROUTES,
];

/**
 * Extract role from Supabase user object.
 * Reads from `app_metadata.role` (tamper-proof, set by DB trigger).
 * Falls back to "student" if not set.
 */
export function getUserRole(user: { app_metadata?: Record<string, unknown> } | null): UserRole {
    const role = user?.app_metadata?.role;
    if (role === "admin") return "admin";
    if (role === "faculty") return "faculty";
    return "student";
}

/** Check if user has faculty role (excludes admin — use canAccessFacultyRoutes for route checks) */
export function isFaculty(user: { app_metadata?: Record<string, unknown> } | null): boolean {
    return getUserRole(user) === "faculty";
}

/** Check if user has admin role */
export function isAdmin(user: { app_metadata?: Record<string, unknown> } | null): boolean {
    return getUserRole(user) === "admin";
}

/**
 * Admins are a superset of faculty — they can access faculty routes too.
 * Use this for route-level access checks instead of isFaculty().
 */
export function canAccessFacultyRoutes(user: { app_metadata?: Record<string, unknown> } | null): boolean {
    const role = getUserRole(user);
    return role === "faculty" || role === "admin";
}

/** Returns the correct post-login redirect path for a given role */
export function getDashboardPath(user: { app_metadata?: Record<string, unknown> } | null): string {
    const role = getUserRole(user);
    if (role === "admin") return "/admin-dashboard";
    if (role === "faculty") return "/faculty-dashboard";
    return "/dashboard";
}
