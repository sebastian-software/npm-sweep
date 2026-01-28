import React from 'react';
import { Box, Text } from 'ink';
import type { Plan } from '../types/plan.js';

export interface ExecutionProgressProps {
  plan: Plan;
  progress: {
    current: string;
    step: number;
    total: number;
  } | null;
}

export function ExecutionProgress({ plan, progress }: ExecutionProgressProps) {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const [frame, setFrame] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % spinner.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">{spinner[frame]} </Text>
        <Text bold>Executing plan...</Text>
      </Box>

      <Box marginY={1} flexDirection="column">
        {plan.actions.map((action) => {
          const isCurrent = progress?.current === action.package;
          const isDone = false;

          return (
            <Box key={action.package}>
              <Text color={isCurrent ? 'cyan' : isDone ? 'green' : 'gray'}>
                {isCurrent ? spinner[frame] : isDone ? '✓' : '○'}{' '}
                {action.package}
                {isCurrent && progress && (
                  <Text color="gray">
                    {' '}({progress.step}/{progress.total})
                  </Text>
                )}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box>
        <Text color="gray">Please wait, do not interrupt...</Text>
      </Box>
    </Box>
  );
}
