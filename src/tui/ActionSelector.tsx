import React, { useState, useEffect } from 'react';
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
} from '../plan/generator.js';
import { getNextMajor } from '../actions/semver.js';
import { checkUnpublishEligibility } from '../policy/unpublish.js';
import type { UnpublishEligibility } from '../types/action.js';

type ActionType = 'deprecate' | 'undeprecate' | 'tombstone' | 'unpublish' | 'ownerAdd' | 'ownerRemove';

interface ActionOption {
  type: ActionType;
  label: string;
  available: boolean;
  reason?: string;
  destructive?: boolean;
}

export interface ActionSelectorProps {
  package: DiscoveredPackage;
  client: RegistryClient;
  enableUnpublish: boolean;
  onAddAction: (action: PackageAction) => void;
  onCancel: () => void;
}

type Stage = 'select' | 'configure';

const UNPUBLISH_DOWNLOAD_THRESHOLD = 300;

export function ActionSelector({
  package: pkg,
  client,
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
  const [unpublishEligibility, setUnpublishEligibility] = useState<UnpublishEligibility | null>(null);

  // Check unpublish eligibility on mount
  useEffect(() => {
    if (enableUnpublish || (pkg.downloadsWeekly !== undefined && pkg.downloadsWeekly < UNPUBLISH_DOWNLOAD_THRESHOLD)) {
      void checkUnpublishEligibility(client, pkg).then(setUnpublishEligibility);
    }
  }, [client, pkg, enableUnpublish]);

  // Determine if unpublish should be shown
  const showUnpublish = enableUnpublish ||
    (pkg.downloadsWeekly !== undefined && pkg.downloadsWeekly < UNPUBLISH_DOWNLOAD_THRESHOLD);

  const unpublishAvailable = showUnpublish && (unpublishEligibility?.eligible ?? false);
  const unpublishReason = !showUnpublish
    ? `${String(pkg.downloadsWeekly ?? '?')} DL/wk (>${String(UNPUBLISH_DOWNLOAD_THRESHOLD)})`
    : unpublishEligibility?.reason ?? 'Checking eligibility...';

  const actions: ActionOption[] = [
    {
      type: 'deprecate',
      label: 'Deprecate',
      available: !pkg.deprecated,
      reason: pkg.deprecated ? 'Already deprecated' : undefined,
    },
    {
      type: 'undeprecate',
      label: 'Remove Deprecation',
      available: !!pkg.deprecated,
      reason: !pkg.deprecated ? 'Not deprecated' : undefined,
    },
    {
      type: 'tombstone',
      label: 'Tombstone Release',
      available: true,
      destructive: true,
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
      reason: pkg.owners.length <= 1 ? 'Last owner' : undefined,
      destructive: true,
    },
    {
      type: 'unpublish',
      label: 'Unpublish',
      available: unpublishAvailable,
      reason: unpublishAvailable ? undefined : unpublishReason,
      destructive: true,
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
    } else {
      if (key.escape) {
        setStage('select');
        setSelectedAction(null);
      } else if (key.tab) {
        // cycle focus - not needed for simple forms
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
    }

    onAddAction(action);
  };

  if (stage === 'select') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">{pkg.name}</Text>
          <Text color="gray"> — Select action</Text>
        </Box>

        <Box flexDirection="column">
          {actions.map((action) => {
            const actualIndex = availableActions.indexOf(action);
            const isCursor = actualIndex === cursor && action.available;
            const impact = ACTION_IMPACTS[action.type];

            return (
              <Box key={action.type}>
                <Box width={2}>
                  <Text color={isCursor ? 'cyan' : 'gray'}>{isCursor ? '›' : ' '}</Text>
                </Box>
                <Box width={22}>
                  <Text
                    color={!action.available ? 'gray' : action.destructive ? 'red' : isCursor ? 'white' : undefined}
                    dimColor={!action.available}
                    bold={isCursor}
                  >
                    {action.label}
                  </Text>
                </Box>
                <Box>
                  {!action.available && <Text color="gray">{action.reason}</Text>}
                  {action.available && isCursor && (
                    <Text color={impact.reversible ? 'green' : 'yellow'}>
                      {impact.reversible ? '↩ reversible' : '⚠ irreversible'}
                    </Text>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Show impact details for selected action */}
        {availableActions[cursor] && (
          <Box marginTop={1} flexDirection="column">
            <Text color="gray">{ACTION_IMPACTS[availableActions[cursor].type].description}</Text>
          </Box>
        )}
      </Box>
    );
  }

  const impact = selectedAction ? ACTION_IMPACTS[selectedAction] : null;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">{pkg.name}</Text>
        <Text color="gray"> — </Text>
        <Text bold>{impact?.title ?? selectedAction}</Text>
      </Box>

      {impact && (
        <Box marginBottom={1} flexDirection="column">
          {impact.consequences.slice(0, 3).map((c, i) => (
            <Text key={i} color="gray">• {c}</Text>
          ))}
        </Box>
      )}

      {(selectedAction === 'deprecate' || selectedAction === 'undeprecate') && (
        <Box flexDirection="column" marginBottom={1}>
          <Text>Range: </Text>
          <Box borderStyle="single" borderColor="gray" paddingX={1}>
            <TextInput
              value={range}
              onChange={setRange}
              focus={true}
              placeholder="* (all versions)"
            />
          </Box>
        </Box>
      )}

      {(selectedAction === 'deprecate' || selectedAction === 'tombstone') && (
        <Box flexDirection="column" marginBottom={1}>
          <Text>Message: </Text>
          <Box borderStyle="single" borderColor="gray" paddingX={1}>
            <TextInput
              value={message}
              onChange={setMessage}
              focus={true}
              placeholder="Deprecation message..."
            />
          </Box>
        </Box>
      )}

      {selectedAction === 'tombstone' && (
        <Box flexDirection="column" marginBottom={1}>
          <Text>Version: </Text>
          <Box borderStyle="single" borderColor="gray" paddingX={1}>
            <TextInput
              value={targetVersion}
              onChange={setTargetVersion}
              focus={false}
              placeholder={getNextMajor(pkg.latestVersion)}
            />
          </Box>
          <Text color="gray">Current: {pkg.latestVersion} → New: {targetVersion}</Text>
        </Box>
      )}

      {(selectedAction === 'ownerAdd' || selectedAction === 'ownerRemove') && (
        <Box flexDirection="column" marginBottom={1}>
          <Text>npm username: </Text>
          <Box borderStyle="single" borderColor="gray" paddingX={1}>
            <TextInput
              value={ownerUser}
              onChange={setOwnerUser}
              focus={true}
              placeholder="username"
            />
          </Box>
          {selectedAction === 'ownerRemove' && pkg.owners.length > 0 && (
            <Text color="gray">Current: {pkg.owners.join(', ')}</Text>
          )}
        </Box>
      )}

      {selectedAction === 'unpublish' && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="red" bold>This will permanently remove the package!</Text>
          {unpublishEligibility && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">Eligibility checks:</Text>
              {Object.entries(unpublishEligibility.checks).map(([key, check]) => (
                <Text key={key} color={check.passed ? 'green' : 'red'}>
                  {check.passed ? '✓' : '✗'} {check.description}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">[Enter] Confirm  [Esc] Back</Text>
      </Box>
    </Box>
  );
}
