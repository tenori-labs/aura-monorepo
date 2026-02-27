export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
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
import { getUserRole } from '@/lib/roles';
import { getShadowCaseDetail } from '../shadow-actions';
import { DownloadRedReport } from './download-red-report';

/**
 * Admin detail page for a single shadow case.
 *
 * Displays entity name, Vc score with color-coded badge, individual
 * reports with keywords/names, and the consistency engine breakdown.
 */
export default async function ShadowCaseDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/');
    const userRole = getUserRole(user);
    if (userRole !== 'admin') redirect('/dashboard');

    const result = await getShadowCaseDetail(id);
    if ('error' in result) redirect('/shadow');

    const sc = result.shadowCase;
    const vcDetails = sc.vcDetails as {
        timeScore?: number;
        locationScore?: number;
        actionScore?: number;
        witnessOverlap?: number;
        decision?: string;
    } | null;

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
                title="Case Detail"
                subtitle={sc.entityName}
                userRole={userRole}
            />

            <Flex
                direction="column"
                gap="5"
                px={{ initial: '4', sm: '6' }}
                py="5"
                style={{
                    flex: 1,
                    overflow: 'auto',
                    maxWidth: '900px',
                    width: '100%',
                    margin: '0 auto',
                }}
            >
                {/* Case Summary */}
                <Card size="2">
                    <Flex direction="column" gap="3">
                        <Flex justify="between" align="center" wrap="wrap" gap="2">
                            <Heading size="4">{sc.entityName}</Heading>
                            <Flex gap="2">
                                <Badge
                                    color={
                                        sc.status === 'escalated'
                                            ? 'red'
                                            : sc.status === 'flagged_collusion'
                                                ? 'orange'
                                                : sc.status === 'interrogating'
                                                    ? 'blue'
                                                    : sc.status === 'closed'
                                                        ? 'green'
                                                        : 'gray'
                                    }
                                    variant="solid"
                                    size="2"
                                >
                                    {sc.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </Badge>
                                <Badge color="crimson" variant="outline">
                                    {sc.reportCount}/{sc.threshold} reports
                                </Badge>
                            </Flex>
                        </Flex>
                    </Flex>
                </Card>

                {/* Vc Score Card */}
                {sc.vcScore !== null && sc.vcScore !== undefined && (
                    <Card size="2" style={{
                        background: sc.vcScore > 0.75
                            ? 'var(--red-a2)'
                            : sc.vcScore < 0.40
                                ? 'var(--orange-a2)'
                                : 'var(--blue-a2)',
                    }}>
                        <Flex direction="column" gap="2">
                            <Flex justify="between" align="center">
                                <Heading size="3">Verification Coefficient (Vc)</Heading>
                                <Badge
                                    color={
                                        sc.vcScore > 0.75
                                            ? 'red'
                                            : sc.vcScore < 0.40
                                                ? 'orange'
                                                : 'blue'
                                    }
                                    variant="solid"
                                    size="3"
                                >
                                    {sc.vcScore.toFixed(3)}
                                </Badge>
                            </Flex>
                            <Text size="2" color="gray">
                                {sc.vcScore > 0.75
                                    ? 'Auto-escalated: High consistency across reports.'
                                    : sc.vcScore < 0.40
                                        ? 'Flagged: Low consistency may indicate potential collusion.'
                                        : 'Moderate consistency: Admin review recommended.'}
                            </Text>
                            {vcDetails && (
                                <>
                                    <Separator size="4" />
                                    <Flex gap="4" wrap="wrap">
                                        <Flex direction="column" gap="1">
                                            <Text size="1" color="gray">Time Similarity</Text>
                                            <Text size="2" weight="bold">{(vcDetails.timeScore ?? 0).toFixed(2)}</Text>
                                        </Flex>
                                        <Flex direction="column" gap="1">
                                            <Text size="1" color="gray">Location Similarity</Text>
                                            <Text size="2" weight="bold">{(vcDetails.locationScore ?? 0).toFixed(2)}</Text>
                                        </Flex>
                                        <Flex direction="column" gap="1">
                                            <Text size="1" color="gray">Action Similarity</Text>
                                            <Text size="2" weight="bold">{(vcDetails.actionScore ?? 0).toFixed(2)}</Text>
                                        </Flex>
                                        <Flex direction="column" gap="1">
                                            <Text size="1" color="gray">Witness Cross-Ref</Text>
                                            <Text size="2" weight="bold">{(vcDetails.witnessOverlap ?? 0).toFixed(2)}</Text>
                                        </Flex>
                                    </Flex>
                                </>
                            )}
                        </Flex>
                    </Card>
                )}

                {/* Download Red Report */}
                {sc.vcScore !== null && sc.vcScore !== undefined && (
                    <DownloadRedReport shadowCaseId={id} />
                )}

                {/* Individual Reports */}
                <Heading size="3">Reports ({sc.reports.length})</Heading>
                <Flex direction="column" gap="3">
                    {sc.reports.map((report: { id: string; text: string; detectedNames: string[]; keywords: string[]; createdAt: Date }) => (
                        <Card key={report.id} size="1">
                            <Flex direction="column" gap="2">
                                <Text size="2">{report.text}</Text>
                                <Separator size="4" />
                                <Flex gap="2" wrap="wrap">
                                    {report.detectedNames.map((name: string, i: number) => (
                                        <Badge key={i} color="red" variant="soft" size="1">
                                            {name}
                                        </Badge>
                                    ))}
                                    {report.keywords.map((kw: string, i: number) => (
                                        <Badge key={i} color="orange" variant="outline" size="1">
                                            {kw}
                                        </Badge>
                                    ))}
                                </Flex>
                                <Text size="1" color="gray">
                                    {new Date(report.createdAt).toLocaleString()}
                                </Text>
                            </Flex>
                        </Card>
                    ))}
                </Flex>
            </Flex>

            <PageFooter />
        </div>
    );
}
