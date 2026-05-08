import type { IncidentStatus } from '@/app/faculty-dashboard/incident-validation';

/** Plain shape of the SlaConfig record. */
export interface SlaConfig {
    acknowledgeWithinHours: number;
    investigateWithinHours: number;
    resolveWithinHours: number;
}

/** Default SLA values, used when no config has been saved yet. */
export const DEFAULT_SLA: SlaConfig = {
    acknowledgeWithinHours: 24,
    investigateWithinHours: 72,
    resolveWithinHours: 168,
};

/** A subset of IncidentReport with the timestamp fields needed for SLA math. */
export interface SlaIncident {
    status: string;
    createdAt: Date | string;
    acknowledgedAt: Date | string | null;
    investigatingAt: Date | string | null;
    resolvedAt: Date | string | null;
}

/** Stage of the workflow that has an SLA attached. */
export type SlaStage = 'acknowledge' | 'investigate' | 'resolve';

export interface StageDeadline {
    stage: SlaStage;
    /** When the timer for this stage started ticking. */
    startedAt: Date;
    /** When the SLA expires (or expired). */
    deadline: Date;
    /** ms remaining; negative when breached. */
    msRemaining: number;
    /** True if msRemaining < 0. */
    breached: boolean;
    /** True if this is the *active* stage (i.e. the next transition the faculty owes). */
    active: boolean;
    /** True if this stage has already been completed. */
    completed: boolean;
}

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
}

function addHours(base: Date, hours: number): Date {
    return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Compute deadline information for every SLA stage of an incident.
 * Stages that haven't started yet are returned with `active=false, completed=false`.
 */
export function computeStageDeadlines(
    incident: SlaIncident,
    sla: SlaConfig,
    now: Date = new Date()
): Record<SlaStage, StageDeadline> {
    const submittedAt = toDate(incident.createdAt) ?? now;
    const acknowledgedAt = toDate(incident.acknowledgedAt);
    const investigatingAt = toDate(incident.investigatingAt);
    const resolvedAt = toDate(incident.resolvedAt);

    const status = incident.status;

    const ackDeadline = addHours(submittedAt, sla.acknowledgeWithinHours);
    const investigateStart = acknowledgedAt ?? submittedAt;
    const investigateDeadline = addHours(investigateStart, sla.investigateWithinHours);
    const resolveStart = investigatingAt ?? acknowledgedAt ?? submittedAt;
    const resolveDeadline = addHours(resolveStart, sla.resolveWithinHours);

    const ackCompleted = !!acknowledgedAt;
    const investigateCompleted = !!investigatingAt;
    const resolveCompleted = !!resolvedAt;

    return {
        acknowledge: {
            stage: 'acknowledge',
            startedAt: submittedAt,
            deadline: ackDeadline,
            msRemaining: ackDeadline.getTime() - now.getTime(),
            breached: !ackCompleted && now.getTime() > ackDeadline.getTime(),
            active: status === 'submitted',
            completed: ackCompleted,
        },
        investigate: {
            stage: 'investigate',
            startedAt: investigateStart,
            deadline: investigateDeadline,
            msRemaining: investigateDeadline.getTime() - now.getTime(),
            breached: !investigateCompleted && status === 'acknowledged' && now.getTime() > investigateDeadline.getTime(),
            active: status === 'acknowledged',
            completed: investigateCompleted,
        },
        resolve: {
            stage: 'resolve',
            startedAt: resolveStart,
            deadline: resolveDeadline,
            msRemaining: resolveDeadline.getTime() - now.getTime(),
            breached: !resolveCompleted && status === 'investigating' && now.getTime() > resolveDeadline.getTime(),
            active: status === 'investigating',
            completed: resolveCompleted,
        },
    };
}

/**
 * True if the incident's *current* active stage has breached its SLA.
 * Resolved incidents are never considered breached.
 */
export function isIncidentBreached(incident: SlaIncident, sla: SlaConfig, now: Date = new Date()): boolean {
    if (incident.status === 'resolved') return false;
    const deadlines = computeStageDeadlines(incident, sla, now);
    return Object.values(deadlines).some((d) => d.active && d.breached);
}

/** Format a positive or negative ms duration as a short human label. */
export function formatRemaining(msRemaining: number): string {
    const abs = Math.abs(msRemaining);
    const hours = Math.floor(abs / (60 * 60 * 1000));
    const minutes = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));

    let label: string;
    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        label = remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
    } else if (hours >= 1) {
        label = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
        label = `${minutes}m`;
    }

    return msRemaining < 0 ? `Overdue by ${label}` : `Due in ${label}`;
}

/** Maps a workflow status to the deadline stage that's currently "active". */
export function activeStageForStatus(status: string): SlaStage | null {
    switch (status) {
        case 'submitted':
            return 'acknowledge';
        case 'acknowledged':
            return 'investigate';
        case 'investigating':
            return 'resolve';
        default:
            return null;
    }
}

/** Friendly label for a status. */
export function statusLabel(status: IncidentStatus | string): string {
    switch (status) {
        case 'submitted':
            return 'Submitted';
        case 'acknowledged':
            return 'Acknowledged';
        case 'investigating':
            return 'Investigating';
        case 'resolved':
            return 'Resolved';
        default:
            return status;
    }
}
