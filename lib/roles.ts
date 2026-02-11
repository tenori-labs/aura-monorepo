export type UserRole = "student" | "faculty";

/** Routes only accessible by faculty */
export const FACULTY_ONLY_ROUTES = ["/admin-dashboard", "/faculty-dashboard"];

/** Routes accessible by all authenticated users */
export const SHARED_ROUTES = [
    "/dashboard",
    "/report-incident",
    "/well-being",
    "/consent-form",
    "/charts",
];

/** All protected routes (require login) */
export const ALL_PROTECTED_ROUTES = [...SHARED_ROUTES, ...FACULTY_ONLY_ROUTES];

/**
 * Extract role from Supabase user object.
 * Reads from `app_metadata.role` (tamper-proof, set by DB trigger).
 * Falls back to "student" if not set.
 */
export function getUserRole(user: { app_metadata?: Record<string, unknown> } | null): UserRole {
    const role = user?.app_metadata?.role;
    if (role === "faculty") return "faculty";
    return "student";
}

/** Check if user has faculty role */
export function isFaculty(user: { app_metadata?: Record<string, unknown> } | null): boolean {
    return getUserRole(user) === "faculty";
}
