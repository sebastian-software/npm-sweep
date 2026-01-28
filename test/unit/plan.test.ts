import { describe, it, expect } from 'vitest';
import {
  createPlan,
  addActionToPlan,
  removeActionFromPlan,
  createDeprecateAction,
  createTombstoneAction,
  createArchiveRepoAction,
  countSteps,
  hasDestructiveActions,
} from '../../src/plan/generator.js';
import { validatePlanSchema } from '../../src/plan/validator.js';
import type { Plan } from '../../src/types/plan.js';

describe('plan', () => {
  describe('createPlan', () => {
    it('should create empty plan', () => {
      const plan = createPlan([], { actor: 'testuser' });

      expect(plan.version).toBe(1);
      expect(plan.actor).toBe('testuser');
      expect(plan.actions).toEqual([]);
      expect(plan.options.dryRun).toBe(false);
      expect(plan.options.enableUnpublish).toBe(false);
    });

    it('should create plan with actions', () => {
      const action = createDeprecateAction('my-pkg', '*', 'deprecated');
      const plan = createPlan([action], { actor: 'testuser' });

      expect(plan.actions).toHaveLength(1);
      expect(plan.actions[0]?.package).toBe('my-pkg');
    });
  });

  describe('addActionToPlan', () => {
    it('should add new package action', () => {
      const plan = createPlan([], { actor: 'testuser' });
      const action = createDeprecateAction('new-pkg', '*', 'msg');

      const updated = addActionToPlan(plan, action);

      expect(updated.actions).toHaveLength(1);
      expect(updated.actions[0]?.package).toBe('new-pkg');
    });

    it('should merge steps for existing package', () => {
      const action1 = createDeprecateAction('pkg', '*', 'msg');
      const plan = createPlan([action1], { actor: 'testuser' });
      const action2 = createTombstoneAction('pkg', '2.0.0', 'msg');

      const updated = addActionToPlan(plan, action2);

      expect(updated.actions).toHaveLength(1);
      expect(updated.actions[0]?.steps).toHaveLength(2);
    });
  });

  describe('removeActionFromPlan', () => {
    it('should remove package action', () => {
      const action = createDeprecateAction('pkg', '*', 'msg');
      const plan = createPlan([action], { actor: 'testuser' });

      const updated = removeActionFromPlan(plan, 'pkg');

      expect(updated.actions).toHaveLength(0);
    });
  });

  describe('countSteps', () => {
    it('should count steps by type', () => {
      const actions = [
        createDeprecateAction('pkg1', '*', 'msg'),
        createDeprecateAction('pkg2', '*', 'msg'),
        createTombstoneAction('pkg3', '2.0.0', 'msg'),
      ];
      const plan = createPlan(actions, { actor: 'testuser' });

      const stats = countSteps(plan);

      expect(stats.total).toBe(3);
      expect(stats.byType['deprecate']).toBe(2);
      expect(stats.byType['tombstone']).toBe(1);
    });
  });

  describe('hasDestructiveActions', () => {
    it('should detect unpublish as destructive', () => {
      const plan: Plan = {
        version: 1,
        generatedAt: new Date().toISOString(),
        actor: 'test',
        options: { dryRun: false, enableUnpublish: true, concurrency: 3 },
        actions: [
          { package: 'pkg', steps: [{ type: 'unpublish', force: true }] },
        ],
      };

      expect(hasDestructiveActions(plan)).toBe(true);
    });

    it('should detect ownerRemove as destructive', () => {
      const plan: Plan = {
        version: 1,
        generatedAt: new Date().toISOString(),
        actor: 'test',
        options: { dryRun: false, enableUnpublish: false, concurrency: 3 },
        actions: [
          { package: 'pkg', steps: [{ type: 'ownerRemove', user: 'someone' }] },
        ],
      };

      expect(hasDestructiveActions(plan)).toBe(true);
    });

    it('should not flag deprecate as destructive', () => {
      const action = createDeprecateAction('pkg', '*', 'msg');
      const plan = createPlan([action], { actor: 'testuser' });

      expect(hasDestructiveActions(plan)).toBe(false);
    });
  });

  describe('createArchiveRepoAction', () => {
    it('should create archiveRepo action', () => {
      const action = createArchiveRepoAction('my-pkg', 'github', 'owner/repo', true);

      expect(action.package).toBe('my-pkg');
      expect(action.steps).toHaveLength(1);
      expect(action.steps[0]?.type).toBe('archiveRepo');
      if (action.steps[0]?.type === 'archiveRepo') {
        expect(action.steps[0].provider).toBe('github');
        expect(action.steps[0].repo).toBe('owner/repo');
        expect(action.steps[0].addBanner).toBe(true);
      }
    });

    it('should create archiveRepo action without banner', () => {
      const action = createArchiveRepoAction('my-pkg', 'github', 'owner/repo', false);

      if (action.steps[0]?.type === 'archiveRepo') {
        expect(action.steps[0].addBanner).toBe(false);
      }
    });
  });

  describe('validatePlanSchema', () => {
    it('should validate correct plan', () => {
      const plan: Plan = {
        version: 1,
        generatedAt: new Date().toISOString(),
        actor: 'test',
        options: { dryRun: false, enableUnpublish: false, concurrency: 3 },
        actions: [
          { package: 'pkg', steps: [{ type: 'deprecate', range: '*', message: 'msg' }] },
        ],
      };

      const result = validatePlanSchema(plan);

      expect(result.valid).toBe(true);
      expect(result.plan).toBeDefined();
    });

    it('should reject invalid version', () => {
      const plan = {
        version: 2,
        generatedAt: new Date().toISOString(),
        actor: 'test',
        actions: [],
      };

      const result = validatePlanSchema(plan);

      expect(result.valid).toBe(false);
    });

    it('should reject missing actor', () => {
      const plan = {
        version: 1,
        generatedAt: new Date().toISOString(),
        actions: [],
      };

      const result = validatePlanSchema(plan);

      expect(result.valid).toBe(false);
    });

    it('should validate plan with archiveRepo action', () => {
      const plan: Plan = {
        version: 1,
        generatedAt: new Date().toISOString(),
        actor: 'test',
        options: { dryRun: false, enableUnpublish: false, concurrency: 3 },
        actions: [
          {
            package: 'pkg',
            steps: [{ type: 'archiveRepo', provider: 'github', repo: 'owner/repo', addBanner: true }],
          },
        ],
      };

      const result = validatePlanSchema(plan);

      expect(result.valid).toBe(true);
    });
  });
});
