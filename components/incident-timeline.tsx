'use client';

import { Badge, Box, Flex, Text } from '@radix-ui/themes';
import {
  CheckCircledIcon,
  FileTextIcon,
  HandIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import {
  computeStageDeadlines,
  formatRemaining,
  type SlaConfig,
  type SlaIncident,
} from '@/lib/sla';
import { normalizeLegacyStatus } from '@/app/faculty-dashboard/incident-validation';

const STAGES = [
  { key: 'submitted', label: 'Submitted', icon: FileTextIcon, slaStage: null as const },
  { key: 'acknowledged', label: 'Acknowledged', icon: HandIcon, slaStage: 'acknowledge' as const },
  {
    key: 'investigating',
    label: 'Investigating',
    icon: MagnifyingGlassIcon,
    slaStage: 'investigate' as const,
  },
  { key: 'resolved', label: 'Resolved', icon: CheckCircledIcon, slaStage: 'resolve' as const },
] as const;

const STAGE_INDEX: Record<string, number> = {
  submitted: 0,
  acknowledged: 1,
  investigating: 2,
  resolved: 3,
};

interface Props {
  /** Raw incident-with-timestamps shape (createdAt, acknowledgedAt, etc.) */
  incident: SlaIncident;
  /** Global SLA config */
  sla: SlaConfig;
  /** Optional: name/email of assigned faculty to show under "Acknowledged"/"Investigating" stages */
  assignedTo?: string | null;
}

function formatStageTime(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IncidentTimeline({ incident, sla, assignedTo }: Props) {
  const status = normalizeLegacyStatus(incident.status);
  const currentIndex = STAGE_INDEX[status] ?? 0;
  const deadlines = computeStageDeadlines(incident, sla);

  const stageStartTime = (key: (typeof STAGES)[number]['key']): Date | string | null => {
    switch (key) {
      case 'submitted':
        return incident.createdAt;
      case 'acknowledged':
        return incident.acknowledgedAt;
      case 'investigating':
        return incident.investigatingAt;
      case 'resolved':
        return incident.resolvedAt;
    }
  };

  return (
    <Flex direction="column" gap="0" py="2">
      {STAGES.map((stage, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isActive = i <= currentIndex;
        const isLast = i === STAGES.length - 1;
        const Icon = stage.icon;

        const stageTime = formatStageTime(stageStartTime(stage.key));
        const completedAt = isCompleted || (isCurrent && stageTime) ? stageTime : null;

        const slaInfo = stage.slaStage ? deadlines[stage.slaStage] : null;
        const showCountdown = slaInfo && !slaInfo.completed && isCurrent;
        const breached = slaInfo?.breached ?? false;

        return (
          <Flex key={stage.key} direction="column" gap="0" align="start">
            <Flex align="center" gap="3">
              {/* Icon circle */}
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: breached
                    ? 'var(--red-9)'
                    : isActive
                      ? 'var(--accent-9)'
                      : 'var(--gray-a4)',
                  color: isActive || breached ? 'white' : 'var(--gray-9)',
                  boxShadow: isCurrent
                    ? breached
                      ? '0 0 0 4px var(--red-a3)'
                      : '0 0 0 4px var(--accent-a3)'
                    : 'none',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Icon width="18" height="18" />
              </Box>

              {/* Label + meta */}
              <Flex direction="column" gap="0">
                <Flex align="center" gap="2" wrap="wrap">
                  <Text
                    size="2"
                    weight={isCurrent ? 'bold' : 'medium'}
                    color={isActive ? undefined : 'gray'}
                  >
                    {stage.label}
                  </Text>
                  {breached && (
                    <Badge color="red" variant="solid" size="1">
                      SLA Breached
                    </Badge>
                  )}
                </Flex>

                {/* Faculty info on Acknowledged + Investigating stages */}
                {(stage.key === 'acknowledged' || stage.key === 'investigating') &&
                  isActive &&
                  assignedTo && (
                    <Text size="1" color="gray">
                      {assignedTo}
                    </Text>
                  )}

                {/* Stage timestamp */}
                {completedAt && (
                  <Text size="1" color="gray">
                    {completedAt}
                  </Text>
                )}

                {/* Countdown / breach indicator */}
                {showCountdown && (
                  <Text size="1" color={breached ? 'red' : 'blue'} weight="medium">
                    {formatRemaining(slaInfo!.msRemaining)}
                  </Text>
                )}

                {isCompleted && (
                  <Text size="1" color="green">
                    Done
                  </Text>
                )}
                {isCurrent && !isCompleted && !showCountdown && (
                  <Text size="1" color="blue">
                    Current
                  </Text>
                )}
              </Flex>
            </Flex>

            {/* Connecting line */}
            {!isLast && (
              <Box
                style={{
                  width: 2,
                  height: 24,
                  marginLeft: 17,
                  background: i < currentIndex ? 'var(--accent-9)' : 'var(--gray-a4)',
                  transition: 'background 0.3s ease',
                }}
              />
            )}
          </Flex>
        );
      })}
    </Flex>
  );
}
