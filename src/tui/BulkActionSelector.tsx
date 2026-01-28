import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { DiscoveredPackage } from '../types/package.js';
import type { PackageAction } from '../types/plan.js';
import { ACTION_IMPACTS } from '../types/action.js';
import {
  createDeprecateAction,
  createTombstoneAction,
  createUnpublishAction,
} from '../plan/generator.js';
import { getNextMajor } from '../actions/semver.js';

type BulkActionType = 'deprecate' | 'tombstone' | 'unpublish';

interface ActionOption {
  type: BulkActionType;
  label: string;
  description: string;
  destructive?: boolean;
}

export interface BulkActionSelectorProps {
  packages: DiscoveredPackage[];
  enableUnpublish: boolean;
  onAddActions: (actions: PackageAction[]) => void;
  onCancel: () => void;
}

type Stage = 'select' | 'configure';

export function BulkActionSelector({
  packages,
  enableUnpublish,
  onAddActions,
  onCancel,
}: BulkActionSelectorProps) {
  const [stage, setStage] = useState<Stage>('select');
  const [selectedAction, setSelectedAction] = useState<BulkActionType | null>(null);
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState(
    'This package is no longer maintained. Please consider alternatives.'
  );

  const actions: ActionOption[] = [
    {
      type: 'deprecate',
      label: 'Deprecate All',
      description: 'Mark all selected packages as deprecated',
    },
    {
      type: 'tombstone',
      label: 'Tombstone All',
      description: 'Publish tombstone releases for all selected packages',
      destructive: true,
    },
    ...(enableUnpublish
      ? [
          {
            type: 'unpublish' as const,
            label: 'Unpublish All',
            description: 'Permanently remove all selected packages from npm',
            destructive: true,
          },
        ]
      : []),
  ];

  useInput((input, key) => {
    if (stage === 'select') {
      if (key.escape) {
        onCancel();
      } else if (input === 'j' || key.downArrow) {
        setCursor((prev) => Math.min(prev + 1, actions.length - 1));
      } else if (input === 'k' || key.upArrow) {
        setCursor((prev) => Math.max(prev - 1, 0));
      } else if (key.return) {
        const action = actions[cursor];
        if (action) {
          if (action.type === 'unpublish') {
            // Unpublish doesn't need message configuration
            setSelectedAction(action.type);
            handleUnpublishConfirm();
          } else {
            setSelectedAction(action.type);
            setStage('configure');
          }
        }
      }
    } else {
      if (key.escape) {
        setStage('select');
        setSelectedAction(null);
      } else if (key.return && !key.shift) {
        handleConfirm();
      }
    }
  });

  const handleUnpublishConfirm = () => {
    const packageActions: PackageAction[] = packages.map((pkg) =>
      createUnpublishAction(pkg.name, undefined, true)
    );
    onAddActions(packageActions);
  };

  const handleConfirm = () => {
    if (!selectedAction) return;

    const packageActions: PackageAction[] = packages.map((pkg) => {
      switch (selectedAction) {
        case 'deprecate':
          return createDeprecateAction(pkg.name, '*', message);
        case 'tombstone':
          return createTombstoneAction(pkg.name, getNextMajor(pkg.latestVersion), message);
        case 'unpublish':
          return createUnpublishAction(pkg.name, undefined, true);
      }
    });

    onAddActions(packageActions);
  };

  if (stage === 'select') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">Bulk Action</Text>
          <Text color="gray"> — {packages.length} packages selected</Text>
        </Box>

        <Box marginBottom={1} flexDirection="column">
          {packages.slice(0, 5).map((pkg) => (
            <Box key={pkg.name}>
              <Text color="gray">• {pkg.name}</Text>
              {pkg.downloadsWeekly !== undefined && (
                <Text color="gray"> ({pkg.downloadsWeekly} DL/wk)</Text>
              )}
            </Box>
          ))}
          {packages.length > 5 && (
            <Text color="gray">  ...and {packages.length - 5} more</Text>
          )}
        </Box>

        <Box flexDirection="column">
          {actions.map((action, index) => {
            const isCursor = index === cursor;
            const impact = ACTION_IMPACTS[action.type];

            return (
              <Box key={action.type}>
                <Box width={2}>
                  <Text color={isCursor ? 'cyan' : 'gray'}>{isCursor ? '›' : ' '}</Text>
                </Box>
                <Box width={20}>
                  <Text
                    bold={isCursor}
                    color={action.destructive ? 'red' : isCursor ? 'white' : undefined}
                  >
                    {action.label}
                  </Text>
                </Box>
                <Box>
                  {isCursor && (
                    <Text color={impact.reversible ? 'green' : 'yellow'}>
                      {impact.reversible ? '↩ reversible' : '⚠ IRREVERSIBLE'}
                    </Text>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {actions[cursor] && (
          <Box marginTop={1}>
            <Text color="gray">{actions[cursor].description}</Text>
          </Box>
        )}

        {actions[cursor].type === 'unpublish' && (
          <Box marginTop={1}>
            <Text color="red" bold>
              Warning: This will permanently delete {packages.length} packages!
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  const impact = selectedAction ? ACTION_IMPACTS[selectedAction] : null;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Bulk {impact?.title ?? selectedAction}</Text>
        <Text color="gray"> — {packages.length} packages</Text>
      </Box>

      {impact && (
        <Box marginBottom={1} flexDirection="column">
          {impact.consequences.slice(0, 2).map((c, i) => (
            <Text key={i} color="gray">• {c}</Text>
          ))}
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text>Message (applied to all): </Text>
        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <TextInput
            value={message}
            onChange={setMessage}
            focus={true}
            placeholder="Deprecation message..."
          />
        </Box>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text color="yellow">This will create {packages.length} actions:</Text>
        {packages.slice(0, 3).map((pkg) => (
          <Text key={pkg.name} color="gray">
            • {selectedAction} {pkg.name}
          </Text>
        ))}
        {packages.length > 3 && (
          <Text color="gray">  ...and {packages.length - 3} more</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">[Enter] Add all to plan  [Esc] Back</Text>
      </Box>
    </Box>
  );
}
