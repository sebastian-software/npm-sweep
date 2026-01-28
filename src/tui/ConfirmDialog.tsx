import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Plan } from '../types/plan.js';
import { countSteps, hasDestructiveActions } from '../plan/generator.js';

export interface ConfirmDialogProps {
  plan: Plan;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ plan, onConfirm, onCancel }: ConfirmDialogProps) {
  const stats = countSteps(plan);
  const destructive = hasDestructiveActions(plan);
  const confirmCode = `APPLY ${stats.total}`;
  const [input, setInput] = useState('');

  useInput((_, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleChange = (value: string) => {
    setInput(value);
    if (value === confirmCode) {
      onConfirm();
    }
  };

  return (
    <Box flexDirection="column">
      <Box
        borderStyle="double"
        borderColor={destructive ? 'red' : 'yellow'}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text bold color={destructive ? 'red' : 'yellow'}>
          {destructive ? '⚠ DESTRUCTIVE OPERATION' : '⚠ Confirm Execution'}
        </Text>

        <Box marginY={1}>
          <Text>
            You are about to execute {stats.total} action(s) on {plan.actions.length} package(s).
          </Text>
        </Box>

        {destructive && (
          <Box marginBottom={1}>
            <Text color="red" bold>
              This plan contains IRREVERSIBLE actions (unpublish/owner removal).
            </Text>
          </Box>
        )}

        <Box flexDirection="column">
          <Text>
            To confirm, type: <Text color="cyan" bold>{confirmCode}</Text>
          </Text>
          <Box marginTop={1}>
            <Text color="gray">&gt; </Text>
            <TextInput
              value={input}
              onChange={handleChange}
              focus={true}
              placeholder={confirmCode}
            />
          </Box>
        </Box>

        {input && input !== confirmCode && (
          <Box marginTop={1}>
            <Text color="red">
              Input does not match. Type exactly: {confirmCode}
            </Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press </Text>
        <Text color="cyan">Esc</Text>
        <Text color="gray"> to cancel</Text>
      </Box>
    </Box>
  );
}
