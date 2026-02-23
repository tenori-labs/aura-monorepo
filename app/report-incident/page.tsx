'use client';

import {
  Container,
  Heading,
  Text,
  Card,
  Flex,
  Box,
  Button,
  TextField,
  TextArea,
  Select,
  Separator,
  Dialog,
} from '@radix-ui/themes';
import { submitIncident } from './actions';
import { useState, useActionState } from 'react';
import { PageHeader } from '@/components/page-header';
import { PageFooter } from '@/components/page-footer';
import { AiClassifierResult, AiResult } from '@/components/ai-classifier-result';

const INCIDENT_TYPES = [
  'Academic Integrity',
  'Harassment/Bullying',
  'Safety/Security',
  'Medical Emergency',
  'Facilities Issue',
  'Other',
];

export interface IncidentState {
  success: boolean;
  message: string;
  aiAnalysis?: AiResult | null;
  error?: string;
}

const initialState: IncidentState = {
  success: false,
  message: '',
  aiAnalysis: null,
  error: undefined,
};

export default function ReportIncidentPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<IncidentState, FormData>(
    submitIncident as unknown as (
      state: IncidentState,
      payload: FormData
    ) => Promise<IncidentState> | IncidentState,
    initialState
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Added isDialogOpen state

  const [prevAiAnalysis, setPrevAiAnalysis] = useState(state.aiAnalysis);

  // Open dialog when AI analysis is received (Derive state during render to avoid cascading renders)
  if (state.aiAnalysis !== prevAiAnalysis) {
    setPrevAiAnalysis(state.aiAnalysis);
    if (state.aiAnalysis) {
      setIsDialogOpen(true);
    }
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'var(--gray-a2)',
      }}
    >
      <PageHeader title="Report Incident" />

      {/* Main Content */}
      <Container size="2" p="4" style={{ marginTop: '20px' }}>
        <Flex direction="column" gap="4">
          {/* AI Analysis Result Popup */}
          <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Dialog.Content style={{ maxWidth: 450 }}>
              <Dialog.Title>AI Analysis Result</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Our AI has analyzed your report. Here are the findings:
              </Dialog.Description>

              {state.aiAnalysis && <AiClassifierResult result={state.aiAnalysis} />}

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Close
                  </Button>
                </Dialog.Close>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>

          <Card size="4">
            <Flex direction="column" gap="5">
              <Box>
                <Heading size="6" mb="2">
                  Report an Incident
                </Heading>
                <Text size="2" color="gray">
                  Your report is important. Please provide accurate and detailed information. You
                  can choose to remain anonymous.
                </Text>
              </Box>

              <form action={formAction}>
                <Flex direction="column" gap="5">
                  {/* Type of Incident */}
                  <Box>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Type of Incident
                    </Text>
                    <Select.Root name="type" defaultValue={INCIDENT_TYPES[0]}>
                      <Select.Trigger
                        placeholder="Select an incident type"
                        style={{ width: '100%' }}
                      />
                      <Select.Content position="popper">
                        {INCIDENT_TYPES.map((type) => (
                          <Select.Item key={type} value={type}>
                            {type}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    <Text size="1" color="gray" mt="1">
                      Choose the category that best describes the incident.
                    </Text>
                  </Box>

                  {/* Date and Time */}
                  <Box>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Date and Time of Incident
                    </Text>
                    <input
                      type="datetime-local"
                      name="date"
                      required
                      max={new Date().toISOString().slice(0, 16)}
                      style={{
                        width: '100%',
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-2)',
                        border: '1px solid var(--gray-a7)',
                        background: 'var(--color-background)',
                        color: 'var(--gray-12)',
                        fontSize: 'var(--font-size-2)',
                      }}
                    />
                    <Text size="1" color="gray" mt="1">
                      When did the incident occur?
                    </Text>
                  </Box>

                  {/* Location */}
                  <Box>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Location of Incident
                    </Text>
                    <TextField.Root
                      name="location"
                      placeholder="e.g., Library, North Quad, Online Platform"
                      required
                      size="3"
                    />
                    <Text size="1" color="gray" mt="1">
                      Be as specific as possible.
                    </Text>
                  </Box>

                  {/* Description */}
                  <Box>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Description of Incident
                    </Text>
                    <TextArea
                      name="description"
                      placeholder="Provide a detailed account of what happened..."
                      required
                      size="3"
                      style={{ minHeight: '120px' }}
                    />
                    <Text size="1" color="gray" mt="1">
                      Please be factual and objective.
                    </Text>
                  </Box>

                  {/* File Upload */}
                  <Box>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Attach Image or Video (Optional)
                    </Text>
                    <Box
                      style={{
                        border: '2px dashed var(--gray-a6)',
                        borderRadius: 'var(--radius-3)',
                        padding: '20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-a3)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <input
                        type="file"
                        name="media"
                        accept="image/*,video/*"
                        onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          cursor: 'pointer',
                        }}
                      />
                      <Flex direction="column" align="center" gap="2">
                        <Text weight="medium">
                          {fileName ? fileName : 'Click to upload or drag and drop'}
                        </Text>
                        <Text size="1" color="gray">
                          Image or Video (MAX. 5MB)
                        </Text>
                      </Flex>
                    </Box>
                  </Box>

                  {/* Email (Optional) */}
                  <Box>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Your Email (Optional)
                    </Text>
                    <TextField.Root
                      name="email"
                      type="email"
                      placeholder="your.email@example.com"
                      size="3"
                    />
                    <Text size="1" color="gray" mt="1">
                      If provided, it will only be used for follow-up if necessary.
                    </Text>
                  </Box>

                  <Separator size="4" />

                  <Button size="3" type="submit" disabled={isPending}>
                    {isPending ? 'Submitting...' : 'Submit Report'}
                  </Button>
                  {state.error && (
                    <Text color="red" size="2">
                      {state.error}
                    </Text>
                  )}
                </Flex>
              </form>
            </Flex>
          </Card>
        </Flex>
        <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
      </Container>
      <PageFooter />
    </Box>
  );
}
