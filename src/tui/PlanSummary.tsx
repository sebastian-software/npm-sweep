import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Plan } from '../types/plan.js';
import { ACTION_IMPACTS } from '../types/action.js';
import { countSteps, hasDestructiveActions, getDestructiveSteps } from '../plan/generator.js';

export interface PlanSummaryProps {
  plan: Plan;
  onConfirm: () => void;
  onBack: () => void;
}

export function PlanSummary({ plan, onConfirm, onBack }: PlanSummaryProps) {
  const stats = countSteps(plan);
  const destructive = hasDestructiveActions(plan);
  const destructiveSteps = getDestructiveSteps(plan);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
    } else if (key.return) {
      onConfirm();
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>Plan Summary</Text>
      <Box marginY={1}>
        <Text color="gray">
          {stats.total} action(s) on {plan.actions.length} package(s)
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="gray">By type:</Text>
        {Object.entries(stats.byType).map(([type, count]) => {
          const impact = ACTION_IMPACTS[type as keyof typeof ACTION_IMPACTS];
          return (
            <Text key={type}>
              <Text color={impact?.reversible === false ? 'red' : 'white'}>
                {type}: {count}
              </Text>
            </Text>
          );
        })}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Actions:</Text>
        {plan.actions.map((action) => (
          <Box key={action.package} flexDirection="column" marginLeft={1}>
            <Text color="cyan">{action.package}</Text>
            {action.steps.map((step, i) => {
              const impact = ACTION_IMPACTS[step.type];
              return (
                <Text key={i} color={impact?.reversible === false ? 'red' : 'gray'}>
                  {'  '}• {step.type}
                  {step.type === 'deprecate' && ` (${step.range})`}
                  {step.type === 'tombstone' && ` → ${step.targetVersion}`}
                  {step.type === 'ownerAdd' && ` +${step.user}`}
                  {step.type === 'ownerRemove' && ` -${step.user}`}
                </Text>
              );
            })}
          </Box>
        ))}
      </Box>

      {destructive && (
        <Box
          borderStyle="single"
          borderColor="red"
          paddingX={1}
          marginBottom={1}
          flexDirection="column"
        >
          <Text bold color="red">
            ⚠ Warning: Plan contains irreversible actions
          </Text>
          {destructiveSteps.map((d, i) => (
            <Text key={i} color="red">
              • {d.package}: {d.step.type}
            </Text>
          ))}
        </Box>
      )}

      <Box>
        <Text color="gray">Press </Text>
        <Text color="cyan">Enter</Text>
        <Text color="gray"> to proceed to confirmation, </Text>
        <Text color="cyan">Esc</Text>
        <Text color="gray"> to go back</Text>
      </Box>
    </Box>
  );
}
