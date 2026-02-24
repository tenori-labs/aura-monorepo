import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Avatar, Box, Button, Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';
import prisma from '@/lib/db';
import Link from 'next/link';
import { StudentIncidentDialog } from '@/components/student-incident-dialog';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { getUserRole } from '@/lib/roles';
import { CheckCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const email = user.email ?? 'No email';
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? email.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url ?? '';
  const initials = name.charAt(0).toUpperCase();
  const userRole = getUserRole(user);

  // Fetch real incidents from MongoDB for this user
  const incidents = await prisma.incidentReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  // Check for consent
  const consentRecord = await prisma.consentRecord.findFirst({
    where: { userId: user.id },
  });
  const hasConsented = !!consentRecord;

  // Fetch category assignments for timeline display
  const allAssignments = await prisma.categoryAssignment.findMany();
  const categoryAssignmentMap: Record<string, string> = {};
  for (const a of allAssignments) {
    categoryAssignmentMap[a.category] = a.facultyEmail;
  }

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
        title={`${userRole === 'faculty' ? 'Faculty' : 'Student'} Dashboard`}
        subtitle={`Welcome, ${name}!`}
        userRole={userRole}
      />

      {/* ─── Main Content (single vertical column) ─── */}
      <Flex
        direction="column"
        gap="5"
        px={{ initial: '4', sm: '6' }}
        py="5"
        style={{ flex: 1, overflow: 'auto', maxWidth: '900px', width: '100%', margin: '0 auto' }}
      >
        {/* Profile Card */}
        <Card size="2">
          <Flex direction="column" align="center" gap="3" py="3">
            <Avatar size="6" src={avatarUrl} fallback={initials} radius="full" />
            <Flex direction="column" align="center" gap="1">
              <Text size="3" weight="bold">
                {name}
              </Text>
              <Text size="1" color="gray">
                {email}
              </Text>
            </Flex>
          </Flex>

          <Separator size="4" my="3" />

          <Flex direction="column" gap="2">
            <Flex justify="between" wrap="wrap" gap="1">
              <Text size="2" color="gray">
                Email
              </Text>
              <Text
                size="2"
                weight="medium"
                style={{ wordBreak: 'break-all', textAlign: 'right', maxWidth: '65%' }}
              >
                {email}
              </Text>
            </Flex>
            <Flex justify="between">
              <Text size="2" color="gray">
                Reports Filed
              </Text>
              <Text size="2" weight="medium">
                {incidents.length}
              </Text>
            </Flex>
          </Flex>

          <Box mt="4">
            <Button variant="outline" size="2" style={{ width: '100%' }} disabled>
              Edit Profile (Coming Soon)
            </Button>
          </Box>
        </Card>

        {/* Appointments Card */}
        {/* Consent Status Card */}
        <Card size="2">
          <Flex direction="column" gap="2">
            <Heading size="3">Anti-Ragging Undertaking</Heading>
            <Flex align="center" gap="2" mt="1">
              {hasConsented ? (
                <>
                  <CheckCircledIcon color="green" width="20" height="20" />
                  <Text size="2" color="green" weight="bold">
                    Consent Form Completed
                  </Text>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon color="orange" width="20" height="20" />
                  <Text size="2" color="orange" weight="bold">
                    Consent Form Pending
                  </Text>
                </>
              )}
            </Flex>
            {!hasConsented && (
              <Link href="/consent-form" style={{ textDecoration: 'none' }}>
                <Button size="2" variant="soft" color="orange" style={{ width: '100%' }}>
                  Sign Now
                </Button>
              </Link>
            )}
            {hasConsented && (
              <Link href="/consent-form" style={{ textDecoration: 'none' }}>
                <Button size="2" variant="soft" color="green" style={{ width: '100%' }}>
                  View Receipt
                </Button>
              </Link>
            )}
          </Flex>
        </Card>

        {/* Incidents Section */}
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size={{ initial: '3', sm: '4' }}>My Reported Incidents</Heading>
            <Text size="2" color="gray">
              Track the status of your submitted reports.
            </Text>
          </Flex>
          <Link href="/report-incident">
            <Button size="2">Report New Incident</Button>
          </Link>
        </Flex>

        <Flex direction="column" gap="4">
          {incidents.length === 0 ? (
            <Card size="2">
              <Flex direction="column" align="center" gap="2" py="5">
                <Text size="3" color="gray" weight="medium">
                  No reports yet
                </Text>
                <Text size="2" color="gray">
                  Your submitted incident reports will appear here.
                </Text>
              </Flex>
            </Card>
          ) : (
            <StudentIncidentDialog
              incidents={JSON.parse(JSON.stringify(incidents))}
              categoryAssignments={categoryAssignmentMap}
            />
          )}
        </Flex>
      </Flex>

      <PageFooter />
    </div>
  );
}
