'use client';

import { Flex, Text, Badge, Progress, Box, Heading } from '@radix-ui/themes';

export interface AiResult {
  category: string;
  confidence: number;
  keywords: string[];
  validity: 'Likely Valid' | 'Needs Review' | 'Invalid';
  validityReason: string;
}

export function AiClassifierResult({ result }: { result: AiResult }) {
  const confidencePercent = Math.round(result.confidence * 100);

  // Determine color based on validity
  const validityColor =
    result.validity === 'Likely Valid'
      ? 'green'
      : result.validity === 'Needs Review'
        ? 'orange'
        : 'red';

  return (
    <Flex direction="column" gap="4">
      {/* Header: Category & Validity */}
      <Flex justify="between" align="start">
        <Box>
          <Text size="1" weight="bold" color="gray" mb="1" style={{ textTransform: 'uppercase' }}>
            Category
          </Text>
          <Heading size="6" weight="bold" style={{ color: 'var(--accent-9)' }}>
            {result.category}
          </Heading>
        </Box>
        <Badge color={validityColor} size="2" variant="solid" radius="full">
          {result.validity}
        </Badge>
      </Flex>

      {/* Assessment Reason */}
      <Box style={{ background: 'var(--gray-a3)', padding: '12px', borderRadius: '8px' }}>
        <Text size="2" color="gray" style={{ lineHeight: '1.5' }}>
          {result.validityReason}
        </Text>
      </Box>

      {/* Keywords */}
      <Box>
        <Text size="1" weight="bold" color="gray" mb="2" style={{ textTransform: 'uppercase' }}>
          Detected Keywords
        </Text>
        <Flex gap="2" wrap="wrap">
          {result.keywords.map((k) => (
            <Badge key={k} variant="soft" color="gray">
              {k}
            </Badge>
          ))}
        </Flex>
      </Box>

      {/* Confidence Score at the bottom */}
      <Box mt="2">
        <Flex justify="between" mb="1" align="end">
          <Text size="1" weight="medium" color="gray">
            AI Confidence
          </Text>
          <Text size="1" weight="bold">
            {confidencePercent}%
          </Text>
        </Flex>
        <Progress value={confidencePercent} size="2" color="blue" />
      </Box>
    </Flex>
  );
}
