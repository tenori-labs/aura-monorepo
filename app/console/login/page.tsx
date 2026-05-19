'use client';

import { useActionState } from 'react';
import { Box, Button, Card, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import { consoleLogin } from './actions';

export default function ConsoleLoginPage() {
  const [state, formAction, isPending] = useActionState(consoleLogin, null);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black"
      style={{
        padding:
          'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      }}
    >
      <Card size="3" style={{ width: '100%', maxWidth: 380 }}>
        <Heading as="h3" size="5" mb="1">
          Aura Console
        </Heading>
        <Text as="p" size="2" mb="4" color="gray">
          Super-admin access. Enter the console password to continue.
        </Text>

        {state?.error && (
          <Box
            mb="3"
            p="2"
            style={{ backgroundColor: 'var(--red-a3)', borderRadius: 'var(--radius-2)' }}
          >
            <Text size="2" color="red">
              {state.error}
            </Text>
          </Box>
        )}

        <form action={formAction}>
          <Box mb="4">
            <Text
              as="label"
              htmlFor="console-password"
              size="2"
              weight="medium"
              mb="2"
              style={{ display: 'block' }}
            >
              Password
            </Text>
            <TextField.Root
              id="console-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
            />
          </Box>

          <Flex justify="end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </Flex>
        </form>
      </Card>
    </div>
  );
}
