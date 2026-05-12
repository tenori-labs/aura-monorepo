import Link from 'next/link';
import { Box, Card, Flex, Heading, Table, Text } from '@radix-ui/themes';
import { listTenants } from './_actions';
import { Pill } from './_components/Primitives';
import { CreateTenantDialog } from './_components/CreateTenantDialog';
import { fmtNum, fmtRelative } from './_utils/format';

export default async function ConsoleHomePage() {
  const result = await listTenants();
  if ('error' in result) {
    return (
      <Box style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
        <Card size="3">
          <Text color="red">{result.error}</Text>
        </Card>
      </Box>
    );
  }
  const { tenants } = result;

  return (
    <Box style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
      <Flex justify="between" align="center" mb="5" wrap="wrap" gap="3">
        <Box>
          <Heading size="6">Tenants</Heading>
          <Text size="2" color="gray">
            {tenants.length} {tenants.length === 1 ? 'institution' : 'institutions'} on the platform
          </Text>
        </Box>
        <CreateTenantDialog />
      </Flex>

      {tenants.length === 0 ? (
        <Card size="2">
          <Flex direction="column" align="center" gap="2" py="6">
            <Text size="3" color="gray" weight="medium">
              No tenants yet
            </Text>
            <Text size="2" color="gray">
              Click &ldquo;New tenant&rdquo; to provision your first institution.
            </Text>
          </Flex>
        </Card>
      ) : (
        <Card size="2" style={{ overflow: 'hidden' }}>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Subdomain</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Credits</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {tenants.map((t) => (
                <Table.Row key={t.id} style={{ cursor: 'pointer' }}>
                  <Table.Cell>
                    <Link
                      href={`/console/${t.id}`}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      <Text size="2" weight="medium">
                        {t.name}
                      </Text>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" style={{ fontFamily: 'monospace' }} color="gray">
                      {t.subdomain}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Pill
                      tone={
                        t.status === 'active'
                          ? 'sage'
                          : t.status === 'suspended'
                            ? 'butter'
                            : 'danger'
                      }
                    >
                      {t.status}
                    </Pill>
                  </Table.Cell>
                  <Table.Cell>
                    <Pill
                      tone={
                        t.planType === 'enterprise'
                          ? 'lavender'
                          : t.planType === 'pro'
                            ? 'sage'
                            : 'ghost'
                      }
                    >
                      {t.planType}
                    </Pill>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{fmtNum(t.creditsRemaining)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {fmtRelative(t.createdAt)}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card>
      )}
    </Box>
  );
}
