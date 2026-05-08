'use client';

import { Box, Button, Card, Flex, Heading, Link, Text, TextField } from '@radix-ui/themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { CheckIcon } from '@radix-ui/react-icons';
import { Marker } from '@/components/Marker';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { Spinner } from '@/components/spinner';

type SignupStep = 'details' | 'verify' | 'done';

export default function SignupPage() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<SignupStep>('details');
  const [selectedRole, setSelectedRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isFetching = fetchStatus === 'fetching';

  const handleCreate = async (formData: FormData) => {
    setGlobalError(null);
    const fullName = (formData.get('fullName') as string).trim();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ').trim() || undefined;

    // SOURCE OF TRUTH for the chosen role: read from the hidden input that
    // mirrors `selectedRole`. Form data survives any React state weirdness,
    // so this is more reliable than trusting the closure's `selectedRole`.
    const formRole = formData.get('role') as string | null;
    const roleToUse: 'student' | 'faculty' | 'admin' =
      formRole === 'admin' || formRole === 'faculty' || formRole === 'student'
        ? formRole
        : selectedRole;

    console.log('[signup] handleCreate role from form=', formRole, 'state=', selectedRole, 'final=', roleToUse);

    try {
      sessionStorage.setItem('pendingRole', roleToUse);
      sessionStorage.setItem('pendingFullName', fullName);
    } catch {
      /* sessionStorage might be disabled — non-fatal */
    }

    const { error } = await signUp.password({
      emailAddress: email,
      password,
      firstName: firstName || undefined,
      lastName,
    });

    if (error) {
      const e = error as { longMessage?: string; message?: string };
      setGlobalError(e.longMessage ?? e.message ?? 'Sign-up failed.');
      return;
    }

    // Best-effort: also try to persist on the SignUp attempt itself, so the
    // user.created webhook can pick it up if it does flow through. Failing
    // silently is fine — sessionStorage is the actual source of truth.
    try {
      await signUp.update({
        unsafeMetadata: {
          requestedRole: roleToUse,
          fullName,
        },
      });
    } catch (e) {
      console.warn('[signup] signUp.update failed (non-fatal):', e);
    }

    const { error: sendErr } = await signUp.verifications.sendEmailCode();
    if (sendErr) {
      const e = sendErr as { longMessage?: string; message?: string };
      setGlobalError(e.longMessage ?? e.message ?? 'Failed to send verification email.');
      return;
    }

    setStep('verify');
  };

  const handleVerify = async (formData: FormData) => {
    setGlobalError(null);
    const code = (formData.get('code') as string).trim();

    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      const e = error as { longMessage?: string; message?: string };
      setGlobalError(e.longMessage ?? e.message ?? 'Invalid code.');
      return;
    }

    if (signUp.status === 'complete') {
      // Land on /post-signup, which will read sessionStorage and write
      // publicMetadata.role server-side, then forward to the right dashboard.
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl('/post-signup');
          if (url.startsWith('http')) {
            window.location.href = url;
          } else {
            window.location.href = url;
          }
        },
      });
      setStep('done');
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
          {step === 'verify' ? (
            <>
              <Heading as="h3" size="6" mb="2">
                Verify your email
              </Heading>
              <Text as="p" size="2" mb="5" color="gray">
                We sent a 6-digit code to your email. Enter it below to finish creating your account.
              </Text>

              {globalError && (
                <Box
                  mb="4"
                  p="3"
                  style={{ backgroundColor: 'var(--red-a3)', borderRadius: 'var(--radius-2)' }}
                >
                  <Text size="2" color="red">
                    {globalError}
                  </Text>
                </Box>
              )}

              <form action={handleVerify}>
                <Box mb="4">
                  <Text
                    as="label"
                    htmlFor="signup-code"
                    size="2"
                    weight="bold"
                    mb="1"
                    style={{ display: 'block' }}
                  >
                    Verification code
                  </Text>
                  <TextField.Root
                    radius="small"
                    id="signup-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    required
                  />
                  {errors?.fields?.code && (
                    <Text size="1" color="red" mt="1" style={{ display: 'block' }}>
                      {errors.fields.code.message}
                    </Text>
                  )}
                </Box>

                <Flex mt="5" justify="between" align="center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => signUp.verifications.sendEmailCode()}
                    disabled={isFetching}
                  >
                    Resend code
                  </Button>
                  <Button type="submit" disabled={isFetching}>
                    {isFetching ? (
                      <>
                        <Spinner /> Verifying…
                      </>
                    ) : (
                      'Verify & continue'
                    )}
                  </Button>
                </Flex>
              </form>
            </>
          ) : step === 'done' ? (
            <Flex gap="3" direction="column" align="center" py="6">
              <Marker height="48px" width="48px">
                <CheckIcon width="32" height="32" />
              </Marker>
              <Heading as="h3" size="6" mb="2">
                Account created
              </Heading>
              <Text as="p" size="3" align="center" color="gray">
                Redirecting you to your dashboard…
              </Text>
            </Flex>
          ) : (
            <>
              <Heading as="h3" size="6" trim="start" mb="2">
                Create an account
              </Heading>

              <Text as="p" size="2" mb="5" color="gray">
                Get started with your new account.
              </Text>

              {globalError && (
                <Box
                  mb="4"
                  p="3"
                  style={{ backgroundColor: 'var(--red-a3)', borderRadius: 'var(--radius-2)' }}
                >
                  <Text size="2" color="red">
                    {globalError}
                  </Text>
                </Box>
              )}

              <Flex direction="column" asChild>
                <form action={handleCreate}>
                  {/* Source of truth — surfaces the role in formData. */}
                  <input type="hidden" name="role" value={selectedRole} />

                  <Flex
                    gap="0"
                    mb="2"
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
                        aria-pressed={selectedRole === role}
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
                  <Text size="1" color="gray" mb="5" style={{ display: 'block' }}>
                    Signing up as <b style={{ textTransform: 'capitalize' }}>{selectedRole}</b>
                  </Text>

                  <Box mb="4">
                    <Text
                      as="label"
                      htmlFor="signup-fullname"
                      size="2"
                      weight="bold"
                      mb="1"
                      style={{ display: 'block' }}
                    >
                      Full Name
                    </Text>
                    <TextField.Root
                      radius="small"
                      id="signup-fullname"
                      name="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      required
                    />
                  </Box>

                  <Box mb="4">
                    <Text
                      as="label"
                      htmlFor="signup-email"
                      size="2"
                      weight="bold"
                      mb="1"
                      style={{ display: 'block' }}
                    >
                      Email address
                    </Text>
                    <TextField.Root
                      radius="small"
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                    />
                    {errors?.fields?.emailAddress && (
                      <Text size="1" color="red" mt="1" style={{ display: 'block' }}>
                        {errors.fields.emailAddress.message}
                      </Text>
                    )}
                  </Box>

                  <Box mb="4">
                    <Text
                      as="label"
                      size="2"
                      weight="bold"
                      htmlFor="signup-password"
                      mb="1"
                      style={{ display: 'block' }}
                    >
                      Password
                    </Text>
                    <TextField.Root
                      radius="small"
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      required
                    />
                    {errors?.fields?.password && (
                      <Text size="1" color="red" mt="1" style={{ display: 'block' }}>
                        {errors.fields.password.message}
                      </Text>
                    )}
                  </Box>

                  <Flex mt="5" justify="end" gap="3" align="center">
                    <Link href="/" size="2">
                      Already have an account?
                    </Link>
                    <Button type="submit" disabled={isFetching}>
                      {isFetching ? (
                        <>
                          <Spinner /> Creating account…
                        </>
                      ) : (
                        'Create account'
                      )}
                    </Button>
                  </Flex>

                  {/* Required for sign-up flows. Clerk's bot protection is enabled by default */}
                  <div id="clerk-captcha" style={{ marginTop: 12 }} />
                </form>
              </Flex>
            </>
          )}
        </Card>
      </Flex>
    </div>
  );
}
