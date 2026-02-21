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

// ─── getUserRole — parametrized valid roles ─────────────────────────

describe('getUserRole', () => {
    const validRoles = ['admin', 'faculty', 'student'] as const;

    for (const role of validRoles) {
        it(`returns "${role}" when app_metadata.role is "${role}"`, () => {
            expect(getUserRole(makeUser(role))).toBe(role);
        });
    }

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

    // Type safety
    it('handles numeric role gracefully', () => {
        expect(getUserRole({ app_metadata: { role: 123 } })).toBe('student');
    });

    it('handles object role gracefully', () => {
        expect(getUserRole({ app_metadata: { role: {} } })).toBe('student');
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
    const allowedRoles = ['faculty', 'admin'];
    const deniedRoles = ['student'];

    for (const role of allowedRoles) {
        it(`returns true for ${role} users`, () => {
            expect(canAccessFacultyRoutes(makeUser(role))).toBe(true);
        });
    }

    for (const role of deniedRoles) {
        it(`returns false for ${role} users`, () => {
            expect(canAccessFacultyRoutes(makeUser(role))).toBe(false);
        });
    }

    it('returns false for null user', () => {
        expect(canAccessFacultyRoutes(null)).toBe(false);
    });

    it('returns false when role is missing', () => {
        expect(canAccessFacultyRoutes(makeUser())).toBe(false);
    });
});

// ─── getDashboardPath — parametrized ────────────────────────────────

describe('getDashboardPath', () => {
    const cases: [string | undefined, string][] = [
        ['admin', '/admin-dashboard'],
        ['faculty', '/faculty-dashboard'],
        ['student', '/dashboard'],
        [undefined, '/dashboard'],
    ];

    for (const [role, expectedPath] of cases) {
        it(`returns "${expectedPath}" for ${role ?? 'no'} role`, () => {
            expect(getDashboardPath(makeUser(role))).toBe(expectedPath);
        });
    }

    it('returns /dashboard for null user (fallback)', () => {
        expect(getDashboardPath(null)).toBe('/dashboard');
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

    // Immutability guards
    it('ADMIN_ONLY_ROUTES should be immutable (frozen)', () => {
        expect(Object.isFrozen(ADMIN_ONLY_ROUTES)).toBe(true);
    });

    it('FACULTY_ROUTES should be immutable (frozen)', () => {
        expect(Object.isFrozen(FACULTY_ROUTES)).toBe(true);
    });

    it('SHARED_ROUTES should be immutable (frozen)', () => {
        expect(Object.isFrozen(SHARED_ROUTES)).toBe(true);
    });
});
