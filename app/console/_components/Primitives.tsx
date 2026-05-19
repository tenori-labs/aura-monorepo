import { type ReactNode } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';

type PillTone = 'sage' | 'ghost' | 'lavender' | 'butter' | 'danger' | 'peach';

const toneStyles: Record<PillTone, { bg: string; fg: string; border: string }> = {
  sage: { bg: 'var(--green-a3)', fg: 'var(--green-11)', border: 'var(--green-a6)' },
  ghost: { bg: 'var(--gray-a3)', fg: 'var(--gray-11)', border: 'var(--gray-a6)' },
  lavender: { bg: 'var(--violet-a3)', fg: 'var(--violet-11)', border: 'var(--violet-a6)' },
  butter: { bg: 'var(--amber-a3)', fg: 'var(--amber-11)', border: 'var(--amber-a6)' },
  danger: { bg: 'var(--red-a3)', fg: 'var(--red-11)', border: 'var(--red-a6)' },
  peach: { bg: 'var(--orange-a3)', fg: 'var(--orange-11)', border: 'var(--orange-a6)' },
};

/** Small colored badge — used for status pills, plan tags, etc. */
export function Pill({
  tone = 'ghost',
  children,
}: {
  tone?: PillTone;
  children: ReactNode;
}) {
  const s = toneStyles[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  );
}

/** Section header inside a tab — bold title + optional description. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Box mb="5">
      <Flex direction="column" gap="1" mb="3">
        <Text size="3" weight="bold">
          {title}
        </Text>
        {description && (
          <Text size="2" color="gray">
            {description}
          </Text>
        )}
      </Flex>
      {children}
    </Box>
  );
}

/** Form row — label on top, control below. */
export function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box mb="3">
      <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
        {label}
      </Text>
      {children}
    </Box>
  );
}
