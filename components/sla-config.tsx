'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Card, Flex, Text, TextField } from '@radix-ui/themes';
import { getSlaConfig, updateSlaConfig } from '@/app/admin-dashboard/actions';
import { DEFAULT_SLA, type SlaConfig } from '@/lib/sla';

export function SlaConfigForm() {
  const [sla, setSla] = useState<SlaConfig>(DEFAULT_SLA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const result = await getSlaConfig();
      setSla(result.sla);
    } finally {
      setLoading(false);
    }
  }

  function updateField(key: keyof SlaConfig, raw: string) {
    const parsed = Number.parseInt(raw, 10);
    setSla((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    if (
      sla.acknowledgeWithinHours <= 0 ||
      sla.investigateWithinHours <= 0 ||
      sla.resolveWithinHours <= 0
    ) {
      setMessage({ type: 'error', text: 'All values must be positive integers.' });
      setSaving(false);
      return;
    }

    const result = await updateSlaConfig(sla);
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'SLA configuration saved.' });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <Card size="2">
        <Text size="2" color="gray">
          Loading SLA configuration...
        </Text>
      </Card>
    );
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="3">
        <Text size="2" color="gray">
          Set how long faculty has at each stage before the report is flagged as breached.
          Applies to all incident categories.
        </Text>

        <Box>
          <Text size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            Acknowledge within
          </Text>
          <Flex gap="2" align="center">
            <TextField.Root
              type="number"
              min="1"
              value={String(sla.acknowledgeWithinHours)}
              onChange={(e) => updateField('acknowledgeWithinHours', e.target.value)}
              style={{ maxWidth: 120 }}
            />
            <Text size="2" color="gray">
              hours after submission
            </Text>
          </Flex>
        </Box>

        <Box>
          <Text size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            Begin investigation within
          </Text>
          <Flex gap="2" align="center">
            <TextField.Root
              type="number"
              min="1"
              value={String(sla.investigateWithinHours)}
              onChange={(e) => updateField('investigateWithinHours', e.target.value)}
              style={{ maxWidth: 120 }}
            />
            <Text size="2" color="gray">
              hours after acknowledgement
            </Text>
          </Flex>
        </Box>

        <Box>
          <Text size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            Resolve within
          </Text>
          <Flex gap="2" align="center">
            <TextField.Root
              type="number"
              min="1"
              value={String(sla.resolveWithinHours)}
              onChange={(e) => updateField('resolveWithinHours', e.target.value)}
              style={{ maxWidth: 120 }}
            />
            <Text size="2" color="gray">
              hours after investigation begins
            </Text>
          </Flex>
        </Box>

        {message && (
          <Text size="1" color={message.type === 'success' ? 'green' : 'red'} weight="medium">
            {message.text}
          </Text>
        )}

        <Flex gap="2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save SLA Configuration'}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
