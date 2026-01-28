import type { Plan, PackageAction, Step, PlanOptions } from '../types/plan.js';

export interface PlanGeneratorOptions {
  actor: string;
  options?: Partial<PlanOptions>;
}

export function createPlan(
  actions: PackageAction[],
  generatorOptions: PlanGeneratorOptions
): Plan {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    actor: generatorOptions.actor,
    options: {
      dryRun: generatorOptions.options?.dryRun ?? false,
      enableUnpublish: generatorOptions.options?.enableUnpublish ?? false,
      concurrency: generatorOptions.options?.concurrency ?? 3,
    },
    actions,
  };
}

export function addActionToPlan(plan: Plan, action: PackageAction): Plan {
  const existingIndex = plan.actions.findIndex((a) => a.package === action.package);

  if (existingIndex >= 0) {
    const existingAction = plan.actions[existingIndex]!;
    return {
      ...plan,
      actions: [
        ...plan.actions.slice(0, existingIndex),
        { ...existingAction, steps: [...existingAction.steps, ...action.steps] },
        ...plan.actions.slice(existingIndex + 1),
      ],
    };
  }

  return {
    ...plan,
    actions: [...plan.actions, action],
  };
}

export function removeActionFromPlan(plan: Plan, packageName: string): Plan {
  return {
    ...plan,
    actions: plan.actions.filter((a) => a.package !== packageName),
  };
}

export function createDeprecateAction(
  packageName: string,
  range: string,
  message: string
): PackageAction {
  return {
    package: packageName,
    steps: [{ type: 'deprecate', range, message }],
  };
}

export function createUndeprecateAction(packageName: string, range: string): PackageAction {
  return {
    package: packageName,
    steps: [{ type: 'undeprecate', range }],
  };
}

export function createUnpublishAction(
  packageName: string,
  version?: string,
  force = false
): PackageAction {
  return {
    package: packageName,
    steps: [{ type: 'unpublish', version, force }],
  };
}

export function createTombstoneAction(
  packageName: string,
  targetVersion: string,
  message: string
): PackageAction {
  return {
    package: packageName,
    steps: [{ type: 'tombstone', targetVersion, message }],
  };
}

export function createOwnerAddAction(packageName: string, user: string): PackageAction {
  return {
    package: packageName,
    steps: [{ type: 'ownerAdd', user }],
  };
}

export function createOwnerRemoveAction(packageName: string, user: string): PackageAction {
  return {
    package: packageName,
    steps: [{ type: 'ownerRemove', user }],
  };
}

export function countSteps(plan: Plan): { total: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {};
  let total = 0;

  for (const action of plan.actions) {
    for (const step of action.steps) {
      total++;
      byType[step.type] = (byType[step.type] ?? 0) + 1;
    }
  }

  return { total, byType };
}

export function hasDestructiveActions(plan: Plan): boolean {
  for (const action of plan.actions) {
    for (const step of action.steps) {
      if (step.type === 'unpublish' || step.type === 'ownerRemove') {
        return true;
      }
    }
  }
  return false;
}

export function getDestructiveSteps(plan: Plan): Array<{ package: string; step: Step }> {
  const destructive: Array<{ package: string; step: Step }> = [];

  for (const action of plan.actions) {
    for (const step of action.steps) {
      if (step.type === 'unpublish' || step.type === 'ownerRemove') {
        destructive.push({ package: action.package, step });
      }
    }
  }

  return destructive;
}
