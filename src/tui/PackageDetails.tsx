import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { DiscoveredPackage } from '../types/package.js';
import type { UnpublishEligibility } from '../types/action.js';
import type { RegistryClient } from '../registry/client.js';
import { checkUnpublishEligibility } from '../policy/unpublish.js';
import { formatDate, formatDownloads } from '../utils/format.js';

export interface PackageDetailsProps {
  package: DiscoveredPackage;
  client: RegistryClient;
  onBack: () => void;
  onAction: () => void;
}

export function PackageDetails({ package: pkg, client, onBack, onAction }: PackageDetailsProps) {
  const [eligibility, setEligibility] = useState<UnpublishEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const result = await checkUnpublishEligibility(client, pkg);
        if (!cancelled) {
          setEligibility(result);
        }
      } catch {
        // Ignore errors
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [client, pkg]);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
    } else if (input === 'a') {
      onAction();
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {pkg.name}
        </Text>
        {pkg.deprecated && (
          <Text color="yellow"> (deprecated)</Text>
        )}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color="gray">Description: </Text>
          {pkg.description ?? 'No description'}
        </Text>
        <Text>
          <Text color="gray">Latest: </Text>
          {pkg.latestVersion}
        </Text>
        <Text>
          <Text color="gray">Last publish: </Text>
          {formatDate(pkg.lastPublish)}
        </Text>
        <Text>
          <Text color="gray">Downloads/week: </Text>
          {pkg.downloadsWeekly !== undefined ? formatDownloads(pkg.downloadsWeekly) : 'Unknown'}
        </Text>
        <Text>
          <Text color="gray">Owners: </Text>
          {pkg.owners.join(', ')}
        </Text>
        <Text>
          <Text color="gray">Versions: </Text>
          {pkg.versions.length}
        </Text>
      </Box>

      {pkg.deprecated && (
        <Box marginBottom={1} borderStyle="single" borderColor="yellow" paddingX={1}>
          <Text color="yellow">
            Deprecation message: {pkg.deprecated}
          </Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Unpublish Eligibility</Text>
        {loading ? (
          <Text color="gray">Checking...</Text>
        ) : eligibility ? (
          <Box flexDirection="column">
            <Text color={eligibility.eligible ? 'green' : 'red'}>
              {eligibility.eligible ? '✓ Eligible' : '✗ Not eligible'}
            </Text>
            {Object.entries(eligibility.checks).map(([key, check]) => (
              <Text key={key}>
                <Text color={check.passed ? 'green' : 'red'}>
                  {check.passed ? '  ✓' : '  ✗'}
                </Text>
                <Text color="gray"> {key}: </Text>
                <Text>{check.description}</Text>
              </Text>
            ))}
          </Box>
        ) : (
          <Text color="red">Could not check eligibility</Text>
        )}
      </Box>

      <Box>
        <Text color="gray">Press </Text>
        <Text color="cyan">a</Text>
        <Text color="gray"> to add an action, </Text>
        <Text color="cyan">Esc</Text>
        <Text color="gray"> to go back</Text>
      </Box>
    </Box>
  );
}
