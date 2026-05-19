'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Dialog, Flex, Select, Text, TextField } from '@radix-ui/themes';
import { createTenant } from '../_actions';

export function CreateTenantDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [planType, setPlanType] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Auto-derive subdomain from name on first edit. Strips spaces / non-allowed
  // chars and lowercases — same shape we accept in the action.
  function onNameChange(v: string) {
    setName(v);
    if (!subdomain) {
      const auto = v
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSubdomain(auto.slice(0, 40));
    }
  }

  async function handleCreate() {
    setError(null);
    setBusy(true);
    try {
      const res = await createTenant({ subdomain, name, planType });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setName('');
      setSubdomain('');
      setPlanType('free');
      router.push(`/console/${res.tenant.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="2">+ New tenant</Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 480 }}>
        <Dialog.Title>Create tenant</Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          Provision a new institution. You can edit details after creation.
        </Dialog.Description>

        {error && (
          <Box
            mb="3"
            p="3"
            style={{ backgroundColor: 'var(--red-a3)', borderRadius: 'var(--radius-2)' }}
          >
            <Text size="2" color="red">
              {error}
            </Text>
          </Box>
        )}

        <Box mb="3">
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            Name
          </Text>
          <TextField.Root
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="LICET College"
          />
        </Box>

        <Box mb="3">
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            Subdomain
          </Text>
          <TextField.Root
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
            placeholder="licet"
          />
          <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
            Lowercase letters, digits, hyphens. 2–40 chars.
          </Text>
        </Box>

        <Box mb="4">
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            Plan
          </Text>
          <Select.Root value={planType} onValueChange={(v) => setPlanType(v as typeof planType)}>
            <Select.Trigger style={{ width: '100%' }} />
            <Select.Content>
              <Select.Item value="free">Free</Select.Item>
              <Select.Item value="pro">Pro</Select.Item>
              <Select.Item value="enterprise">Enterprise</Select.Item>
            </Select.Content>
          </Select.Root>
        </Box>

        <Flex gap="2" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={busy}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleCreate} disabled={busy || !name || !subdomain}>
            {busy ? 'Creating…' : 'Create tenant'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
