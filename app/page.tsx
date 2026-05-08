'use client';

import { Box, Button, Card, Flex, Heading, Link, Text, TextField } from '@radix-ui/themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { Spinner } from '@/components/spinner';

export default function Home() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isFetching = fetchStatus === 'fetching';

  const handleSubmit = async (formData: FormData) => {
    setGlobalError(null);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn.password({
      identifier: email,
      password,
    });

    if (error) {
      const e = error as { longMessage?: string; message?: string };
      setGlobalError(e.longMessage ?? e.message ?? 'Sign-in failed.');
      return;
    }

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl('/dashboard');
          if (url.startsWith('http')) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black"
      style={{
        padding:
          'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      }}
    >
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <ThemeToggle />
      </div>
      <Flex
        direction="column"
        align="center"
        gap="6"
        style={{ width: '100%', maxWidth: '416px', padding: '0 1rem' }}
      >
        <Card size={{ initial: '2', sm: '4' }} style={{ width: '100%' }}>
          <Heading as="h3" size="6" trim="start" mb="5">
            Welcome back
          </Heading>

          <Text as="p" size="2" mb="6" color="gray">
            Sign in to your account to continue.
          </Text>

          {globalError && (
            <Box
              mb="5"
              p="3"
              style={{ backgroundColor: 'var(--red-a3)', borderRadius: 'var(--radius-2)' }}
            >
              <Text size="2" color="red">
                {globalError}
              </Text>
            </Box>
          )}

          <Flex direction="column" asChild>
            <form action={handleSubmit}>
              {/* Role Selector — display-only; the real role is set in publicMetadata at signup. */}
              <Flex
                gap="0"
                mb="5"
                style={{
                  borderRadius: 'var(--radius-2)',
                  border: '1px solid var(--gray-a6)',
                  overflow: 'hidden',
                }}
              >
                {(['student', 'faculty', 'admin'] as const).map((role, idx) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: 'none',
                      borderRight: idx < 2 ? '1px solid var(--gray-a6)' : 'none',
                      background: selectedRole === role ? 'var(--accent-a3)' : 'transparent',
                      color: selectedRole === role ? 'var(--accent-11)' : 'var(--gray-11)',
                      cursor: 'pointer',
                      fontWeight: selectedRole === role ? 600 : 400,
                      fontSize: '14px',
                      textTransform: 'capitalize',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {role}
                  </button>
                ))}
              </Flex>

              <Box mb="5">
                <Text
                  as="label"
                  htmlFor="login-email"
                  size="2"
                  weight="bold"
                  mb="1"
                  style={{ display: 'block' }}
                >
                  Email address
                </Text>
                <TextField.Root
                  radius="small"
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                />
                {errors?.fields?.identifier && (
                  <Text size="1" color="red" mt="1" style={{ display: 'block' }}>
                    {errors.fields.identifier.message}
                  </Text>
                )}
              </Box>

              <Box mb="5">
                <Text
                  as="label"
                  size="2"
                  weight="bold"
                  htmlFor="login-password"
                  mb="1"
                  style={{ display: 'block' }}
                >
                  Password
                </Text>
                <TextField.Root
                  radius="small"
                  id="login-password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                />
                {errors?.fields?.password && (
                  <Text size="1" color="red" mt="1" style={{ display: 'block' }}>
                    {errors.fields.password.message}
                  </Text>
                )}
              </Box>

              <Flex mt="6" justify="end" gap="3" align="center">
                <Link href="/signup" size="2">
                  Create an account
                </Link>
                <Button type="submit" disabled={isFetching}>
                  {isFetching ? (
                    <>
                      <Spinner /> Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </Flex>
            </form>
          </Flex>
        </Card>
      </Flex>
    </div>
  );
}
