import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { PackageAction } from '../types/plan.js';

export interface QuickConfirmProps {
  actions: PackageAction[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function QuickConfirm({ actions, onConfirm, onCancel }: QuickConfirmProps) {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') {
      onConfirm();
    } else if (key.escape || input === 'n' || input === 'N') {
      onCancel();
    }
  });

  const actionSummary = actions.map(a => {
    const step = a.steps[0];
    if (!step) return `${a.package}: unknown`;
    return `${step.type} ${a.package}${step.type === 'deprecate' && 'range' in step ? `@${step.range}` : ''}`;
  });

  const hasDestructive = actions.some(a =>
    a.steps.some(s => s.type === 'unpublish' || s.type === 'tombstone')
  );

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={hasDestructive ? 'red' : 'yellow'}>
          {hasDestructive ? '⚠ Confirm destructive action' : 'Confirm action'}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {actionSummary.map((summary, i) => (
          <Text key={i} color="gray">• {summary}</Text>
        ))}
      </Box>

      {hasDestructive && (
        <Box marginBottom={1}>
          <Text color="red">This action cannot be undone!</Text>
        </Box>
      )}

      <Box>
        <Text>
          <Text color="green">[y]</Text> Execute
          <Text color="gray"> • </Text>
          <Text color="red">[n/Esc]</Text> Cancel
        </Text>
      </Box>
    </Box>
  );
}
