import { redirect } from 'next/navigation';
import { Avatar, Badge, Card, Flex, Heading, Separator, Text } from '@radix-ui/themes';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { FacultyIncidentTable } from '@/components/faculty-incident-table';
import { SlaBreachBanner } from '@/components/sla-breach-banner';
import prisma from '@/lib/db';
import { canAccessFacultyRoutes } from '@/lib/roles';
import { getCurrentUser } from '@/lib/auth/server';
import { getSlaConfig } from '@/app/admin-dashboard/actions';
import { isIncidentBreached } from '@/lib/sla';
import { normalizeLegacyStatus } from '@/app/faculty-dashboard/incident-validation';

export default async function FacultyDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  if (!canAccessFacultyRoutes(user)) {
    redirect('/dashboard');
  }

  // Admins have their own dashboard
  if (user.role === 'admin') {
    redirect('/admin-dashboard');
  }

  const role = user.role;
  const email = user.email ?? 'No email';
  const name = user.fullName ?? email.split('@')[0];
  const avatarUrl = user.imageUrl ?? '';
  const initials = name.charAt(0).toUpperCase();

  // Look up which categories this faculty is assigned to
  const myCategories = await prisma.categoryAssignment.findMany({
    where: { facultyId: user.id },
    select: { category: true },
  });
  const categoryNames = myCategories.map((c: { category: string }) => c.category);

  const incidents =
    categoryNames.length > 0
      ? await prisma.incidentReport.findMany({
          where: { incidentType: { in: categoryNames } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

  // Fetch category assignments for the timeline to display
  const allAssignments = await prisma.categoryAssignment.findMany();
  const categoryAssignmentMap: Record<string, string> = {};
  for (const a of allAssignments) {
    categoryAssignmentMap[a.category] = a.facultyEmail; // stores faculty name
  }

  // Load SLA config + flag breaches for this faculty's queue
  const { sla } = await getSlaConfig();
  const breachedCount = incidents.filter((i) => isIncidentBreached(i, sla)).length;

  // Stats (use normalized statuses so legacy data still counts)
  const totalReports = incidents.length;
  const submittedCount = incidents.filter(
    (i) => normalizeLegacyStatus(i.status) === 'submitted'
  ).length;
  const acknowledgedCount = incidents.filter(
    (i) => normalizeLegacyStatus(i.status) === 'acknowledged'
  ).length;
  const investigatingCount = incidents.filter(
    (i) => normalizeLegacyStatus(i.status) === 'investigating'
  ).length;
  const resolvedCount = incidents.filter(
    (i) => normalizeLegacyStatus(i.status) === 'resolved'
  ).length;

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
      <PageHeader title="Faculty Dashboard" subtitle={`Welcome, ${name}!`} userRole={role} />

      {/* ─── Main Content ─── */}
      <Flex
        direction="column"
        gap="5"
        px={{ initial: '4', sm: '6' }}
        py="5"
        style={{
          flex: 1,
          overflow: 'auto',
          maxWidth: '1000px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* ─── Faculty Profile Card ─── */}
        <Card size="2">
          <Flex
            direction={{ initial: 'column', sm: 'row' }}
            gap="4"
            align={{ initial: 'center', sm: 'start' }}
            py="3"
          >
            <Avatar size="6" src={avatarUrl} fallback={initials} radius="full" />
            <Flex direction="column" gap="2" style={{ flex: 1, width: '100%' }}>
              <Flex align="center" gap="2" wrap="wrap" justify={{ initial: 'center', sm: 'start' }}>
                <Text size="4" weight="bold">
                  {name}
                </Text>
                <Badge color="violet" variant="soft" size="1">
                  Faculty
                </Badge>
              </Flex>

              <Separator size="4" />

              <Flex direction="column" gap="1">
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
                <Flex justify="between" wrap="wrap" gap="1">
                  <Text size="2" color="gray">
                    Department
                  </Text>
                  <Text size="2" weight="medium">
                    Computer Science
                  </Text>
                </Flex>
                <Flex justify="between" wrap="wrap" gap="1">
                  <Text size="2" color="gray">
                    Role
                  </Text>
                  <Text size="2" weight="medium" style={{ textTransform: 'capitalize' }}>
                    {role}
                  </Text>
                </Flex>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* ─── SLA Breach Alert ─── */}
        <SlaBreachBanner count={breachedCount} scope="faculty" />

        {/* ─── Stats Overview ─── */}
        <Flex gap="3" wrap="wrap">
          <Card size="1" style={{ flex: '1 1 120px', minWidth: '120px' }}>
            <Flex direction="column" align="center" gap="1" py="2">
              <Text size="5" weight="bold">
                {totalReports}
              </Text>
              <Text size="1" color="gray">
                Total Incidents
              </Text>
            </Flex>
          </Card>
          <Card size="1" style={{ flex: '1 1 120px', minWidth: '120px' }}>
            <Flex direction="column" align="center" gap="1" py="2">
              <Text size="5" weight="bold" color="blue">
                {submittedCount}
              </Text>
              <Text size="1" color="gray">
                Submitted
              </Text>
            </Flex>
          </Card>
          <Card size="1" style={{ flex: '1 1 120px', minWidth: '120px' }}>
            <Flex direction="column" align="center" gap="1" py="2">
              <Text size="5" weight="bold" color="violet">
                {acknowledgedCount}
              </Text>
              <Text size="1" color="gray">
                Acknowledged
              </Text>
            </Flex>
          </Card>
          <Card size="1" style={{ flex: '1 1 120px', minWidth: '120px' }}>
            <Flex direction="column" align="center" gap="1" py="2">
              <Text size="5" weight="bold" color="orange">
                {investigatingCount}
              </Text>
              <Text size="1" color="gray">
                Investigating
              </Text>
            </Flex>
          </Card>
          <Card size="1" style={{ flex: '1 1 120px', minWidth: '120px' }}>
            <Flex direction="column" align="center" gap="1" py="2">
              <Text size="5" weight="bold" color="green">
                {resolvedCount}
              </Text>
              <Text size="1" color="gray">
                Resolved
              </Text>
            </Flex>
          </Card>
          <Card size="1" style={{ flex: '1 1 120px', minWidth: '120px' }}>
            <Flex direction="column" align="center" gap="1" py="2">
              <Text size="5" weight="bold" color="red">
                {breachedCount}
              </Text>
              <Text size="1" color="gray">
                SLA Breached
              </Text>
            </Flex>
          </Card>
        </Flex>

        {/* ─── Incident Reports ─── */}
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center" wrap="wrap" gap="2">
            <Flex direction="column" gap="1">
              <Heading size={{ initial: '3', sm: '4' }}>Assigned Incidents</Heading>
              <Text size="2" color="gray">
                Click any report to view details and AI analysis.
              </Text>
            </Flex>
            <Badge variant="surface" size="2">
              {totalReports} {totalReports === 1 ? 'report' : 'reports'}
            </Badge>
          </Flex>

          {incidents.length === 0 ? (
            <Card size="2">
              <Flex direction="column" align="center" gap="2" py="5">
                <Text size="3" color="gray" weight="medium">
                  No reports yet
                </Text>
                <Text size="2" color="gray">
                  Assigned incident reports will appear here.
                </Text>
              </Flex>
            </Card>
          ) : (
            <FacultyIncidentTable
              incidents={JSON.parse(JSON.stringify(incidents))}
              categoryAssignments={categoryAssignmentMap}
              assignedCategories={allAssignments
                .filter((a: { facultyId: string }) => a.facultyId === user.id)
                .map((a: { category: string }) => a.category)}
              allCategories={[
                'Academic Integrity',
                'Harassment/Bullying',
                'Safety/Security',
                'Medical Emergency',
                'Facilities Issue',
                'Other',
              ]}
              isAdmin={false}
              sla={sla}
            />
          )}
        </Flex>
      </Flex>

      {/* ─── Responsive Styles ─── */}
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
