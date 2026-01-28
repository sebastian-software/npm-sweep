import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { DiscoveredPackage } from '../types/package.js';
import type { PackageAction } from '../types/plan.js';
import type { RegistryClient } from '../registry/client.js';
import { ACTION_IMPACTS } from '../types/action.js';
import {
  createDeprecateAction,
  createUndeprecateAction,
  createTombstoneAction,
  createUnpublishAction,
  createOwnerAddAction,
  createOwnerRemoveAction,
  createArchiveRepoAction,
} from '../plan/generator.js';
import { parseRepoUrl } from '../providers/github.js';
import { getNextMajor } from '../actions/semver.js';

type ActionType = 'deprecate' | 'undeprecate' | 'tombstone' | 'unpublish' | 'ownerAdd' | 'ownerRemove' | 'archiveRepo';

interface ActionOption {
  type: ActionType;
  label: string;
  available: boolean;
  reason?: string;
}

export interface ActionSelectorProps {
  package: DiscoveredPackage;
  client: RegistryClient;
  enableUnpublish: boolean;
  onAddAction: (action: PackageAction) => void;
  onCancel: () => void;
}

type Stage = 'select' | 'configure';

export function ActionSelector({
  package: pkg,
  enableUnpublish,
  onAddAction,
  onCancel,
}: ActionSelectorProps) {
  const [stage, setStage] = useState<Stage>('select');
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState(
    `This package is no longer maintained. Please consider alternatives.`
  );
  const [range, setRange] = useState('*');
  const [targetVersion, setTargetVersion] = useState(() => getNextMajor(pkg.latestVersion));
  const [ownerUser, setOwnerUser] = useState('');
  const [focusedInput, setFocusedInput] = useState(0);

  const repoUrl = pkg.repository?.url ?? '';
  const parsedRepo = parseRepoUrl(repoUrl);
  const hasGitHubRepo = parsedRepo !== null && repoUrl.includes('github');

  const actions: ActionOption[] = [
    {
      type: 'deprecate',
      label: 'Deprecate',
      available: !pkg.deprecated,
      reason: pkg.deprecated ? 'Already deprecated' : undefined,
    },
    {
      type: 'undeprecate',
      label: 'Undeprecate',
      available: !!pkg.deprecated,
      reason: !pkg.deprecated ? 'Not deprecated' : undefined,
    },
    {
      type: 'tombstone',
      label: 'Tombstone Release',
      available: true,
    },
    {
      type: 'unpublish',
      label: 'Unpublish',
      available: enableUnpublish,
      reason: !enableUnpublish ? 'Use --enable-unpublish flag' : undefined,
    },
    {
      type: 'ownerAdd',
      label: 'Add Owner',
      available: true,
    },
    {
      type: 'ownerRemove',
      label: 'Remove Owner',
      available: pkg.owners.length > 1,
      reason: pkg.owners.length <= 1 ? 'Cannot remove last owner' : undefined,
    },
    {
      type: 'archiveRepo',
      label: 'Archive Repository',
      available: hasGitHubRepo,
      reason: !hasGitHubRepo ? 'No GitHub repository linked' : undefined,
    },
  ];

  const availableActions = actions.filter((a) => a.available);

  useInput((input, key) => {
    if (stage === 'select') {
      if (key.escape) {
        onCancel();
      } else if (input === 'j' || key.downArrow) {
        setCursor((prev) => Math.min(prev + 1, availableActions.length - 1));
      } else if (input === 'k' || key.upArrow) {
        setCursor((prev) => Math.max(prev - 1, 0));
      } else if (key.return) {
        const action = availableActions[cursor];
        if (action) {
          setSelectedAction(action.type);
          setStage('configure');
        }
      }
    } else if (stage === 'configure') {
      if (key.escape) {
        setStage('select');
        setSelectedAction(null);
      } else if (key.tab) {
        setFocusedInput((prev) => prev + 1);
      } else if (key.return && !key.shift) {
        handleConfirm();
      }
    }
  });

  const handleConfirm = () => {
    if (!selectedAction) return;

    let action: PackageAction;

    switch (selectedAction) {
      case 'deprecate':
        action = createDeprecateAction(pkg.name, range, message);
        break;
      case 'undeprecate':
        action = createUndeprecateAction(pkg.name, range);
        break;
      case 'tombstone':
        action = createTombstoneAction(pkg.name, targetVersion, message);
        break;
      case 'unpublish':
        action = createUnpublishAction(pkg.name, undefined, true);
        break;
      case 'ownerAdd':
        if (!ownerUser) return;
        action = createOwnerAddAction(pkg.name, ownerUser);
        break;
      case 'ownerRemove':
        if (!ownerUser) return;
        action = createOwnerRemoveAction(pkg.name, ownerUser);
        break;
      case 'archiveRepo':
        if (!parsedRepo) return;
        action = createArchiveRepoAction(
          pkg.name,
          'github',
          `${parsedRepo.owner}/${parsedRepo.name}`,
          true
        );
        break;
    }

    onAddAction(action);
  };

  if (stage === 'select') {
    return (
      <Box flexDirection="column">
        <Text bold>Select action for {pkg.name}</Text>
        <Box marginY={1} />

        {actions.map((action, index) => {
          const actualIndex = availableActions.indexOf(action);
          const isCursor = actualIndex === cursor && action.available;
          const impact = ACTION_IMPACTS[action.type];

          return (
            <Box key={action.type} flexDirection="column" marginBottom={1}>
              <Text
                backgroundColor={isCursor ? 'blue' : undefined}
                color={!action.available ? 'gray' : isCursor ? 'white' : undefined}
                dimColor={!action.available}
              >
                {isCursor ? '>' : ' '} {action.label}
                {!action.available && <Text color="gray"> ({action.reason})</Text>}
              </Text>
              {isCursor && impact && (
                <Box marginLeft={2} flexDirection="column">
                  <Text color="gray">{impact.description}</Text>
                  <Text color={impact.reversible ? 'green' : 'red'}>
                    {impact.reversible ? 'Reversible' : 'IRREVERSIBLE'}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  const impact = selectedAction ? ACTION_IMPACTS[selectedAction] : null;

  return (
    <Box flexDirection="column">
      <Text bold>Configure: {selectedAction}</Text>

      {impact && (
        <Box marginY={1} borderStyle="single" borderColor={impact.reversible ? 'green' : 'red'} paddingX={1}>
          <Box flexDirection="column">
            <Text>{impact.description}</Text>
            {impact.consequences.map((c, i) => (
              <Text key={i} color="gray">• {c}</Text>
            ))}
          </Box>
        </Box>
      )}

      {(selectedAction === 'deprecate' || selectedAction === 'undeprecate') && (
        <Box flexDirection="column" marginY={1}>
          <Text>Version range:</Text>
          <Box>
            <TextInput
              value={range}
              onChange={setRange}
              focus={focusedInput % 2 === 0}
              placeholder="* (all versions)"
            />
          </Box>
        </Box>
      )}

      {(selectedAction === 'deprecate' || selectedAction === 'tombstone') && (
        <Box flexDirection="column" marginY={1}>
          <Text>Message:</Text>
          <Box>
            <TextInput
              value={message}
              onChange={setMessage}
              focus={focusedInput % 2 === 1}
              placeholder="Deprecation message..."
            />
          </Box>
        </Box>
      )}

      {selectedAction === 'tombstone' && (
        <Box flexDirection="column" marginY={1}>
          <Text>Target version:</Text>
          <Box>
            <TextInput
              value={targetVersion}
              onChange={setTargetVersion}
              focus={focusedInput % 2 === 0}
              placeholder={getNextMajor(pkg.latestVersion)}
            />
          </Box>
        </Box>
      )}

      {(selectedAction === 'ownerAdd' || selectedAction === 'ownerRemove') && (
        <Box flexDirection="column" marginY={1}>
          <Text>Username:</Text>
          <Box>
            <TextInput
              value={ownerUser}
              onChange={setOwnerUser}
              focus={true}
              placeholder="npm username..."
            />
          </Box>
          {selectedAction === 'ownerRemove' && (
            <Box marginTop={1}>
              <Text color="gray">Current owners: {pkg.owners.join(', ')}</Text>
            </Box>
          )}
        </Box>
      )}

      {selectedAction === 'archiveRepo' && parsedRepo && (
        <Box flexDirection="column" marginY={1}>
          <Text>Repository: <Text color="cyan">{parsedRepo.owner}/{parsedRepo.name}</Text></Text>
          <Box marginTop={1}>
            <Text color="gray">This will:</Text>
          </Box>
          <Text color="gray">• Add an unmaintained banner to README.md</Text>
          <Text color="gray">• Set the repository to read-only (archived)</Text>
          <Box marginTop={1}>
            <Text color="yellow">Requires: GitHub CLI (gh) authenticated</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Press </Text>
        <Text color="cyan">Enter</Text>
        <Text color="gray"> to confirm, </Text>
        <Text color="cyan">Esc</Text>
        <Text color="gray"> to go back</Text>
      </Box>
    </Box>
  );
}
