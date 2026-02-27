'use client';

import { Button, Flex } from '@radix-ui/themes';
import { useState } from 'react';
import { Spinner } from '@/components/spinner';
import { generateRedReport } from '@/lib/ai/flows/red-report';

/**
 * Client-side button that triggers Red Report PDF generation and
 * downloads it via a data URI. Shown on the shadow case detail page
 * when a Vc score exists.
 */
export function DownloadRedReport({ shadowCaseId }: { shadowCaseId: string }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleDownload() {
        setLoading(true);
        setError(null);

        try {
            const result = await generateRedReport(shadowCaseId);

            if ('error' in result) {
                setError(result.error);
                return;
            }

            // Trigger browser download
            const link = document.createElement('a');
            link.href = result.pdf;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            setError('Failed to generate report. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Flex direction="column" gap="2">
            <Button
                size="3"
                variant="solid"
                color="red"
                onClick={handleDownload}
                disabled={loading}
                style={{ cursor: loading ? 'wait' : 'pointer' }}
            >
                {loading ? (
                    <>
                        <Spinner /> Generating Report...
                    </>
                ) : (
                    'Download Red Report (PDF)'
                )}
            </Button>
            {error && (
                <span style={{ color: 'var(--red-9)', fontSize: '12px' }}>
                    {error}
                </span>
            )}
        </Flex>
    );
}
