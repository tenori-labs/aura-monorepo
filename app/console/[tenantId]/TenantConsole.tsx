'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Heading,
  Select,
  Switch,
  Text,
  TextField,
} from '@radix-ui/themes';
import { deleteTenant, topupTenant, updateTenant } from '../_actions';
import type { ConsoleTenant } from '../_types';
import { Pill, Section, FormRow } from '../_components/Primitives';
import { fmtNum } from '../_utils/format';

type TabKey =
  | 'general'
  | 'users'
  | 'categories'
  | 'sla'
  | 'ai'
  | 'wellbeing'
  | 'danger';

interface Props {
  tenant: ConsoleTenant;
  sla: {
    id: string;
    acknowledgeWithinHours: number;
    investigateWithinHours: number;
    resolveWithinHours: number;
  } | null;
  counts: { wellbeingReports: number; incidents: number };
  categoryAssignments: Array<{
    id: string;
    category: string;
    facultyId: string;
    facultyEmail: string;
  }>;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'users', label: 'Users' },
  { key: 'categories', label: 'Categories' },
  { key: 'sla', label: 'SLA' },
  { key: 'ai', label: 'AI' },
  { key: 'wellbeing', label: 'Wellbeing' },
  { key: 'danger', label: 'Danger' },
];

/**
 * Per-tenant editor. Maintains a `draft` copy of the tenant in local
 * state; tab subviews call `update(patch)` to mutate it; the page-level
 * Save button persists the diff in one PATCH call.
 *
 * We don't ship the full ARCA `useDirtyTenant` hook here — for MVP the
 * draft+diff pattern is fine inline since there's only one editable
 * entity per page.
 */
export function TenantConsole({ tenant, sla, counts, categoryAssignments }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('general');
  const [draft, setDraft] = useState<ConsoleTenant>(tenant);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isSaving, startSaving] = useTransition();

  // Shallow diff against the server copy.
  const dirty = JSON.stringify(draft) !== JSON.stringify(tenant);

  function update(patch: Partial<ConsoleTenant>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaveMsg(null);
  }

  function onSave() {
    startSaving(async () => {
      const patch: Record<string, unknown> = {};
      for (const k of Object.keys(draft) as Array<keyof ConsoleTenant>) {
        // Skip server-managed fields
        if (k === 'id' || k === 'createdAt' || k === 'updatedAt' || k === 'createdBy' || k === 'clerkOrgId') continue;
        if (JSON.stringify(draft[k]) !== JSON.stringify(tenant[k])) {
          patch[k] = draft[k];
        }
      }
      const res = await updateTenant(tenant.id, patch);
      if ('error' in res) {
        setSaveMsg({ type: 'err', text: res.error });
      } else {
        setSaveMsg({ type: 'ok', text: 'Saved.' });
        router.refresh();
      }
    });
  }

  return (
    <Box style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
      {/* ─── Header bar ────────────────────────────── */}
      <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
        <Box>
          <Flex align="center" gap="2" wrap="wrap">
            <Link href="/console" style={{ color: 'var(--gray-11)', textDecoration: 'none' }}>
              <Text size="2">← Tenants</Text>
            </Link>
          </Flex>
          <Flex align="center" gap="3" mt="1" wrap="wrap">
            <Heading size="6">{draft.name}</Heading>
            <Text style={{ fontFamily: 'monospace' }} color="gray" size="2">
              {draft.subdomain}
            </Text>
            <Pill
              tone={
                draft.status === 'active'
                  ? 'sage'
                  : draft.status === 'suspended'
                    ? 'butter'
                    : 'danger'
              }
            >
              {draft.status}
            </Pill>
            <Pill
              tone={
                draft.planType === 'enterprise'
                  ? 'lavender'
                  : draft.planType === 'pro'
                    ? 'sage'
                    : 'ghost'
              }
            >
              {draft.planType}
            </Pill>
            <Text size="2" color="gray">
              {fmtNum(draft.creditsRemaining)} credits
            </Text>
          </Flex>
        </Box>
        {dirty && (
          <Flex gap="2" align="center">
            {saveMsg && (
              <Text size="2" color={saveMsg.type === 'ok' ? 'green' : 'red'}>
                {saveMsg.text}
              </Text>
            )}
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </Flex>
        )}
      </Flex>

      {/* ─── Tab bar ─────────────────────────────────── */}
      <Flex gap="2" mb="4" wrap="wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-2)',
              background: tab === t.key ? 'var(--accent-a3)' : 'transparent',
              color: tab === t.key ? 'var(--accent-11)' : 'var(--gray-11)',
              border: '1px solid var(--gray-a4)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: tab === t.key ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </Flex>

      {/* ─── Tab content ─────────────────────────────── */}
      <Card size="3">
        {tab === 'general' && <TabGeneral draft={draft} update={update} />}
        {tab === 'users' && <TabUsers tenant={tenant} />}
        {tab === 'categories' && (
          <TabCategories categoryAssignments={categoryAssignments} />
        )}
        {tab === 'sla' && <TabSla tenantId={tenant.id} sla={sla} />}
        {tab === 'ai' && <TabAi draft={draft} update={update} />}
        {tab === 'wellbeing' && <TabWellbeing counts={counts} />}
        {tab === 'danger' && (
          <TabDanger
            tenant={tenant}
            draft={draft}
            update={update}
            onAfterDelete={() => router.push('/console')}
          />
        )}
      </Card>
    </Box>
  );
}

/* ───────────────── Tab: General ───────────────── */

function TabGeneral({
  draft,
  update,
}: {
  draft: ConsoleTenant;
  update: (p: Partial<ConsoleTenant>) => void;
}) {
  return (
    <Box>
      <Section title="Identity" description="Basic info shown to users on this tenant.">
        <FormRow label="Institution name">
          <TextField.Root
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </FormRow>
        <FormRow label="Subdomain">
          <TextField.Root
            value={draft.subdomain}
            onChange={(e) =>
              update({
                subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
              })
            }
          />
          <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
            Lowercase letters, digits, hyphens. Used for the tenant URL.
          </Text>
        </FormRow>
        <FormRow label="Logo URL">
          <TextField.Root
            value={draft.logoUrl ?? ''}
            onChange={(e) => update({ logoUrl: e.target.value || null })}
            placeholder="https://…"
          />
        </FormRow>
        <FormRow label="Primary color (hex)">
          <TextField.Root
            value={draft.primaryColor ?? ''}
            onChange={(e) => update({ primaryColor: e.target.value || null })}
            placeholder="#3b82f6"
          />
        </FormRow>
      </Section>

      <Section title="Plan & limits" description="Quotas and billing tier for this tenant.">
        <Flex gap="3" wrap="wrap">
          <Box style={{ flex: 1, minWidth: 180 }}>
            <FormRow label="Plan">
              <Select.Root
                value={draft.planType}
                onValueChange={(v) =>
                  update({ planType: v as ConsoleTenant['planType'] })
                }
              >
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  <Select.Item value="free">Free</Select.Item>
                  <Select.Item value="pro">Pro</Select.Item>
                  <Select.Item value="enterprise">Enterprise</Select.Item>
                </Select.Content>
              </Select.Root>
            </FormRow>
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <FormRow label="Max students">
              <TextField.Root
                type="number"
                value={String(draft.maxStudents)}
                onChange={(e) => update({ maxStudents: Number(e.target.value) || 0 })}
              />
            </FormRow>
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <FormRow label="Max faculty">
              <TextField.Root
                type="number"
                value={String(draft.maxFaculty)}
                onChange={(e) => update({ maxFaculty: Number(e.target.value) || 0 })}
              />
            </FormRow>
          </Box>
        </Flex>
      </Section>
    </Box>
  );
}

/* ───────────────── Tab: Users (placeholder) ───────────────── */

function TabUsers({ tenant }: { tenant: ConsoleTenant }) {
  return (
    <Section
      title="Tenant users"
      description="User management lands when the tenant signup flow is wired through Clerk Organizations."
    >
      <Card variant="surface" size="2">
        <Flex direction="column" gap="2" py="3" align="center">
          <Text size="2" color="gray">
            No user data wired up yet for this tenant ({tenant.subdomain}).
          </Text>
          <Text size="1" color="gray">
            Phase 2 of multi-tenancy will integrate Clerk Organizations and show admins/faculty/students here.
          </Text>
        </Flex>
      </Card>
    </Section>
  );
}

/* ───────────────── Tab: Categories (read-only for MVP) ───────────────── */

function TabCategories({
  categoryAssignments,
}: {
  categoryAssignments: Array<{
    id: string;
    category: string;
    facultyId: string;
    facultyEmail: string;
  }>;
}) {
  const ALL_CATEGORIES = [
    'Academic Integrity',
    'Harassment/Bullying',
    'Safety/Security',
    'Medical Emergency',
    'Facilities Issue',
    'Other',
  ];

  return (
    <Section
      title="Category assignments"
      description="Faculty members responsible for each incident category. Edit these from the tenant's own /admin-dashboard for now."
    >
      <Card variant="surface" size="2">
        <Box>
          {ALL_CATEGORIES.map((cat) => {
            const assignment = categoryAssignments.find((c) => c.category === cat);
            return (
              <Flex
                key={cat}
                justify="between"
                align="center"
                py="2"
                style={{ borderBottom: '1px solid var(--gray-a3)' }}
              >
                <Text size="2" weight="medium">
                  {cat}
                </Text>
                {assignment ? (
                  <Text size="2" color="gray">
                    {assignment.facultyEmail}
                  </Text>
                ) : (
                  <Pill tone="ghost">Unassigned</Pill>
                )}
              </Flex>
            );
          })}
        </Box>
      </Card>
    </Section>
  );
}

/* ───────────────── Tab: SLA ───────────────── */

function TabSla({
  tenantId,
  sla,
}: {
  tenantId: string;
  sla: {
    id: string;
    acknowledgeWithinHours: number;
    investigateWithinHours: number;
    resolveWithinHours: number;
  } | null;
}) {
  // Local form state — saved via the existing updateSlaConfig action
  // (lives in /app/admin-dashboard/actions.ts and is currently global,
  // not tenant-scoped). For the MVP we just display read-only and
  // note that editing happens in the tenant's own admin dashboard.
  if (!sla) {
    return (
      <Section
        title="SLA configuration"
        description="No SLA configured yet — should have been seeded at tenant creation."
      >
        <Card variant="surface" size="2">
          <Text size="2" color="gray">
            Missing SLA row for tenant {tenantId}.
          </Text>
        </Card>
      </Section>
    );
  }

  return (
    <Section
      title="SLA configuration (read-only)"
      description="Response-time SLAs for this tenant. Editable from the tenant's own /admin-dashboard once user auth is wired through."
    >
      <Card variant="surface" size="2">
        <Flex direction="column" gap="3">
          <Flex justify="between">
            <Text size="2">Acknowledge within</Text>
            <Text size="2" weight="medium">
              {sla.acknowledgeWithinHours}h
            </Text>
          </Flex>
          <Flex justify="between">
            <Text size="2">Begin investigation within</Text>
            <Text size="2" weight="medium">
              {sla.investigateWithinHours}h
            </Text>
          </Flex>
          <Flex justify="between">
            <Text size="2">Resolve within</Text>
            <Text size="2" weight="medium">
              {sla.resolveWithinHours}h
            </Text>
          </Flex>
        </Flex>
      </Card>
    </Section>
  );
}

/* ───────────────── Tab: AI ───────────────── */

function TabAi({
  draft,
  update,
}: {
  draft: ConsoleTenant;
  update: (p: Partial<ConsoleTenant>) => void;
}) {
  return (
    <Section
      title="AI features"
      description="Toggle individual AI-powered features per tenant."
    >
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Box>
            <Text size="2" weight="medium">
              AI Assistant (Aura chat)
            </Text>
            <Text size="1" color="gray" style={{ display: 'block' }}>
              Mental wellbeing chat with crisis detection.
            </Text>
          </Box>
          <Switch
            checked={draft.aiAssistantEnabled}
            onCheckedChange={(v) => update({ aiAssistantEnabled: v })}
          />
        </Flex>
        <Flex justify="between" align="center">
          <Box>
            <Text size="2" weight="medium">
              Shadow Cases
            </Text>
            <Text size="1" color="gray" style={{ display: 'block' }}>
              Private case dockets for sensitive reports.
            </Text>
          </Box>
          <Switch
            checked={draft.shadowCasesEnabled}
            onCheckedChange={(v) => update({ shadowCasesEnabled: v })}
          />
        </Flex>
        <Flex justify="between" align="center">
          <Box>
            <Text size="2" weight="medium">
              Public Bulletin
            </Text>
            <Text size="1" color="gray" style={{ display: 'block' }}>
              Anonymous grievance board.
            </Text>
          </Box>
          <Switch
            checked={draft.bulletinEnabled}
            onCheckedChange={(v) => update({ bulletinEnabled: v })}
          />
        </Flex>
      </Flex>
    </Section>
  );
}

/* ───────────────── Tab: Wellbeing ───────────────── */

function TabWellbeing({
  counts,
}: {
  counts: { wellbeingReports: number; incidents: number };
}) {
  return (
    <Section
      title="Activity summary"
      description="Cross-cutting numbers for this tenant. Detailed views are in the tenant's own dashboards."
    >
      <Flex gap="3" wrap="wrap">
        <Card variant="surface" size="2" style={{ flex: '1 1 200px' }}>
          <Flex direction="column" align="center" py="3">
            <Text size="6" weight="bold">
              {counts.incidents}
            </Text>
            <Text size="2" color="gray">
              Incidents reported
            </Text>
          </Flex>
        </Card>
        <Card variant="surface" size="2" style={{ flex: '1 1 200px' }}>
          <Flex direction="column" align="center" py="3">
            <Text size="6" weight="bold">
              {counts.wellbeingReports}
            </Text>
            <Text size="2" color="gray">
              Wellbeing reports
            </Text>
          </Flex>
        </Card>
      </Flex>
    </Section>
  );
}

/* ───────────────── Tab: Danger ───────────────── */

function TabDanger({
  tenant,
  draft,
  update,
  onAfterDelete,
}: {
  tenant: ConsoleTenant;
  draft: ConsoleTenant;
  update: (p: Partial<ConsoleTenant>) => void;
  onAfterDelete: () => void;
}) {
  const [topupAmount, setTopupAmount] = useState('1000');
  const [topupMsg, setTopupMsg] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onTopup() {
    setTopupMsg(null);
    setBusy(true);
    const amount = Number.parseInt(topupAmount, 10);
    const res = await topupTenant(tenant.id, amount);
    setBusy(false);
    if ('error' in res) {
      setTopupMsg(res.error);
    } else {
      setTopupMsg(`Added ${amount} credits. New balance: ${res.tenant.creditsRemaining}.`);
      // Reflect in local draft so the header pill updates.
      update({ creditsRemaining: res.tenant.creditsRemaining });
    }
  }

  async function onDelete() {
    setDeleteMsg(null);
    setBusy(true);
    const res = await deleteTenant(tenant.id, confirmText);
    setBusy(false);
    if ('error' in res) {
      setDeleteMsg(res.error);
    } else {
      onAfterDelete();
    }
  }

  return (
    <Box>
      <Section
        title="Status"
        description="Suspending a tenant blocks all logins but preserves data."
      >
        <Flex align="center" gap="3">
          <Checkbox
            checked={draft.status === 'active'}
            onCheckedChange={(v) =>
              update({ status: v === true ? 'active' : 'suspended' })
            }
          />
          <Text size="2">
            {draft.status === 'active' ? 'Active' : 'Suspended'}
          </Text>
        </Flex>
      </Section>

      <Section title="Credit top-up" description="Add credits to this tenant immediately (no save needed).">
        <Box>
          <Text as="label" size="2" weight="medium" mb="2" style={{ display: 'block' }}>
            Amount
          </Text>
          <Flex gap="2" align="center">
            <TextField.Root
              type="number"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              style={{ flex: 1, maxWidth: 200 }}
            />
            <Button onClick={onTopup} disabled={busy}>
              Top up
            </Button>
          </Flex>
          {topupMsg && (
            <Text
              size="2"
              color={topupMsg.startsWith('Added') ? 'green' : 'red'}
              mt="2"
              style={{ display: 'block' }}
            >
              {topupMsg}
            </Text>
          )}
        </Box>
      </Section>

      <Section
        title="Delete tenant"
        description="Permanent. The tenant row is removed; existing incident/wellbeing data stays orphaned in MongoDB."
      >
        <Card
          variant="surface"
          size="2"
          style={{
            background: 'var(--red-a2)',
            borderColor: 'var(--red-a6)',
          }}
        >
          <Text size="2" mb="3" style={{ display: 'block' }}>
            Type the subdomain <code style={{ background: 'var(--gray-a3)', padding: '0 4px' }}>{tenant.subdomain}</code> to enable the delete button.
          </Text>
          <Flex gap="2" align="center">
            <TextField.Root
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={tenant.subdomain}
              style={{ flex: 1, maxWidth: 300 }}
            />
            <Button
              color="red"
              onClick={onDelete}
              disabled={busy || confirmText !== tenant.subdomain}
            >
              Delete tenant
            </Button>
          </Flex>
          {deleteMsg && (
            <Text size="2" color="red" mt="2" style={{ display: 'block' }}>
              {deleteMsg}
            </Text>
          )}
        </Card>
      </Section>
    </Box>
  );
}
