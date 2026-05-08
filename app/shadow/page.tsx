export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import {
    Badge,
    Card,
    Flex,
    Heading,
    Separator,
    Text,
} from '@radix-ui/themes';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { getCurrentUser } from '@/lib/auth/server';
import { getShadowCases } from './shadow-actions';
import Link from 'next/link';

/**
 * Admin-only shadow cases dashboard.
 */
export default async function ShadowCasesPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/');
    }

    if (user.role !== 'admin') {
        redirect('/dashboard');
    }
    const userRole = user.role;

    const result = await getShadowCases();

    if ('error' in result) {
        redirect('/dashboard');
    }

    const cases = result.cases;

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
                title="Shadow Cases"
                subtitle="Private Investigation Dockets"
                userRole={userRole}
            />

            <Flex
                direction="column"
                gap="5"
                px={{ initial: '4', sm: '6' }}
                py="5"
                style={{ flex: 1, overflow: 'auto', maxWidth: '900px', width: '100%', margin: '0 auto' }}
            >
                {/* Summary Banner */}
                <Card size="2" style={{ background: 'var(--red-a2)' }}>
                    <Flex align="center" justify="between" wrap="wrap" gap="3">
                        <Flex direction="column" gap="1">
                            <Text size="3" weight="bold">
                                Shadow Trigger Cases
                            </Text>
                            <Text size="2" color="gray">
                                {cases.length === 0
                                    ? 'No active shadow cases.'
                                    : `${cases.length} case${cases.length === 1 ? '' : 's'} under investigation.`}
                            </Text>
                        </Flex>
                        {cases.filter((c: { status: string }) => c.status === 'collecting').length > 0 && (
                            <Badge color="orange" variant="solid" radius="full">
                                {cases.filter((c: { status: string }) => c.status === 'collecting').length} collecting
                            </Badge>
                        )}
                    </Flex>
                </Card>

                {/* Case List */}
                {cases.length === 0 ? (
                    <Card size="2">
                        <Flex direction="column" align="center" gap="2" py="5">
                            <Text size="3" color="gray" weight="medium">
                                No shadow cases yet
                            </Text>
                            <Text size="2" color="gray">
                                Cases appear when grievances contain personal names or safety keywords.
                            </Text>
                        </Flex>
                    </Card>
                ) : (
                    <Flex direction="column" gap="4">
                        {cases.map((sc: { id: string; entityName: string; reportCount: number; threshold: number; status: string; createdAt: Date; updatedAt: Date }) => (
                            <Link key={sc.id} href={`/shadow/${sc.id}`} style={{ textDecoration: 'none' }}>
                                <Card size="2" style={{ cursor: 'pointer' }}>
                                    <Flex direction="column" gap="2">
                                        <Flex justify="between" align="center" wrap="wrap" gap="2">
                                            <Heading size="3">{sc.entityName}</Heading>
                                            <Flex gap="2" align="center">
                                                <Badge
                                                    color={
                                                        sc.status === 'escalated'
                                                            ? 'red'
                                                            : sc.status === 'interrogating'
                                                                ? 'blue'
                                                                : sc.status === 'flagged_collusion'
                                                                    ? 'orange'
                                                                    : sc.status === 'closed'
                                                                        ? 'green'
                                                                        : 'gray'
                                                    }
                                                    variant="soft"
                                                    size="2"
                                                >
                                                    {sc.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                                </Badge>
                                                <Badge color="crimson" variant="outline">
                                                    {sc.reportCount}/{sc.threshold} reports
                                                </Badge>
                                            </Flex>
                                        </Flex>
                                        <Separator size="4" />
                                        <Flex justify="between">
                                            <Text size="1" color="gray">
                                                Created: {new Date(sc.createdAt).toLocaleDateString()}
                                            </Text>
                                            <Text size="1" color="gray">
                                                Updated: {new Date(sc.updatedAt).toLocaleDateString()}
                                            </Text>
                                        </Flex>
                                    </Flex>
                                </Card>
                            </Link>
                        ))}
                    </Flex>
                )}
            </Flex>

            <PageFooter />
        </div>
    );
}
