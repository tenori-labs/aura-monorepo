export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import {
    Badge,
    Box,
    Button,
    Card,
    Flex,
    Heading,
    Separator,
    Text,
} from '@radix-ui/themes';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { getCurrentUser } from '@/lib/auth/server';
import { getPublicIssues, getPendingCount } from './bulletin-actions';
import { BulletinResponseForm } from '@/components/bulletin-response-form';

/**
 * Public bulletin board page.
 *
 * Displays promoted community issues, institution responses with
 * "Verified Responder" badges, and an admin response form.
 * Fetches fresh data on every request via force-dynamic.
 */
export default async function BulletinPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/');
    }

    const userRole = user.role;
    const isUserAdmin = userRole === 'admin';
    const [issues, { count: pendingCount }] = await Promise.all([
        getPublicIssues(),
        getPendingCount(),
    ]);

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
                title="Bulletin Board"
                subtitle="Community Issues & Responses"
                userRole={userRole}
            />

            <Flex
                direction="column"
                gap="5"
                px={{ initial: '4', sm: '6' }}
                py="5"
                style={{ flex: 1, overflow: 'auto', maxWidth: '900px', width: '100%', margin: '0 auto' }}
            >
                {/* Notification Banner */}
                <Card size="2" style={{ background: 'var(--accent-a2)' }}>
                    <Flex align="center" justify="between" wrap="wrap" gap="3">
                        <Flex direction="column" gap="1">
                            <Flex align="center" gap="2">
                                <Text size="3" weight="bold">
                                    Community Pulse
                                </Text>
                                {pendingCount > 0 && (
                                    <Badge color="orange" variant="solid" radius="full">
                                        {pendingCount} tracking
                                    </Badge>
                                )}
                            </Flex>
                            <Text size="2" color="gray">
                                {pendingCount > 0
                                    ? `${pendingCount} issue${pendingCount === 1 ? ' is' : 's are'} currently being tracked by the community.`
                                    : 'No issues are currently being tracked.'}
                            </Text>
                        </Flex>
                        <Link href="/bulletin/submit">
                            <Button size="2">Submit Grievance</Button>
                        </Link>
                    </Flex>
                </Card>

                {/* Promoted Issues */}
                <Flex direction="column" gap="2">
                    <Heading size="4">Public Issues</Heading>
                    <Text size="2" color="gray">
                        Issues reaching the community threshold are published here.
                    </Text>
                </Flex>

                {issues.length === 0 ? (
                    <Card size="2">
                        <Flex direction="column" align="center" gap="2" py="5">
                            <Text size="3" color="gray" weight="medium">
                                No public issues yet
                            </Text>
                            <Text size="2" color="gray">
                                Issues will appear here once enough community members report them.
                            </Text>
                        </Flex>
                    </Card>
                ) : (
                    <Flex direction="column" gap="4">
                        {issues.map((issue: { id: string; title: string; summary: string; status: string; uniqueCount: number; responses: { id: string; message: string; createdAt: Date; newStatus: string }[] }) => (
                            <Card key={issue.id} size="2">
                                <Flex direction="column" gap="3">
                                    {/* Issue Header */}
                                    <Flex justify="between" align="start" wrap="wrap" gap="2">
                                        <Flex direction="column" gap="1" style={{ flex: 1 }}>
                                            <Heading size="3">{issue.title}</Heading>
                                            <Text size="2" color="gray">
                                                {issue.summary}
                                            </Text>
                                        </Flex>
                                        <Flex gap="2" align="center">
                                            <Badge
                                                color={
                                                    issue.status === 'resolved'
                                                        ? 'green'
                                                        : issue.status === 'investigating'
                                                            ? 'blue'
                                                            : issue.status === 'acknowledged'
                                                                ? 'orange'
                                                                : 'gray'
                                                }
                                                variant="soft"
                                                size="2"
                                            >
                                                {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                                            </Badge>
                                            <Badge color="lime" variant="outline">
                                                {issue.uniqueCount} reports
                                            </Badge>
                                        </Flex>
                                    </Flex>

                                    {/* Response Timeline */}
                                    {issue.responses.length > 0 && (
                                        <>
                                            <Separator size="4" />
                                            <Flex direction="column" gap="2">
                                                <Text size="2" weight="bold">
                                                    Responses
                                                </Text>
                                                {issue.responses.map((response) => (
                                                    <Box
                                                        key={response.id}
                                                        p="3"
                                                        style={{
                                                            background: 'var(--gray-a2)',
                                                            borderRadius: 'var(--radius-2)',
                                                            borderLeft: '3px solid var(--accent-9)',
                                                        }}
                                                    >
                                                        <Flex justify="between" align="center" mb="1">
                                                            <Flex align="center" gap="2">
                                                                <Badge color="green" variant="solid" size="1">
                                                                    Verified Responder
                                                                </Badge>
                                                            </Flex>
                                                            <Text size="1" color="gray">
                                                                {new Date(response.createdAt).toLocaleDateString()}
                                                            </Text>
                                                        </Flex>
                                                        <Text size="2">{response.message}</Text>
                                                    </Box>
                                                ))}
                                            </Flex>
                                        </>
                                    )}

                                    {/* Admin Response Form */}
                                    {isUserAdmin && (
                                        <>
                                            <Separator size="4" />
                                            <BulletinResponseForm issueId={issue.id} currentStatus={issue.status} />
                                        </>
                                    )}
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                )}
            </Flex>

            <PageFooter />
        </div>
    );
}
