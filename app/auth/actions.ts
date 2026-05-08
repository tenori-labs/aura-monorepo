'use server';

import { redirect } from 'next/navigation';
import { auth, clerkClient } from '@clerk/nextjs/server';
import type { UserRole } from '@/lib/roles';

const ALLOWED_ROLES: readonly UserRole[] = ['student', 'faculty', 'admin'];

/**
 * Sign-out fallback for any code paths still posting to `/auth/actions`.
 * Sign-out is normally performed client-side via `useClerk().signOut()`
 * or Clerk's `<SignOutButton>`.
 */
export async function signout(): Promise<never> {
  const { sessionId } = await auth();
  if (sessionId) {
    const client = await clerkClient();
    try {
      await client.sessions.revokeSession(sessionId);
    } catch (err) {
      console.error('Failed to revoke Clerk session:', err);
    }
  }
  redirect('/');
}

/**
 * Sets the role on the currently signed-in Clerk user.
 *
 * Called from the signup page right after `signUp.finalize()` so the role
 * the user picked at sign-up time is immediately written to
 * `publicMetadata.role` server-side. Idempotent: if a role is already set,
 * we leave it alone (prevents accidental overwrites on signin or refresh).
 *
 * Security: only the AUTHENTICATED user (the one who just signed up) can
 * set their own role, and only to a value in the allowlist. Existing roles
 * are never overwritten.
 */
export async function setMyRoleAfterSignup(role: string) {
  const { userId } = await auth();
  console.log('[setMyRoleAfterSignup] called with role=', role, 'userId=', userId);

  if (!userId) {
    console.warn('[setMyRoleAfterSignup] No userId from auth() — auth context missing');
    return { error: 'Unauthorized' };
  }

  if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
    console.warn('[setMyRoleAfterSignup] Invalid role:', role);
    return { error: `Invalid role: ${role}` };
  }

  const client = await clerkClient();

  try {
    const user = await client.users.getUser(userId);
    console.log(
      '[setMyRoleAfterSignup] current publicMetadata for',
      userId,
      '=',
      user.publicMetadata
    );
    if (typeof user.publicMetadata?.role === 'string') {
      console.log('[setMyRoleAfterSignup] Already set — leaving alone');
      return { success: true, alreadySet: true };
    }

    await client.users.updateUser(userId, {
      publicMetadata: { ...user.publicMetadata, role },
    });
    console.log(`[setMyRoleAfterSignup] Set publicMetadata.role=${role} for ${userId}`);
    return { success: true };
  } catch (err) {
    console.error('[setMyRoleAfterSignup] Failed:', err);
    return { error: 'Failed to set role.' };
  }
}
