import { redirect } from 'next/navigation';
import { Flex, Heading, Text } from '@radix-ui/themes';
import { CategoryManager } from '@/components/category-manager';
import { SlaConfigForm } from '@/components/sla-config';
import { SlaBreachBanner } from '@/components/sla-breach-banner';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { getCurrentUser } from '@/lib/auth/server';
import { getSlaConfig } from './actions';
import prisma from '@/lib/db';
import { isIncidentBreached } from '@/lib/sla';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  if (user.role !== 'admin') {
    redirect('/dashboard');
  }
  const role = user.role;

  // Load SLA + count org-wide breaches for the alert banner
  const [{ sla }, allIncidents] = await Promise.all([
    getSlaConfig(),
    prisma.incidentReport.findMany({
      select: {
        status: true,
        createdAt: true,
        acknowledgedAt: true,
        investigatingAt: true,
        resolvedAt: true,
      },
    }),
  ]);
  const breachedCount = allIncidents.filter((i) => isIncidentBreached(i, sla)).length;

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
        title="Admin Dashboard"
        subtitle={`Welcome, ${user.fullName ?? user.email?.split('@')[0] ?? 'Admin'}!`}
        userRole={role}
      />

      {/* Main Content */}
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
        {/* SLA Breach Alert */}
        <SlaBreachBanner count={breachedCount} scope="admin" />

        {/* SLA Configuration Section */}
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Heading size={{ initial: '3', sm: '4' }}>Response Time SLAs</Heading>
            <Text size="2" color="gray">
              Configure how long faculty have at each stage before incidents are flagged as
              breaching the SLA.
            </Text>
          </Flex>
          <SlaConfigForm />
        </Flex>

        {/* Category Assignment Section */}
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Heading size={{ initial: '3', sm: '4' }}>Category Assignments</Heading>
            <Text size="2" color="gray">
              Assign faculty members to incident categories. Reports will be auto-assigned to the
              designated faculty.
            </Text>
          </Flex>
          <CategoryManager />
        </Flex>
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
