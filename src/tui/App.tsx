import React, { useState, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { DiscoveredPackage } from '../types/package.js';
import type { Plan, PackageAction } from '../types/plan.js';
import type { PlanExecutionResult } from '../types/plan.js';
import type { RegistryClient } from '../registry/client.js';
import { PackageList } from './PackageList.js';
import { PackageDetails } from './PackageDetails.js';
import { ActionSelector } from './ActionSelector.js';
import { BulkActionSelector } from './BulkActionSelector.js';
import { PlanSummary } from './PlanSummary.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { ExecutionProgress } from './ExecutionProgress.js';
import { ExecutionResult } from './ExecutionResult.js';
import { createPlan, addActionToPlan } from '../plan/generator.js';
import { executePlan } from '../plan/executor.js';

type Screen =
  | { type: 'loading' }
  | { type: 'list' }
  | { type: 'details'; package: DiscoveredPackage }
  | { type: 'action'; package: DiscoveredPackage }
  | { type: 'bulkAction'; packages: DiscoveredPackage[] }
  | { type: 'plan' }
  | { type: 'confirm' }
  | { type: 'executing' }
  | { type: 'done'; result: PlanExecutionResult };

export interface AppProps {
  client: RegistryClient;
  packages: DiscoveredPackage[];
  username: string;
  enableUnpublish?: boolean;
}

export function App({ client, packages, username, enableUnpublish = false }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>({ type: 'list' });
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<Plan>(() =>
    createPlan([], { actor: username, options: { enableUnpublish } })
  );
  const [executionProgress, setExecutionProgress] = useState<{
    current: string;
    step: number;
    total: number;
  } | null>(null);

  useInput((input, key) => {
    if (key.escape) {
      if (screen.type === 'details' || screen.type === 'action') {
        setScreen({ type: 'list' });
      } else if (screen.type === 'plan' || screen.type === 'confirm') {
        setScreen({ type: 'list' });
      } else if (screen.type === 'list') {
        exit();
      }
    }

    if (input === 'q' && screen.type !== 'confirm') {
      exit();
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
    // If multiple packages selected, use bulk action
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

  const handleAddAction = useCallback((action: PackageAction) => {
    setPlan((prev) => addActionToPlan(prev, action));
    setSelectedPackages(new Set());
    setScreen({ type: 'list' });
  }, []);

  const handleAddBulkActions = useCallback((actions: PackageAction[]) => {
    setPlan((prev) => {
      let updated = prev;
      for (const action of actions) {
        updated = addActionToPlan(updated, action);
      }
      return updated;
    });
    setSelectedPackages(new Set());
    setScreen({ type: 'list' });
  }, []);

  const handleViewPlan = useCallback(() => {
    setScreen({ type: 'plan' });
  }, []);

  const handleConfirm = useCallback(() => {
    setScreen({ type: 'confirm' });
  }, []);

  const handleExecute = useCallback(async () => {
    setScreen({ type: 'executing' });

    const result = await executePlan(client, plan, {
      onProgress: (current, step, total) => {
        setExecutionProgress({ current, step, total });
      },
    });

    setScreen({ type: 'done', result });
  }, [client, plan]);

  const handleBack = useCallback(() => {
    setScreen({ type: 'list' });
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          npm-sweep
        </Text>
        <Text color="gray"> — Managing packages for </Text>
        <Text color="yellow">{username}</Text>
        {plan.actions.length > 0 && (
          <Text color="magenta"> [{plan.actions.length} actions planned]</Text>
        )}
      </Box>

      {screen.type === 'list' && (
        <PackageList
          packages={packages}
          selectedPackages={selectedPackages}
          plannedPackages={new Set(plan.actions.map((a) => a.package))}
          onSelect={handleSelect}
          onToggle={handleToggle}
          onAction={handleAction}
          onViewPlan={handleViewPlan}
          hasPlan={plan.actions.length > 0}
        />
      )}

      {screen.type === 'details' && (
        <PackageDetails
          package={screen.package}
          client={client}
          onBack={handleBack}
          onAction={() => handleAction(screen.package)}
        />
      )}

      {screen.type === 'action' && (
        <ActionSelector
          package={screen.package}
          client={client}
          enableUnpublish={enableUnpublish}
          onAddAction={handleAddAction}
          onCancel={handleBack}
        />
      )}

      {screen.type === 'bulkAction' && (
        <BulkActionSelector
          packages={screen.packages}
          enableUnpublish={enableUnpublish}
          onAddActions={handleAddBulkActions}
          onCancel={handleBack}
        />
      )}

      {screen.type === 'plan' && (
        <PlanSummary
          plan={plan}
          onConfirm={handleConfirm}
          onBack={handleBack}
        />
      )}

      {screen.type === 'confirm' && (
        <ConfirmDialog
          plan={plan}
          onConfirm={handleExecute}
          onCancel={handleBack}
        />
      )}

      {screen.type === 'executing' && (
        <ExecutionProgress
          plan={plan}
          progress={executionProgress}
        />
      )}

      {screen.type === 'done' && (
        <ExecutionResult
          result={screen.result}
          onExit={exit}
        />
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          {screen.type === 'list' && 'j/k: navigate • s: sort • o: order • a: action • p: plan • /: filter • q: quit'}
          {screen.type === 'details' && 'a: add action • Esc: back • q: quit'}
          {(screen.type === 'action' || screen.type === 'bulkAction') && 'Enter: confirm • Esc: cancel'}
          {screen.type === 'plan' && 'Enter: confirm & execute • Esc: back'}
          {screen.type === 'confirm' && 'Type confirmation to proceed • Esc: cancel'}
          {screen.type === 'done' && 'Enter/q: exit'}
        </Text>
      </Box>
    </Box>
  );
}
