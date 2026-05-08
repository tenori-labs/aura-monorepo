import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  ADMIN_ONLY_ROUTES,
  FACULTY_ROUTES,
  SHARED_ROUTES,
  getDashboardPathForRole,
} from '@/lib/roles';

const isAuthPage = createRouteMatcher(['/', '/signup']);
const isWebhookRoute = createRouteMatcher(['/api/webhooks(.*)']);

const isAdminOnlyRoute = createRouteMatcher(ADMIN_ONLY_ROUTES.map((r) => `${r}(.*)`));
const isFacultyRoute = createRouteMatcher(FACULTY_ROUTES.map((r) => `${r}(.*)`));
const isSharedRoute = createRouteMatcher(SHARED_ROUTES.map((r) => `${r}(.*)`));
const isProtectedRoute = createRouteMatcher(
  [...ADMIN_ONLY_ROUTES, ...FACULTY_ROUTES, ...SHARED_ROUTES].map((r) => `${r}(.*)`)
);

/**
 * Best-effort role read from session claims. Clerk's default session JWT in
 * Core 3 includes `public_metadata` (snake_case) at the top level, but custom
 * JWT templates may use `metadata` or `publicMetadata`. Try all of them.
 *
 * Returns `null` (not 'student') when nothing is readable, so callers can
 * decide whether to do a role-based redirect or just let the page handle it.
 * Without this, a stale/missing role in the JWT would send faculty users
 * back to /dashboard, which would then redirect to /faculty-dashboard, etc.
 */
function readRoleFromClaims(sessionClaims: unknown): string | null {
  const c = sessionClaims as
    | {
        metadata?: { role?: unknown };
        public_metadata?: { role?: unknown };
        publicMetadata?: { role?: unknown };
      }
    | null
    | undefined;
  const r =
    c?.public_metadata?.role ?? c?.publicMetadata?.role ?? c?.metadata?.role;
  return typeof r === 'string' ? r : null;
}

export default clerkMiddleware(async (auth, req) => {
  // Webhook routes must be public — never run auth on them.
  if (isWebhookRoute(req)) return;

  const { userId, sessionClaims } = await auth();

  // Unauthenticated users on protected routes → redirect to login.
  if (!userId && isProtectedRoute(req)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (userId) {
    const role = readRoleFromClaims(sessionClaims);

    // Authenticated users on auth pages → bounce to their dashboard.
    // If we don't know the role yet, send them to the post-signup bridge
    // which will resolve the right destination using the live user object.
    if (isAuthPage(req)) {
      const dest = role ? getDashboardPathForRole(role) : '/post-signup';
      return NextResponse.redirect(new URL(dest, req.url));
    }

    // Role-based access checks ONLY when we have a confirmed role from the JWT.
    // If role is null (claims missing), let the page render and let its
    // server-side `getCurrentUser()` (which calls Clerk's API directly)
    // handle redirection. This avoids a redirect loop when the JWT is stale.
    if (role !== null) {
      const sharedRoute = isSharedRoute(req);

      if (!sharedRoute && isAdminOnlyRoute(req) && role !== 'admin') {
        return NextResponse.redirect(new URL(getDashboardPathForRole(role), req.url));
      }

      if (isFacultyRoute(req) && role !== 'faculty' && role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Run on API and TRPC routes
    '/(api|trpc)(.*)',
  ],
};
