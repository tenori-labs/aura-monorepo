'use client';

import { useEffect, useState } from 'react';
import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import { Spinner } from '@/components/spinner';
import { useUser } from '@clerk/nextjs';
import { setMyRoleAfterSignup } from '@/app/auth/actions';

/**
 * Bridge page hit immediately after Clerk's signUp.finalize() completes.
 *
 * Reads the role the user picked at signup (stashed in sessionStorage by
 * the signup form), writes it to `publicMetadata.role` via a server action,
 * then hard-redirects to the role's dashboard. The hard reload is what
 * forces the Clerk session JWT to refresh with the new metadata.
 *
 * If sessionStorage is empty (user navigated here directly, or it got
 * cleared), default to /dashboard with role 'student'.
 */
export default function PostSignupPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [status, setStatus] = useState<string>('Setting up your account...');

  useEffect(() => {
    if (!isLoaded) return;

    // If we ended up here without a session, bounce back to login.
    if (!isSignedIn || !user) {
      window.location.href = '/';
      return;
    }

    const run = async () => {
      const pendingRole = sessionStorage.getItem('pendingRole') ?? 'student';
      const role =
        pendingRole === 'admin' || pendingRole === 'faculty' || pendingRole === 'student'
          ? pendingRole
          : 'student';

      const existing =
        typeof user.publicMetadata?.role === 'string'
          ? (user.publicMetadata.role as string)
          : null;

      console.log(
        '[post-signup] pendingRole=',
        pendingRole,
        'existing publicMetadata.role=',
        existing
      );

      const finalRole = existing ?? role;

      if (!existing) {
        setStatus('Configuring your dashboard...');
        try {
          const result = await setMyRoleAfterSignup(role);
          if ('error' in result) {
            console.error('[post-signup] setMyRoleAfterSignup error:', result.error);
          } else {
            console.log('[post-signup] setMyRoleAfterSignup ok, role=', role);
          }
        } catch (err) {
          console.error('[post-signup] setMyRoleAfterSignup threw:', err);
        }
      }

      // Clear the stash regardless of outcome.
      try {
        sessionStorage.removeItem('pendingRole');
        sessionStorage.removeItem('pendingFullName');
      } catch {
        /* ignore */
      }

      const destination =
        finalRole === 'admin'
          ? '/admin-dashboard'
          : finalRole === 'faculty'
            ? '/faculty-dashboard'
            : '/dashboard';

      console.log('[post-signup] redirecting finalRole=', finalRole, 'to', destination);

      // Hard navigate so the new JWT (with role in claims) is picked up by
      // the server-rendered destination page.
      window.location.href = destination;
    };

    void run();
  }, [isLoaded, isSignedIn, user]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black"
      style={{
        padding:
          'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      }}
    >
      <Card size={{ initial: '2', sm: '4' }} style={{ width: '100%', maxWidth: 416 }}>
        <Flex direction="column" align="center" gap="3" py="5">
          <Spinner />
          <Heading as="h3" size="4">
            Almost there
          </Heading>
          <Text size="2" color="gray" align="center">
            {status}
          </Text>
        </Flex>
      </Card>
    </div>
  );
}
