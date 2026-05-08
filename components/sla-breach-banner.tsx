import { Box, Card, Flex, Text } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface Props {
  count: number;
  scope?: 'faculty' | 'admin';
}

export function SlaBreachBanner({ count, scope = 'faculty' }: Props) {
  if (count <= 0) return null;

  const message =
    scope === 'admin'
      ? `${count} incident${count === 1 ? '' : 's'} ${count === 1 ? 'has' : 'have'} breached the SLA across all departments.`
      : `You have ${count} overdue incident${count === 1 ? '' : 's'} that ${count === 1 ? 'is' : 'are'} past the SLA. Please address ${count === 1 ? 'it' : 'them'} immediately.`;

  return (
    <Card
      size="2"
      style={{
        background: 'var(--red-a3)',
        borderLeft: '4px solid var(--red-9)',
      }}
    >
      <Flex align="center" gap="3">
        <Box
          style={{
            color: 'var(--red-11)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <ExclamationTriangleIcon width="22" height="22" />
        </Box>
        <Flex direction="column" gap="0">
          <Text size="2" weight="bold" color="red">
            SLA Breach Alert
          </Text>
          <Text size="2" color="red">
            {message}
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}
