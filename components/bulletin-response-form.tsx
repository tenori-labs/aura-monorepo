'use client';

import { useState } from 'react';
import { Box, Button, Flex, Select, Text, TextArea } from '@radix-ui/themes';
import { respondToIssue } from '@/app/bulletin/bulletin-actions';

/**
 * Props for the BulletinResponseForm component.
 * @property issueId - The CoreIssue ID to respond to
 * @property currentStatus - The current status of the issue (for pre-populating the dropdown)
 */
interface BulletinResponseFormProps {
    issueId: string;
    currentStatus: string;
}

/**
 * Admin response form for promoted bulletin issues.
 *
 * Allows administrators to submit a response message and update
 * the issue status. Responses are displayed with a "Verified Responder"
 * badge on the bulletin board.
 */
export function BulletinResponseForm({ issueId, currentStatus }: BulletinResponseFormProps) {
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);

    const handleSubmit = async () => {
        setLoading(true);
        setResult(null);
        const res = await respondToIssue(issueId, message, status);
        setResult(res);
        setLoading(false);
        if ('success' in res) {
            setMessage('');
        }
    };

    return (
        <Flex direction="column" gap="2">
            <Text size="2" weight="bold" color="gray">
                Respond as Admin
            </Text>
            <TextArea
                placeholder="Type your institutional response..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
            />
            <Flex gap="2" align="end">
                <Box style={{ flex: 1 }}>
                    <Text size="1" color="gray" mb="1" style={{ display: 'block' }}>
                        Update status
                    </Text>
                    <Select.Root value={status} onValueChange={setStatus}>
                        <Select.Trigger style={{ width: '100%' }} />
                        <Select.Content>
                            <Select.Item value="pending">Pending</Select.Item>
                            <Select.Item value="acknowledged">Acknowledged</Select.Item>
                            <Select.Item value="investigating">Investigating</Select.Item>
                            <Select.Item value="resolved">Resolved</Select.Item>
                        </Select.Content>
                    </Select.Root>
                </Box>
                <Button onClick={handleSubmit} disabled={loading || message.trim().length < 5}>
                    {loading ? 'Sending...' : 'Respond'}
                </Button>
            </Flex>
            {result?.error && (
                <Text size="1" color="red">
                    {result.error}
                </Text>
            )}
            {result?.success && (
                <Text size="1" color="green">
                    Response submitted
                </Text>
            )}
        </Flex>
    );
}
