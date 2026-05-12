import { type ReactNode } from 'react';
import Link from 'next/link';
import { Flex, Text, Button } from '@radix-ui/themes';
import { consoleLogout } from './login/actions';

/**
 * Console chrome — minimal header with logout, content below.
 * Does NOT include the regular app's PageHeader / hamburger menu, so the
 * console feels distinct from a tenant-facing page.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="font-sans"
      style={{
        minHeight: '100vh',
        background: 'var(--gray-a2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          background: 'var(--color-background)',
          borderBottom: '1px solid var(--gray-a4)',
        }}
      >
        <Flex
          align="center"
          justify="between"
          px="5"
          py="3"
          style={{ maxWidth: 1200, margin: '0 auto' }}
        >
          <Link href="/console" style={{ textDecoration: 'none' }}>
            <Text size="3" weight="bold" style={{ letterSpacing: '-0.01em' }}>
              Aura Console
            </Text>
          </Link>
          <form action={consoleLogout}>
            <Button variant="soft" color="gray" size="2" type="submit">
              Sign out
            </Button>
          </form>
        </Flex>
      </header>

      <main style={{ flex: 1, padding: '24px 0' }}>{children}</main>
    </div>
  );
}
