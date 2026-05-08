'use client';

import { useState } from 'react';
import { Badge, Box, Card, Dialog, Flex, Separator, Table, Text } from '@radix-ui/themes';
import { Button } from '@radix-ui/themes';
import { IncidentTimeline } from '@/components/incident-timeline';
import { isIncidentBreached, statusLabel, type SlaConfig } from '@/lib/sla';
import { normalizeLegacyStatus } from '@/app/faculty-dashboard/incident-validation';

interface AiAnalysis {
  category: string;
  confidence: number;
  keywords: string[];
  validity: string;
  validityReason: string;
}

interface IncidentReport {
  id: string;
  userId: string | null;
  userEmail: string | null;
  incidentType: string;
  dateTime: string;
  location: string;
  description: string;
  email: string | null;
  mediaBase64: string | null;
  mediaType: string | null;
  mediaFileName: string | null;
  aiAnalysis: AiAnalysis | null;
  status: string;
  acknowledgedAt: string | null;
  investigatingAt: string | null;
  resolvedAt: string | null;
  assignedTo: string | null;
  assignedToEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  incidents: IncidentReport[];
  categoryAssignments: Record<string, string>;
  sla: SlaConfig;
}

function getStatusColor(status: string) {
  switch (normalizeLegacyStatus(status)) {
    case 'submitted':
      return 'blue' as const;
    case 'acknowledged':
      return 'violet' as const;
    case 'investigating':
      return 'orange' as const;
    case 'resolved':
      return 'green' as const;
    default:
      return 'gray' as const;
  }
}

function getValidityColor(validity: string) {
  if (validity === 'Likely Valid') return 'green' as const;
  if (validity === 'Needs Review') return 'orange' as const;
  return 'red' as const;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortId(id: string) {
  return id.length > 8 ? `#${id.slice(-6).toUpperCase()}` : `#${id}`;
}

export function StudentIncidentDialog({ incidents, categoryAssignments, sla }: Props) {
  const [selected, setSelected] = useState<IncidentReport | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <>
      {/* ─── Detail Popup Dialog ─── */}
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setShowTimeline(false);
          }
        }}
      >
        <Dialog.Content
          style={{
            maxWidth: 520,
            width: 'calc(100vw - 32px)',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
          }}
        >
          {selected && (
            <>
              {/* ─── Sticky Header ─── */}
              <Box
                px="4"
                pt="4"
                pb="3"
                style={{
                  borderBottom: '1px solid var(--gray-a4)',
                  flexShrink: 0,
                }}
              >
                <Dialog.Title mb="1">
                  <Flex align="center" gap="2" wrap="wrap">
                    <Text style={{ fontFamily: 'monospace' }} size={{ initial: '3', sm: '4' }}>
                      {shortId(selected.id)}
                    </Text>
                    <Badge
                      color={getStatusColor(selected.status)}
                      size="2"
                      variant="soft"
                      style={{ textTransform: 'capitalize' }}
                    >
                      {statusLabel(normalizeLegacyStatus(selected.status))}
                    </Badge>
                    {isIncidentBreached(selected, sla) && (
                      <Badge color="red" size="2" variant="solid">
                        SLA Breached
                      </Badge>
                    )}
                  </Flex>
                </Dialog.Title>
                <Dialog.Description size="2" color="gray">
                  Submitted on {formatDateTime(selected.createdAt)}
                </Dialog.Description>
              </Box>

              {/* ─── Scrollable Body ─── */}
              <Box
                px="4"
                py="3"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {/* Report Details */}
                <Flex direction="column" gap="3">
                  <Box>
                    <Text size="1" color="gray" mb="1" style={{ display: 'block' }}>
                      Type
                    </Text>
                    <Text size="2" weight="medium">
                      {selected.incidentType}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="1" color="gray" mb="1" style={{ display: 'block' }}>
                      Location
                    </Text>
                    <Text size="2" weight="medium">
                      {selected.location}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="1" color="gray" mb="1" style={{ display: 'block' }}>
                      Incident Date
                    </Text>
                    <Text size="2" weight="medium">
                      {formatDateTime(selected.dateTime)}
                    </Text>
                  </Box>
                </Flex>

                <Separator size="4" my="3" />

                {/* Description */}
                <Text size="1" color="gray" mb="1" style={{ display: 'block' }}>
                  Description
                </Text>
                <Box
                  p="3"
                  style={{
                    background: 'var(--gray-a2)',
                    borderRadius: 'var(--radius-2)',
                    maxHeight: '120px',
                    overflowY: 'auto',
                  }}
                >
                  <Text size="2" style={{ lineHeight: 1.6 }}>
                    {selected.description}
                  </Text>
                </Box>

                {/* AI Analysis Section */}
                {selected.aiAnalysis && (
                  <>
                    <Separator size="4" my="3" />
                    <Text size="2" weight="bold" mb="2" style={{ display: 'block' }}>
                      AI Analysis
                    </Text>
                    <Card variant="surface" size="1">
                      <Flex direction="column" gap="3">
                        <Flex justify="between" align="center" gap="2">
                          <Text size="2" color="gray">
                            Category
                          </Text>
                          <Badge variant="surface" size="2">
                            {selected.aiAnalysis.category}
                          </Badge>
                        </Flex>
                        <Flex justify="between" align="center" gap="2">
                          <Text size="2" color="gray">
                            Confidence
                          </Text>
                          <Text size="2" weight="bold">
                            {Math.round(selected.aiAnalysis.confidence * 100)}%
                          </Text>
                        </Flex>
                        <Flex justify="between" align="center" gap="2">
                          <Text size="2" color="gray">
                            Validity
                          </Text>
                          <Badge
                            color={getValidityColor(selected.aiAnalysis.validity)}
                            size="2"
                            variant="soft"
                          >
                            {selected.aiAnalysis.validity}
                          </Badge>
                        </Flex>
                        <Separator size="4" />
                        <Box>
                          <Text size="1" color="gray" mb="1" style={{ display: 'block' }}>
                            Reason
                          </Text>
                          <Text size="2" style={{ lineHeight: 1.6 }}>
                            {selected.aiAnalysis.validityReason}
                          </Text>
                        </Box>
                        <Separator size="4" />
                        <Box>
                          <Text size="1" color="gray" mb="1" style={{ display: 'block' }}>
                            Keywords
                          </Text>
                          <Flex gap="2" wrap="wrap">
                            {selected.aiAnalysis.keywords.map((kw) => (
                              <Badge key={kw} variant="soft" color="gray" size="2">
                                {kw}
                              </Badge>
                            ))}
                          </Flex>
                        </Box>
                      </Flex>
                    </Card>
                  </>
                )}

                {/* Media Attachment */}
                {selected.mediaFileName && (
                  <>
                    <Separator size="4" my="3" />
                    <Box>
                      <Text size="1" color="gray" mb="1" style={{ display: 'block' }}>
                        Attachment
                      </Text>
                      <Badge variant="soft" size="2">
                        {selected.mediaFileName}
                      </Badge>
                    </Box>
                  </>
                )}
              </Box>

              {/* ─── Sticky Footer ─── */}
              <Box
                px="4"
                py="3"
                style={{
                  borderTop: '1px solid var(--gray-a4)',
                  flexShrink: 0,
                }}
              >
                <Flex direction="column" gap="2">
                  <Button
                    variant="solid"
                    size="3"
                    style={{ width: '100%' }}
                    onClick={() => setShowTimeline(true)}
                  >
                    View Status Timeline
                  </Button>
                  <Dialog.Close>
                    <Button variant="soft" color="gray" size="3" style={{ width: '100%' }}>
                      Close
                    </Button>
                  </Dialog.Close>
                </Flex>
              </Box>
            </>
          )}
        </Dialog.Content>
      </Dialog.Root>

      {/* ─── Status Timeline Dialog (nested) ─── */}
      <Dialog.Root
        open={showTimeline}
        onOpenChange={(open) => {
          if (!open) setShowTimeline(false);
        }}
      >
        <Dialog.Content
          style={{
            maxWidth: 400,
            width: 'calc(100vw - 32px)',
            maxHeight: '80vh',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            px="4"
            pt="4"
            pb="3"
            style={{ borderBottom: '1px solid var(--gray-a4)', flexShrink: 0 }}
          >
            <Dialog.Title mb="1">
              <Text size={{ initial: '3', sm: '4' }} weight="bold">
                Report Status
              </Text>
            </Dialog.Title>
            <Dialog.Description size="2" color="gray">
              {selected ? shortId(selected.id) : ''}
            </Dialog.Description>
          </Box>
          <Box px="4" py="3" style={{ flex: 1, overflowY: 'auto' }}>
            {selected && (
              <IncidentTimeline
                incident={selected}
                sla={sla}
                assignedTo={
                  categoryAssignments[selected.incidentType] ?? selected.assignedToEmail ?? null
                }
              />
            )}
          </Box>
          <Box px="4" py="3" style={{ borderTop: '1px solid var(--gray-a4)', flexShrink: 0 }}>
            <Button
              variant="soft"
              color="gray"
              size="3"
              style={{ width: '100%' }}
              onClick={() => setShowTimeline(false)}
            >
              Back
            </Button>
          </Box>
        </Dialog.Content>
      </Dialog.Root>

      {/* ─── Reports Table (desktop) ─── */}
      <Card size="2" style={{ overflow: 'hidden' }} className="hide-on-mobile">
        <Box style={{ overflowX: 'auto' }}>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Report ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Location</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Date Reported</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>AI Validity</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {incidents.map((incident) => (
                <Table.Row
                  key={incident.id}
                  onClick={() => setSelected(incident)}
                  style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-a3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Table.Cell>
                    <Text size="2" weight="medium" style={{ fontFamily: 'monospace' }}>
                      {shortId(incident.id)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{incident.incidentType}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{incident.location}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{formatDate(incident.createdAt)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={getStatusColor(incident.status)}
                      size="1"
                      variant="soft"
                      style={{ textTransform: 'capitalize' }}
                    >
                      {statusLabel(normalizeLegacyStatus(incident.status))}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {incident.aiAnalysis ? (
                      <Badge
                        color={getValidityColor(incident.aiAnalysis.validity)}
                        size="1"
                        variant="soft"
                      >
                        {incident.aiAnalysis.validity}
                      </Badge>
                    ) : (
                      <Text size="1" color="gray">
                        N/A
                      </Text>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card>

      {/* ─── Reports Cards (mobile) ─── */}
      <Flex direction="column" gap="3" className="hide-on-desktop">
        {incidents.map((incident) => (
          <Card
            key={incident.id}
            size="2"
            onClick={() => setSelected(incident)}
            style={{ cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-a2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          >
            <Flex justify="between" align="start" gap="2" mb="2">
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
                  {shortId(incident.id)}
                </Text>
                <Text size="3" weight="bold">
                  {incident.incidentType}
                </Text>
              </Flex>
              <Flex direction="column" gap="1" align="end">
                <Badge
                  color={getStatusColor(incident.status)}
                  size="1"
                  variant="soft"
                  style={{ textTransform: 'capitalize', flexShrink: 0 }}
                >
                  {statusLabel(normalizeLegacyStatus(incident.status))}
                </Badge>
                {isIncidentBreached(incident, sla) && (
                  <Badge color="red" size="1" variant="solid">
                    Breached
                  </Badge>
                )}
              </Flex>
            </Flex>

            <Separator size="4" mb="2" />

            <Flex direction="column" gap="1">
              <Flex justify="between" gap="1">
                <Text size="1" color="gray">
                  Location
                </Text>
                <Text size="1" weight="medium">
                  {incident.location}
                </Text>
              </Flex>
              <Flex justify="between" gap="1">
                <Text size="1" color="gray">
                  Date
                </Text>
                <Text size="1" weight="medium">
                  {formatDate(incident.createdAt)}
                </Text>
              </Flex>
              <Flex justify="between" gap="1">
                <Text size="1" color="gray">
                  AI Validity
                </Text>
                {incident.aiAnalysis ? (
                  <Badge
                    color={getValidityColor(incident.aiAnalysis.validity)}
                    size="1"
                    variant="soft"
                  >
                    {incident.aiAnalysis.validity}
                  </Badge>
                ) : (
                  <Text size="1" color="gray">
                    N/A
                  </Text>
                )}
              </Flex>
            </Flex>

            <Text size="1" color="blue" mt="2" style={{ display: 'block', textAlign: 'right' }}>
              Tap to view details →
            </Text>
          </Card>
        ))}
      </Flex>
    </>
  );
}
