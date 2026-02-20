import { describe, it, expect } from 'vitest';
import {
    getUserRole,
    isFaculty,
    isAdmin,
    canAccessFacultyRoutes,
    getDashboardPath,
    ADMIN_ONLY_ROUTES,
    FACULTY_ROUTES,
    SHARED_ROUTES,
    ALL_PROTECTED_ROUTES,
} from './roles';

// ─── Helper factories ───────────────────────────────────────────────

const makeUser = (role?: string) => ({
    app_metadata: role ? { role } : {},
});

// ─── getUserRole ────────────────────────────────────────────────────

describe('getUserRole', () => {
    it('returns "admin" when app_metadata.role is "admin"', () => {
        expect(getUserRole(makeUser('admin'))).toBe('admin');
    });

    it('returns "faculty" when app_metadata.role is "faculty"', () => {
        expect(getUserRole(makeUser('faculty'))).toBe('faculty');
    });

    it('returns "student" when app_metadata.role is "student"', () => {
        expect(getUserRole(makeUser('student'))).toBe('student');
    });

    it('falls back to "student" when role is not set', () => {
        expect(getUserRole(makeUser())).toBe('student');
    });

    it('falls back to "student" when user is null', () => {
        expect(getUserRole(null)).toBe('student');
    });

    it('falls back to "student" when app_metadata is undefined', () => {
        expect(getUserRole({})).toBe('student');
    });

    it('falls back to "student" for unknown role strings', () => {
        expect(getUserRole(makeUser('superadmin'))).toBe('student');
    });
});

// ─── isFaculty ──────────────────────────────────────────────────────

describe('isFaculty', () => {
    it('returns true for faculty users', () => {
        expect(isFaculty(makeUser('faculty'))).toBe(true);
    });

    it('returns false for admin users (strict check)', () => {
        expect(isFaculty(makeUser('admin'))).toBe(false);
    });

    it('returns false for student users', () => {
        expect(isFaculty(makeUser('student'))).toBe(false);
    });

    it('returns false for null user', () => {
        expect(isFaculty(null)).toBe(false);
    });
});

// ─── isAdmin ────────────────────────────────────────────────────────

describe('isAdmin', () => {
    it('returns true for admin users', () => {
        expect(isAdmin(makeUser('admin'))).toBe(true);
    });

    it('returns false for faculty users', () => {
        expect(isAdmin(makeUser('faculty'))).toBe(false);
    });

    it('returns false for student users', () => {
        expect(isAdmin(makeUser('student'))).toBe(false);
    });

    it('returns false for null user', () => {
        expect(isAdmin(null)).toBe(false);
    });
});

// ─── canAccessFacultyRoutes ─────────────────────────────────────────

describe('canAccessFacultyRoutes', () => {
    it('returns true for faculty users', () => {
        expect(canAccessFacultyRoutes(makeUser('faculty'))).toBe(true);
    });

    it('returns true for admin users (superset of faculty)', () => {
        expect(canAccessFacultyRoutes(makeUser('admin'))).toBe(true);
    });

    it('returns false for student users', () => {
        expect(canAccessFacultyRoutes(makeUser('student'))).toBe(false);
    });

    it('returns false for null user', () => {
        expect(canAccessFacultyRoutes(null)).toBe(false);
    });

    it('returns false when role is missing', () => {
        expect(canAccessFacultyRoutes(makeUser())).toBe(false);
    });
});

// ─── getDashboardPath ───────────────────────────────────────────────

describe('getDashboardPath', () => {
    it('returns /admin-dashboard for admin users', () => {
        expect(getDashboardPath(makeUser('admin'))).toBe('/admin-dashboard');
    });

    it('returns /faculty-dashboard for faculty users', () => {
        expect(getDashboardPath(makeUser('faculty'))).toBe('/faculty-dashboard');
    });

    it('returns /dashboard for student users', () => {
        expect(getDashboardPath(makeUser('student'))).toBe('/dashboard');
    });

    it('returns /dashboard for null user (fallback)', () => {
        expect(getDashboardPath(null)).toBe('/dashboard');
    });

    it('returns /dashboard for user without role metadata', () => {
        expect(getDashboardPath(makeUser())).toBe('/dashboard');
    });
});

// ─── Route constants ────────────────────────────────────────────────

describe('Route constants', () => {
    it('ALL_PROTECTED_ROUTES contains all shared, faculty, and admin routes', () => {
        const expected = [...SHARED_ROUTES, ...FACULTY_ROUTES, ...ADMIN_ONLY_ROUTES];
        expect(ALL_PROTECTED_ROUTES).toEqual(expected);
    });

    it('ADMIN_ONLY_ROUTES includes /admin-dashboard and /wellbeing', () => {
        expect(ADMIN_ONLY_ROUTES).toContain('/admin-dashboard');
        expect(ADMIN_ONLY_ROUTES).toContain('/wellbeing');
    });

    it('FACULTY_ROUTES includes /faculty-dashboard', () => {
        expect(FACULTY_ROUTES).toContain('/faculty-dashboard');
    });

    it('SHARED_ROUTES includes /dashboard and /report-incident', () => {
        expect(SHARED_ROUTES).toContain('/dashboard');
        expect(SHARED_ROUTES).toContain('/report-incident');
    });
});
