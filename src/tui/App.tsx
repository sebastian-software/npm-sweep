import React, { useState, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { DiscoveredPackage } from '../types/package.js';
import type { PackageAction } from '../types/plan.js';
import type { ActionResult } from '../types/action.js';
import type { RegistryClient } from '../registry/client.js';
import { PackageList } from './PackageList.js';
import { PackageDetails } from './PackageDetails.js';
import { ActionSelector } from './ActionSelector.js';
import { BulkActionSelector } from './BulkActionSelector.js';
import { QuickConfirm } from './QuickConfirm.js';
import { executeAction } from '../plan/executor.js';
import { findPackagesWithMetadata } from '../registry/search.js';
import { getPackument, packumentToDiscovered } from '../registry/packument.js';

type Screen =
  | { type: 'list' }
  | { type: 'refreshing' }
  | { type: 'details'; package: DiscoveredPackage }
  | { type: 'action'; package: DiscoveredPackage }
  | { type: 'bulkAction'; packages: DiscoveredPackage[] }
  | { type: 'confirm'; actions: PackageAction[] }
  | { type: 'executing'; actions: PackageAction[]; current: number }
  | { type: 'done'; results: ActionResult[] };

export interface AppProps {
  client: RegistryClient;
  packages: DiscoveredPackage[];
  username: string;
  enableUnpublish?: boolean;
}

export function App({ client, packages: initialPackages, username, enableUnpublish = false }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>({ type: 'list' });
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [packages, setPackages] = useState(initialPackages);

  useInput((input, key) => {
    if (key.escape) {
      if (screen.type === 'details' || screen.type === 'action' || screen.type === 'bulkAction') {
        setScreen({ type: 'list' });
      } else if (screen.type === 'confirm') {
        setScreen({ type: 'list' });
      } else if (screen.type === 'list') {
        exit();
      }
    }

    if (screen.type === 'done') {
      if (key.return) {
        // Remove successfully unpublished packages from the list
        const unpublishedPackages = new Set(
          screen.results
            .filter(r => r.success && r.action === 'unpublish')
            .map(r => r.package)
        );
        if (unpublishedPackages.size > 0) {
          setPackages(prev => prev.filter(p => !unpublishedPackages.has(p.name)));
        }
        setScreen({ type: 'list' });
      } else if (input === 'q') {
        exit();
      }
      return;
    }

    if (input === 'q' && screen.type !== 'confirm' && screen.type !== 'executing') {
      exit();
    }

    if (input === 'r' && screen.type === 'list') {
      handleRefresh();
    }
  });

  const handleSelect = useCallback((pkg: DiscoveredPackage) => {
    setScreen({ type: 'details', package: pkg });
  }, []);

  const handleToggle = useCallback((pkgName: string) => {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(pkgName)) {
        next.delete(pkgName);
      } else {
        next.add(pkgName);
      }
      return next;
    });
  }, []);

  const handleAction = useCallback((pkg: DiscoveredPackage) => {
    if (selectedPackages.size > 1) {
      const selectedPkgs = packages.filter((p) => selectedPackages.has(p.name));
      setScreen({ type: 'bulkAction', packages: selectedPkgs });
    } else if (selectedPackages.size === 1) {
      const selectedPkg = packages.find((p) => selectedPackages.has(p.name));
      if (selectedPkg) {
        setScreen({ type: 'action', package: selectedPkg });
      }
    } else {
      setScreen({ type: 'action', package: pkg });
    }
  }, [selectedPackages, packages]);

  const handleActionSelected = useCallback((action: PackageAction) => {
    setSelectedPackages(new Set());
    setScreen({ type: 'confirm', actions: [action] });
  }, []);

  const handleBulkActionsSelected = useCallback((actions: PackageAction[]) => {
    setSelectedPackages(new Set());
    setScreen({ type: 'confirm', actions });
  }, []);

  const handleExecute = useCallback(async (actions: PackageAction[]) => {
    setScreen({ type: 'executing', actions, current: 0 });

    const results: ActionResult[] = [];
    for (let i = 0; i < actions.length; i++) {
      setScreen({ type: 'executing', actions, current: i });
      const result = await executeAction(client, actions[i]!, enableUnpublish);
      results.push(result);
    }

    setScreen({ type: 'done', results });
  }, [client, enableUnpublish]);

  const handleBackToList = useCallback(() => {
    setScreen({ type: 'list' });
  }, []);

  const handleRefresh = useCallback(async () => {
    setScreen({ type: 'refreshing' });
    try {
      const searchResults = await findPackagesWithMetadata(client, username);
      const metaByName = new Map(searchResults.map(m => [m.name, m]));
      const fetchedPackages = await Promise.all(
        searchResults.map(async (meta) => {
          try {
            const packument = await getPackument(client, meta.name);
            return packumentToDiscovered(packument);
          } catch {
            return null;
          }
        })
      );
      const validPackages = fetchedPackages.filter((p): p is DiscoveredPackage => p !== null);
      for (const pkg of validPackages) {
        const meta = metaByName.get(pkg.name);
        if (meta) {
          pkg.downloadsWeekly = meta.downloadsWeekly;
          pkg.dependentsCount = meta.dependents;
        }
      }
      setPackages(validPackages);
      setSelectedPackages(new Set());
    } catch {
      // Silently fail, keep existing list
    }
    setScreen({ type: 'list' });
  }, [client, username]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          npm-sweep
        </Text>
        <Text color="gray"> — Managing packages for </Text>
        <Text color="yellow">{username}</Text>
      </Box>

      {screen.type === 'refreshing' && (
        <Box>
          <Text color="cyan">↻ Refreshing package list...</Text>
        </Box>
      )}

      {screen.type === 'list' && (
        <PackageList
          packages={packages}
          selectedPackages={selectedPackages}
          plannedPackages={new Set()}
          onSelect={handleSelect}
          onToggle={handleToggle}
          onAction={handleAction}
          onViewPlan={() => {}}
          hasPlan={false}
        />
      )}

      {screen.type === 'details' && (
        <PackageDetails
          package={screen.package}
          client={client}
          onBack={handleBackToList}
          onAction={() => handleAction(screen.package)}
        />
      )}

      {screen.type === 'action' && (
        <ActionSelector
          package={screen.package}
          client={client}
          enableUnpublish={enableUnpublish}
          onAddAction={handleActionSelected}
          onCancel={handleBackToList}
        />
      )}

      {screen.type === 'bulkAction' && (
        <BulkActionSelector
          packages={screen.packages}
          enableUnpublish={enableUnpublish}
          onAddActions={handleBulkActionsSelected}
          onCancel={handleBackToList}
        />
      )}

      {screen.type === 'confirm' && (
        <QuickConfirm
          actions={screen.actions}
          onConfirm={() => handleExecute(screen.actions)}
          onCancel={handleBackToList}
        />
      )}

      {screen.type === 'executing' && (
        <Box flexDirection="column">
          <Text color="yellow">
            Executing {screen.current + 1}/{screen.actions.length}...
          </Text>
          <Text color="gray">{screen.actions[screen.current]?.package}</Text>
        </Box>
      )}

      {screen.type === 'done' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color={screen.results.every(r => r.success) ? 'green' : 'yellow'}>
              {screen.results.every(r => r.success)
                ? '✓ All actions completed'
                : `⚠ Completed with ${screen.results.filter(r => !r.success).length} error(s)`}
            </Text>
          </Box>

          {screen.results.map((result, i) => (
            <Box key={i}>
              <Text color={result.success ? 'green' : 'red'}>
                {result.success ? '✓' : '✗'} {result.package}: {result.message ?? result.error}
              </Text>
            </Box>
          ))}

          <Box marginTop={1}>
            <Text color="gray">[Enter] Back to list  [q] Quit</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          {screen.type === 'list' && 'j/k: navigate • Space: select • s: sort • a: action • r: refresh • q: quit'}
          {screen.type === 'details' && 'a: action • Esc: back'}
          {(screen.type === 'action' || screen.type === 'bulkAction') && 'Enter: confirm • Esc: cancel'}
          {screen.type === 'confirm' && 'y: execute • Esc: cancel'}
          {screen.type === 'done' && 'Enter: back to list • q: quit'}
        </Text>
      </Box>
    </Box>
  );
}
