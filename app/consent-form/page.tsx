import { redirect } from 'next/navigation';
import {
  Container,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Button,
  Separator,
  Box,
} from '@radix-ui/themes';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { getCurrentUser } from '@/lib/auth/server';
import { ConsentForm } from '@/components/consent-form';
import prisma from '@/lib/db';
import { CheckCircledIcon, DownloadIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export default async function ConsentFormPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const role = user.role;

  // Get user details
  const fullName = user.fullName ?? user.email?.split('@')[0] ?? '';
  // studentId / course would come from a profile table or SIS integration; left blank for now
  const studentId = (user.publicMetadata?.studentId as string | undefined) ?? '';
  const course = (user.publicMetadata?.course as string | undefined) ?? '';

  // Check if user has already signed
  const existingConsent = await prisma.consentRecord.findFirst({
    where: { userId: user.id },
    orderBy: { signedAt: 'desc' }, // Get latest
  });

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
      <PageHeader title="Consent Form" subtitle="UGC Anti-Ragging Undertaking" userRole={role} />

      {/* Main Content */}
      <Container p="4" style={{ flex: 1, maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        {existingConsent ? (
          // Receipt View
          <Flex direction="column" gap="4">
            {/* Success Banner */}
            <Card size="3">
              <Flex
                direction="column"
                align="center"
                gap="3"
                py={{ initial: '4', sm: '6' }}
                px={{ initial: '3', sm: '5' }}
              >
                <Box
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'var(--green-a3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircledIcon width="40" height="40" color="green" />
                </Box>
                <Heading size={{ initial: '5', sm: '6' }} align="center">
                  Undertaking Submitted Successfully
                </Heading>
                <Text size="2" color="gray" align="center">
                  Your anti-ragging undertaking has been recorded and is now on file.
                </Text>
              </Flex>
            </Card>

            {/* Details Card */}
            <Card size="3">
              <Flex direction="column" gap="4" p={{ initial: '2', sm: '3' }}>
                <Heading size="3">Submission Details</Heading>
                <Separator size="4" />

                <Box
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {/* Signed By */}
                  <Flex direction="column" gap="1">
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Signed By
                    </Text>
                    <Text size="3" weight="bold">
                      {existingConsent.fullName}
                    </Text>
                  </Flex>

                  {/* Date & Time */}
                  <Flex direction="column" gap="1">
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Date & Time
                    </Text>
                    <Text size="3" weight="bold">
                      {new Date(existingConsent.signedAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text size="2" color="gray">
                      {new Date(existingConsent.signedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Flex>

                  {/* Reference ID */}
                  <Flex direction="column" gap="1">
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Reference ID
                    </Text>
                    <Badge color="green" size="2" variant="soft" style={{ width: 'fit-content' }}>
                      {existingConsent.id.slice(-8).toUpperCase()}
                    </Badge>
                  </Flex>

                  {/* Status */}
                  <Flex direction="column" gap="1">
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Status
                    </Text>
                    <Badge color="green" size="2" variant="solid" style={{ width: 'fit-content' }}>
                      ✓ Verified & On Record
                    </Badge>
                  </Flex>
                </Box>
              </Flex>
            </Card>

            {/* Action Buttons */}
            <Flex gap="3" direction={{ initial: 'column', sm: 'row' }}>
              <Link href="/dashboard" style={{ flex: 1 }}>
                <Button variant="solid" size="3" style={{ width: '100%' }}>
                  Return to Dashboard
                </Button>
              </Link>
              <Button size="3" variant="outline" disabled style={{ flex: 1 }}>
                <DownloadIcon /> Download Copy (Coming Soon)
              </Button>
            </Flex>
          </Flex>
        ) : (
          // Form View
          <ConsentForm fullName={fullName} studentId={studentId} course={course} />
        )}
      </Container>
      <PageFooter />
    </div>
  );
}
