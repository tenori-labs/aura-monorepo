'use client';

import { useState, useEffect } from 'react';
import { Badge, Box, Button, Card, Flex, Select, Separator, Table, Text } from '@radix-ui/themes';
import {
  getCategoryAssignments,
  assignCategory,
  removeAssignment,
  getFacultyUsers,
} from '@/app/admin-dashboard/actions';

interface CategoryInfo {
  category: string;
  facultyId: string | null;
  facultyEmail: string | null; // stores faculty name (from profiles)
  assignedBy: string | null;
}

interface FacultyUser {
  id: string;
  name: string;
  role: string;
}

export function CategoryManager() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<FacultyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [catResult, facultyResult] = await Promise.all([
        getCategoryAssignments(),
        getFacultyUsers(),
      ]);

      if ('error' in catResult && catResult.error) {
        setError(catResult.error);
        return;
      }

      if (catResult.categories) {
        setCategories(catResult.categories);
      }

      if (facultyResult.users) {
        setFacultyUsers(facultyResult.users);
      }

      if (facultyResult.error) {
        setError(facultyResult.error);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(category: string, facultyId: string) {
    setSaving(category);
    const faculty = facultyUsers.find((f) => f.id === facultyId);
    if (!faculty) return;

    const result = await assignCategory(category, faculty.id, faculty.name);
    if (result.error) {
      setError(result.error);
    } else {
      await loadData();
    }
    setSaving(null);
  }

  async function handleRemove(category: string) {
    setSaving(category);
    const result = await removeAssignment(category);
    if (result.error) {
      setError(result.error);
    } else {
      await loadData();
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <Card size="2">
        <Flex align="center" justify="center" py="5">
          <Text size="2" color="gray">
            Loading category assignments...
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="3">
      {error && (
        <Card size="1">
          <Text size="2" color="red">
            {error}
          </Text>
        </Card>
      )}

      {/* Desktop Table */}
      <Card size="2" style={{ overflow: 'hidden' }} className="hide-on-mobile">
        <Box style={{ overflowX: 'auto' }}>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Assigned Faculty</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {categories.map((cat) => (
                <Table.Row key={cat.category}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {cat.category}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {cat.facultyEmail ? (
                      <Badge variant="soft" color="green" size="2">
                        {cat.facultyEmail}
                      </Badge>
                    ) : (
                      <Badge variant="soft" color="gray" size="1">
                        Unassigned
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="2" align="center">
                      <Select.Root
                        size="1"
                        value={cat.facultyId ?? ''}
                        onValueChange={(val) => handleAssign(cat.category, val)}
                        disabled={saving === cat.category}
                      >
                        <Select.Trigger placeholder="Select faculty..." style={{ minWidth: 160 }} />
                        <Select.Content>
                          {facultyUsers.map((f) => (
                            <Select.Item key={f.id} value={f.id}>
                              {f.name}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                      {cat.facultyId && (
                        <Button
                          variant="soft"
                          color="red"
                          size="1"
                          onClick={() => handleRemove(cat.category)}
                          disabled={saving === cat.category}
                        >
                          Remove
                        </Button>
                      )}
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card>

      {/* Mobile Card View */}
      <Flex direction="column" gap="3" className="hide-on-desktop">
        {categories.map((cat) => (
          <Card key={cat.category} size="2">
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center" gap="2">
                <Text size="2" weight="bold">
                  {cat.category}
                </Text>
                {cat.facultyEmail ? (
                  <Badge variant="soft" color="green" size="1">
                    Assigned
                  </Badge>
                ) : (
                  <Badge variant="soft" color="gray" size="1">
                    Unassigned
                  </Badge>
                )}
              </Flex>

              {cat.facultyEmail && (
                <>
                  <Separator size="4" />
                  <Flex direction="column" gap="1">
                    <Text size="1" color="gray">
                      Assigned to
                    </Text>
                    <Text size="2" weight="medium">
                      {cat.facultyEmail}
                    </Text>
                  </Flex>
                </>
              )}

              <Separator size="4" />

              <Select.Root
                size="2"
                value={cat.facultyId ?? ''}
                onValueChange={(val) => handleAssign(cat.category, val)}
                disabled={saving === cat.category}
              >
                <Select.Trigger placeholder="Select faculty..." style={{ width: '100%' }} />
                <Select.Content>
                  {facultyUsers.map((f) => (
                    <Select.Item key={f.id} value={f.id}>
                      {f.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              {cat.facultyId && (
                <Button
                  variant="soft"
                  color="red"
                  size="2"
                  onClick={() => handleRemove(cat.category)}
                  disabled={saving === cat.category}
                  style={{ width: '100%' }}
                >
                  Remove Assignment
                </Button>
              )}
            </Flex>
          </Card>
        ))}
      </Flex>
    </Flex>
  );
}
