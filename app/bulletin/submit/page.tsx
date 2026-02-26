'use client';

import { Box, Button, Card, Flex, Heading, Text, TextArea } from '@radix-ui/themes';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { submitGrievance } from '../bulletin-actions';
import { useActionState } from 'react';

/**
 * Form component for submitting anonymous grievances.
 * Uses React's useActionState for form state management.
 * Displays success/error feedback after submission.
 */
function SubmitGrievanceForm() {
    const [state, action, isPending] = useActionState(
        async (_prev: { error?: string; success?: boolean; isNew?: boolean } | null, formData: FormData) => {
            return submitGrievance(formData);
        },
        null
    );

    return (
        <Card size="2">
            <form action={action}>
                <Flex direction="column" gap="4">
                    <Box>
                        <Text as="label" htmlFor="grievance-text" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                            Describe the issue
                        </Text>
                        <Text size="1" color="gray" mb="2" style={{ display: 'block' }}>
                            Focus on the systemic problem (infrastructure, policy, operations). Do not include personal names.
                        </Text>
                        <TextArea
                            id="grievance-text"
                            name="text"
                            placeholder="e.g., The library AC has been broken for two weeks and the study hall is too hot to focus..."
                            required
                            minLength={10}
                            maxLength={500}
                            rows={5}
                            style={{ width: '100%' }}
                        />
                    </Box>

                    {state && 'error' in state && state.error && (
                        <Box p="3" style={{ background: 'var(--red-a3)', borderRadius: 'var(--radius-2)' }}>
                            <Text size="2" color="red">
                                {state.error}
                            </Text>
                        </Box>
                    )}

                    {state && 'success' in state && state.success && (
                        <Box p="3" style={{ background: 'var(--green-a3)', borderRadius: 'var(--radius-2)' }}>
                            <Text size="2" color="green" weight="bold">
                                Your voice has been counted. Your grievance has been recorded anonymously.
                            </Text>
                        </Box>
                    )}

                    <Button type="submit" size="3" disabled={isPending}>
                        {isPending ? 'Submitting...' : 'Submit Grievance'}
                    </Button>
                </Flex>
            </form>
        </Card>
    );
}

/**
 * Grievance submission page.
 *
 * Allows any authenticated user to submit anonymous grievances
 * about institutional issues. Includes an explainer card describing
 * how the clustering and promotion pipeline works.
 */
export default function SubmitGrievancePage() {
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
            <PageHeader title="Submit Grievance" subtitle="Report an institutional issue anonymously" />

            <Flex
                direction="column"
                gap="5"
                px={{ initial: '4', sm: '6' }}
                py="5"
                style={{ flex: 1, overflow: 'auto', maxWidth: '600px', width: '100%', margin: '0 auto' }}
            >
                <Flex direction="column" gap="2">
                    <Heading size="4">Submit a Grievance</Heading>
                    <Text size="2" color="gray">
                        Report issues about campus infrastructure, policy, or operations. Your identity is never
                        linked to your submission. Similar grievances are clustered together — once enough people
                        report the same issue, it becomes public on the bulletin board.
                    </Text>
                </Flex>

                <SubmitGrievanceForm />

                <Card size="1" style={{ background: 'var(--gray-a2)' }}>
                    <Flex direction="column" gap="1">
                        <Text size="1" weight="bold" color="gray">
                            How it works:
                        </Text>
                        <Text size="1" color="gray">
                            1. Your grievance is analyzed by AI and grouped with similar reports
                        </Text>
                        <Text size="1" color="gray">
                            2. Once 10 people report the same issue, it is published on the bulletin
                        </Text>
                        <Text size="1" color="gray">
                            3. Individual texts are purged — only the AI summary remains
                        </Text>
                        <Text size="1" color="gray">
                            4. The institution can publicly respond to published issues
                        </Text>
                    </Flex>
                </Card>
            </Flex>

            <PageFooter />
        </div>
    );
}
