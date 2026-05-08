import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import {
  canAccessFacultyRoutes,
  getUserRole,
  isAdmin,
  type UserRole,
} from '@/lib/roles';

/**
 * Lightweight, framework-agnostic shape of the authenticated user.
 * Matches what the rest of the app actually reads — id, email, role,
 * full name, avatar, and `publicMetadata` for `lib/roles.ts` helpers.
 */
export interface AppUser {
  id: string;
  email: string | null;
  fullName: string | null;
  imageUrl: string | null;
  role: UserRole;
  /** Required so `lib/roles` helpers (`isAdmin`, etc.) keep working. */
  publicMetadata: Record<string, unknown>;
}

function toAppUser(user: Awaited<ReturnType<typeof currentUser>>): AppUser | null {
  if (!user) return null;
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  const email = primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.username ||
    null;
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

  return {
    id: user.id,
    email,
    fullName,
    imageUrl: user.imageUrl ?? null,
    role: getUserRole({ publicMetadata }),
    publicMetadata,
  };
}

/**
 * Returns the authenticated user, or `null` if not signed in.
 *
 * Hardened against transient Clerk Backend API failures: if `currentUser()`
 * throws (network hiccup, rate-limit, token race), we fall back to a minimal
 * `AppUser` synthesized from the session JWT claims. Callers still get a
 * usable object instead of crashing — and they keep working with degraded
 * data (no email/imageUrl) rather than the request 500ing.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  try {
    const user = await currentUser();
    if (user) return toAppUser(user);
  } catch (err) {
    console.error('[auth] currentUser() failed, falling back to session claims:', err);
  }

  // Fallback: synthesize an AppUser from session claims so the request can proceed.
  const claims = sessionClaims as
    | { metadata?: { role?: string }; email?: string; name?: string }
    | null;
  const publicMetadata = (claims?.metadata ?? {}) as Record<string, unknown>;
  return {
    id: userId,
    email: claims?.email ?? null,
    fullName: claims?.name ?? null,
    imageUrl: null,
    role: getUserRole({ publicMetadata }),
    publicMetadata,
  };
}

/**
 * Returns the authenticated user or redirects to `/`.
 * Use in server components/actions that require any logged-in user.
 */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  return user;
}

/**
 * Returns the authenticated user or redirects to their dashboard if they
 * lack the required role. Server actions should prefer the assertion-style
 * helpers in `lib/auth/guards.ts` instead.
 */
export async function requireRole(allowed: UserRole | UserRole[]): Promise<AppUser> {
  const user = await requireUser();
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];

  // Admin always passes a faculty check.
  if (allowedList.includes('faculty') && isAdmin(user)) return user;

  if (!allowedList.includes(user.role)) {
    if (user.role === 'admin') redirect('/admin-dashboard');
    if (user.role === 'faculty') redirect('/faculty-dashboard');
    redirect('/dashboard');
  }
  return user;
}

/**
 * Just the user ID — fastest path when that's all you need.
 */
export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
