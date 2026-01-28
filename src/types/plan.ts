import { z } from 'zod';

export const DeprecateStepSchema = z.object({
  type: z.literal('deprecate'),
  range: z.string().default('*'),
  message: z.string(),
});

export const UndeprecateStepSchema = z.object({
  type: z.literal('undeprecate'),
  range: z.string().default('*'),
});

export const UnpublishStepSchema = z.object({
  type: z.literal('unpublish'),
  version: z.string().optional(),
  force: z.boolean().default(false),
});

export const TombstoneStepSchema = z.object({
  type: z.literal('tombstone'),
  targetVersion: z.string(),
  message: z.string(),
});

export const OwnerAddStepSchema = z.object({
  type: z.literal('ownerAdd'),
  user: z.string(),
});

export const OwnerRemoveStepSchema = z.object({
  type: z.literal('ownerRemove'),
  user: z.string(),
});

export const ArchiveRepoStepSchema = z.object({
  type: z.literal('archiveRepo'),
  provider: z.enum(['github', 'gitlab']),
  repo: z.string(),
  addBanner: z.boolean().default(true),
});

export const StepSchema = z.discriminatedUnion('type', [
  DeprecateStepSchema,
  UndeprecateStepSchema,
  UnpublishStepSchema,
  TombstoneStepSchema,
  OwnerAddStepSchema,
  OwnerRemoveStepSchema,
  ArchiveRepoStepSchema,
]);

export const PackageActionSchema = z.object({
  package: z.string(),
  steps: z.array(StepSchema).min(1),
});

export const PlanOptionsSchema = z.object({
  dryRun: z.boolean().default(false),
  enableUnpublish: z.boolean().default(false),
  concurrency: z.number().int().positive().default(3),
});

export const PlanSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().datetime(),
  actor: z.string(),
  options: PlanOptionsSchema.default({}),
  actions: z.array(PackageActionSchema),
});

export type Step = z.infer<typeof StepSchema>;
export type DeprecateStep = z.infer<typeof DeprecateStepSchema>;
export type UndeprecateStep = z.infer<typeof UndeprecateStepSchema>;
export type UnpublishStep = z.infer<typeof UnpublishStepSchema>;
export type TombstoneStep = z.infer<typeof TombstoneStepSchema>;
export type OwnerAddStep = z.infer<typeof OwnerAddStepSchema>;
export type OwnerRemoveStep = z.infer<typeof OwnerRemoveStepSchema>;
export type ArchiveRepoStep = z.infer<typeof ArchiveRepoStepSchema>;
export type PackageAction = z.infer<typeof PackageActionSchema>;
export type PlanOptions = z.infer<typeof PlanOptionsSchema>;
export type Plan = z.infer<typeof PlanSchema>;

export interface StepResult {
  step: Step;
  status: 'success' | 'skipped' | 'failed';
  message?: string;
  error?: string;
}

export interface PackageResult {
  package: string;
  steps: StepResult[];
  overallStatus: 'success' | 'partial' | 'failed';
}

export interface PlanExecutionResult {
  plan: Plan;
  startedAt: Date;
  completedAt: Date;
  results: PackageResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
}
