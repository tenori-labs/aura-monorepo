'use client';

import { Box, Button, Card, Flex, Heading, Link, Text, TextField } from '@radix-ui/themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { login } from '@/app/auth/actions';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [selectedRole, setSelectedRole] = useState<'student' | 'faculty' | 'admin'>('student');

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

          {error && (
            <Box
              mb="5"
              p="3"
              style={{ backgroundColor: 'var(--red-a3)', borderRadius: 'var(--radius-2)' }}
            >
              <Text size="2" color="red">
                {error}
              </Text>
            </Box>
          )}

          <Flex direction="column" asChild>
            <form>
              {/* Role Selector */}
              <Flex
                gap="0"
                mb="5"
                style={{
                  borderRadius: 'var(--radius-2)',
                  border: '1px solid var(--gray-a6)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedRole('student')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    borderRight: '1px solid var(--gray-a6)',
                    background: selectedRole === 'student' ? 'var(--accent-a3)' : 'transparent',
                    color: selectedRole === 'student' ? 'var(--accent-11)' : 'var(--gray-11)',
                    cursor: 'pointer',
                    fontWeight: selectedRole === 'student' ? 600 : 400,
                    fontSize: '14px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('faculty')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    borderRight: '1px solid var(--gray-a6)',
                    background: selectedRole === 'faculty' ? 'var(--accent-a3)' : 'transparent',
                    color: selectedRole === 'faculty' ? 'var(--accent-11)' : 'var(--gray-11)',
                    cursor: 'pointer',
                    fontWeight: selectedRole === 'faculty' ? 600 : 400,
                    fontSize: '14px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Faculty
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    background: selectedRole === 'admin' ? 'var(--accent-a3)' : 'transparent',
                    color: selectedRole === 'admin' ? 'var(--accent-11)' : 'var(--gray-11)',
                    cursor: 'pointer',
                    fontWeight: selectedRole === 'admin' ? 600 : 400,
                    fontSize: '14px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Admin
                </button>
              </Flex>
              <input type="hidden" name="role" value={selectedRole} />
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
              </Box>

              <Flex mt="6" justify="end" gap="3" align="center">
                <Link href="/signup" size="2">
                  Create an account
                </Link>
                <Button type="submit" formAction={login}>
                  Sign in
                </Button>
              </Flex>
            </form>
          </Flex>
        </Card>
      </Flex>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
