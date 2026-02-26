'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { signout } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/roles';

const allNavItems = [
  {
    label: 'Incident Reporting',
    href: '/report-incident',
    roles: ['student', 'faculty', 'admin'] as UserRole[],
  },
  {
    label: 'AI Assistant',
    href: '/ai-assistant',
    roles: ['student', 'faculty', 'admin'] as UserRole[],
  },
  { label: 'Dashboard', href: '/dashboard', roles: ['student'] as UserRole[] },
  { label: 'Faculty Dashboard', href: '/faculty-dashboard', roles: ['faculty'] as UserRole[] },
  { label: 'Admin Dashboard', href: '/admin-dashboard', roles: ['admin'] as UserRole[] },
  { label: 'Wellbeing Reports', href: '/wellbeing', roles: ['admin'] as UserRole[] },
  {
    label: 'Consent Form',
    href: '/consent-form',
    roles: ['student', 'faculty', 'admin'] as UserRole[],
  },
  {
    label: 'Bulletin Board',
    href: '/bulletin',
    roles: ['student', 'faculty', 'admin'] as UserRole[],
  },
  {
    label: 'Shadow Cases',
    href: '/shadow',
    roles: ['admin'] as UserRole[],
  },
  {
    label: 'Pending Interview',
    href: '/shadow/chat',
    roles: ['student', 'faculty', 'admin'] as UserRole[],
  },
];

interface HamburgerMenuProps {
  userRole?: UserRole;
}

export function HamburgerMenu({ userRole: propRole }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(propRole || 'student');
  const [pendingCount, setPendingCount] = useState(0);
  const pathname = usePathname();

  // Fetch role from Supabase if not passed as prop
  useEffect(() => {
    if (propRole) {
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.app_metadata?.role) {
        setRole(user.app_metadata.role as UserRole);
      }
    });
  }, [propRole]);

  // Fetch pending interview count
  useEffect(() => {
    import('@/app/shadow/chat/chat-actions').then(({ getPendingInterviewCount }) => {
      getPendingInterviewCount().then((result) => {
        if ('count' in result) setPendingCount(result.count);
      });
    });
  }, [pathname]);

  const activeRole = propRole || role;

  // Filter nav items based on role
  const navItems = allNavItems.filter((item) => item.roles.includes(activeRole));

  return (
    <Box>
      {/* Hamburger Button */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          style={{
            background: 'none',
            border: '1px solid var(--gray-a6)',
            borderRadius: 'var(--radius-2)',
            padding: '6px 8px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            transition: 'background 0.15s',
          }}
        >
          <span
            style={{
              display: 'block',
              width: '18px',
              height: '2px',
              background: 'var(--gray-12)',
              borderRadius: '1px',
            }}
          />
          <span
            style={{
              display: 'block',
              width: '18px',
              height: '2px',
              background: 'var(--gray-12)',
              borderRadius: '1px',
            }}
          />
          <span
            style={{
              display: 'block',
              width: '18px',
              height: '2px',
              background: 'var(--gray-12)',
              borderRadius: '1px',
            }}
          />
        </button>
        {/* Red notification dot */}
        {pendingCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: pendingCount > 9 ? '18px' : '14px',
              height: '14px',
              borderRadius: '7px',
              background: 'var(--red-9)',
              border: '2px solid var(--color-background)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 700,
              color: 'white',
              lineHeight: 1,
            }}
          >
            {pendingCount}
          </span>
        )}
      </div>

      {/* Slide-out Drawer & Backdrop */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(2px)',
              animation: 'fadeIn 0.2s ease-out',
            }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '280px',
              maxWidth: '80%',
              background: 'var(--color-background)',
              borderLeft: '1px solid var(--gray-a5)',
              boxShadow: '-5px 0 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideIn 0.2s ease-out',
            }}
          >
            {/* Drawer Header: Close Button + Theme/SignOut */}
            <Flex
              direction="column"
              gap="4"
              p="4"
              style={{ borderBottom: '1px solid var(--gray-a4)' }}
            >
              <Flex justify="between" align="center">
                <Text weight="bold" size="3">
                  Menu
                </Text>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: 'var(--radius-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-a3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.5571 3.21846 11.7816C3.44301 12.0062 3.80708 12.0062 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0062 11.5571 12.0062 11.7816 11.7816C12.0062 11.5571 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </button>
              </Flex>

              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="2">Theme:</Text>
                  <ThemeToggle />
                </Flex>
                <Button onClick={() => signout()} variant="soft" color="red" size="2">
                  Sign out
                </Button>
              </Flex>
            </Flex>

            {/* Navigation Links */}
            <Flex direction="column" p="2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'block',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      color: isActive ? 'var(--accent-11)' : 'var(--gray-12)',
                      background: isActive ? 'var(--accent-a3)' : 'transparent',
                      borderRadius: 'var(--radius-2)',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '15px',
                      marginBottom: '2px',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--gray-a3)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.label}
                      {item.href === '/shadow/chat' && pendingCount > 0 && (
                        <span
                          style={{
                            background: 'var(--red-9)',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: '10px',
                            padding: '1px 7px',
                            lineHeight: '16px',
                          }}
                        >
                          {pendingCount}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </Flex>
          </div>
        </div>
      )}

      {/* Animation definitions */}
      <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
    </Box>
  );
}
