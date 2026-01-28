import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { PlanExecutionResult } from '../types/plan.js';

export interface ExecutionResultProps {
  result: PlanExecutionResult;
  onExit: () => void;
}

export function ExecutionResult({ result, onExit }: ExecutionResultProps) {
  useInput((input, key) => {
    if (key.return || input === 'q') {
      onExit();
    }
  });

  const duration = result.completedAt.getTime() - result.startedAt.getTime();
  const allSuccess = result.summary.failed === 0;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={allSuccess ? 'green' : 'yellow'}>
          {allSuccess ? '✓ Execution completed successfully' : '⚠ Execution completed with errors'}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">
          Duration: {duration}ms •
          Succeeded: {result.summary.succeeded} •
          Failed: {result.summary.failed}
        </Text>
      </Box>

      <Box flexDirection="column">
        {result.results.map((pkgResult) => (
          <Box key={pkgResult.package} flexDirection="column" marginBottom={1}>
            <Text color={pkgResult.overallStatus === 'success' ? 'green' : pkgResult.overallStatus === 'partial' ? 'yellow' : 'red'}>
              {pkgResult.overallStatus === 'success' ? '✓' : pkgResult.overallStatus === 'partial' ? '◐' : '✗'}{' '}
              {pkgResult.package}
            </Text>
            {pkgResult.steps.map((stepResult, i) => (
              <Text key={i} color="gray">
                {'  '}
                {stepResult.status === 'success' ? '✓' : stepResult.status === 'skipped' ? '○' : '✗'}{' '}
                {stepResult.step.type}: {stepResult.message ?? stepResult.error ?? 'OK'}
              </Text>
            ))}
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press </Text>
        <Text color="cyan">Enter</Text>
        <Text color="gray"> or </Text>
        <Text color="cyan">q</Text>
        <Text color="gray"> to exit</Text>
      </Box>
    </Box>
  );
}
