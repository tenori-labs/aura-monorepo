import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Badge, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { WellbeingReportTable } from '@/components/wellbeing-report-table';
import { getWellbeingReports } from '@/app/wellbeing/wellbeing-actions';
import { getUserRole } from '@/lib/roles';

export default async function WellbeingReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Admin-only route
  if (getUserRole(user) !== 'admin') {
    redirect('/dashboard');
  }

  const wellbeingReports = await getWellbeingReports();

  return (
    <div
      className="font-sans"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--gray-a2)',
      }}
    >
      <PageHeader
        title="Wellbeing Reports"
        subtitle="Confidential reports generated from Aura conversations"
      />

      <Flex
        direction="column"
        gap="4"
        px={{ initial: '3', sm: '6' }}
        py="4"
        style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto' }}
      >
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <Flex direction="column" gap="1">
            <Heading size={{ initial: '3', sm: '4' }}>Wellbeing Alerts</Heading>
            <Text size="2" color="gray">
              Confidential reports generated from Aura conversations.
            </Text>
          </Flex>
          <Badge variant="surface" size="2">
            {wellbeingReports.length} {wellbeingReports.length === 1 ? 'report' : 'reports'}
          </Badge>
        </Flex>

        {wellbeingReports.length === 0 ? (
          <Card size="2">
            <Flex direction="column" align="center" gap="2" py="5">
              <Text size="3" color="gray" weight="medium">
                No wellbeing alerts
              </Text>
              <Text size="2" color="gray">
                Flagged conversations will appear here.
              </Text>
            </Flex>
          </Card>
        ) : (
          <WellbeingReportTable reports={JSON.parse(JSON.stringify(wellbeingReports))} />
        )}
      </Flex>

      {/* Responsive Styles */}
      <style>{`
                @media (max-width: 640px) {
                    .hide-on-mobile { display: none !important; }
                }
                @media (min-width: 641px) {
                    .hide-on-desktop { display: none !important; }
                }
            `}</style>
      <PageFooter />
    </div>
  );
}
