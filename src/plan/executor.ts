import type { Plan, PackageResult, StepResult, PlanExecutionResult, Step } from '../types/plan.js';
import type { RegistryClient } from '../registry/client.js';
import { OtpRequiredError } from '../registry/client.js';
import { deprecate, undeprecate } from '../actions/deprecate.js';
import { addOwner, removeOwner } from '../actions/ownership.js';
import { createTombstone } from '../actions/tombstone.js';
import { unpublish } from '../actions/unpublish.js';
import { archiveRepo } from '../actions/archiveRepo.js';
import { getOtp } from '../utils/otp.js';
import { logger } from '../utils/logger.js';

export interface ExecutorOptions {
  dryRun?: boolean;
  otp?: string;
  concurrency?: number;
  onProgress?: (packageName: string, step: number, total: number) => void;
}

export async function executePlan(
  client: RegistryClient,
  plan: Plan,
  options: ExecutorOptions = {}
): Promise<PlanExecutionResult> {
  const startedAt = new Date();
  const results: PackageResult[] = [];
  const dryRun = options.dryRun ?? plan.options.dryRun;
  const concurrency = options.concurrency ?? plan.options.concurrency ?? 3;

  let currentOtp = options.otp;

  const chunks: typeof plan.actions[] = [];
  for (let i = 0; i < plan.actions.length; i += concurrency) {
    chunks.push(plan.actions.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (action) => {
        const stepResults: StepResult[] = [];
        let failed = false;

        for (let i = 0; i < action.steps.length; i++) {
          const step = action.steps[i]!;

          if (failed) {
            stepResults.push({
              step,
              status: 'skipped',
              message: 'Skipped due to previous failure',
            });
            continue;
          }

          options.onProgress?.(action.package, i + 1, action.steps.length);

          if (dryRun) {
            logger.info(`[DRY RUN] Would execute ${step.type} on ${action.package}`);
            stepResults.push({
              step,
              status: 'success',
              message: '[DRY RUN] Skipped',
            });
            continue;
          }

          const result = await executeStepWithOtpRetry(
            client,
            action.package,
            step,
            plan.options.enableUnpublish,
            () => currentOtp,
            (otp) => {
              currentOtp = otp;
            }
          );

          stepResults.push(result);

          if (result.status === 'failed') {
            failed = true;
          }
        }

        const overallStatus: 'success' | 'partial' | 'failed' = stepResults.every((r) => r.status === 'success')
          ? 'success'
          : stepResults.some((r) => r.status === 'success')
            ? 'partial'
            : 'failed';

        return {
          package: action.package,
          steps: stepResults,
          overallStatus,
        };
      })
    );

    results.push(...chunkResults);
  }

  const completedAt = new Date();

  return {
    plan,
    startedAt,
    completedAt,
    results,
    summary: {
      total: results.length,
      succeeded: results.filter((r) => r.overallStatus === 'success').length,
      failed: results.filter((r) => r.overallStatus === 'failed').length,
      skipped: 0,
    },
  };
}

async function executeStepWithOtpRetry(
  client: RegistryClient,
  packageName: string,
  step: Step,
  enableUnpublish: boolean,
  getStoredOtp: () => string | undefined,
  setStoredOtp: (otp: string) => void
): Promise<StepResult> {
  let otp = getStoredOtp();

  const execute = async (): Promise<StepResult> => {
    try {
      const result = await executeStep(client, packageName, step, enableUnpublish, otp);
      return result;
    } catch (error) {
      if (error instanceof OtpRequiredError) {
        otp = await getOtp();
        setStoredOtp(otp);
        return execute();
      }
      throw error;
    }
  };

  return execute();
}

async function executeStep(
  client: RegistryClient,
  packageName: string,
  step: Step,
  enableUnpublish: boolean,
  otp?: string
): Promise<StepResult> {
  try {
    switch (step.type) {
      case 'deprecate': {
        const result = await deprecate(client, {
          package: packageName,
          range: step.range,
          message: step.message,
          otp,
        });
        return {
          step,
          status: result.success ? 'success' : 'failed',
          message: result.message,
          error: result.error,
        };
      }

      case 'undeprecate': {
        const result = await undeprecate(client, {
          package: packageName,
          range: step.range,
          otp,
        });
        return {
          step,
          status: result.success ? 'success' : 'failed',
          message: result.message,
          error: result.error,
        };
      }

      case 'unpublish': {
        if (!enableUnpublish) {
          return {
            step,
            status: 'skipped',
            message: 'Unpublish disabled (use --enable-unpublish)',
          };
        }

        const result = await unpublish(client, {
          package: packageName,
          version: step.version,
          force: step.force,
          otp,
        });
        return {
          step,
          status: result.success ? 'success' : 'failed',
          message: result.message,
          error: result.error,
        };
      }

      case 'tombstone': {
        const result = await createTombstone(client, {
          package: packageName,
          targetVersion: step.targetVersion,
          message: step.message,
          otp,
        });
        return {
          step,
          status: result.success ? 'success' : 'failed',
          message: result.message,
          error: result.error,
        };
      }

      case 'ownerAdd': {
        const result = await addOwner(client, {
          package: packageName,
          user: step.user,
          otp,
        });
        return {
          step,
          status: result.success ? 'success' : 'failed',
          message: result.message,
          error: result.error,
        };
      }

      case 'ownerRemove': {
        const result = await removeOwner(client, {
          package: packageName,
          user: step.user,
          otp,
        });
        return {
          step,
          status: result.success ? 'success' : 'failed',
          message: result.message,
          error: result.error,
        };
      }

      case 'archiveRepo': {
        const result = await archiveRepo({
          package: packageName,
          provider: step.provider,
          repo: step.repo,
          addBanner: step.addBanner,
        });
        return {
          step,
          status: result.success ? 'success' : 'failed',
          message: result.message,
          error: result.error,
        };
      }

      default: {
        const _exhaustive: never = step;
        return {
          step: _exhaustive,
          status: 'failed',
          error: `Unknown step type`,
        };
      }
    }
  } catch (error) {
    if (error instanceof OtpRequiredError) {
      throw error;
    }

    return {
      step,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function formatExecutionResult(result: PlanExecutionResult): string {
  const lines: string[] = [];
  const duration = result.completedAt.getTime() - result.startedAt.getTime();

  lines.push(`Execution completed in ${duration}ms`);
  lines.push(
    `Summary: ${result.summary.succeeded} succeeded, ${result.summary.failed} failed`
  );
  lines.push('');

  for (const pkgResult of result.results) {
    const icon = pkgResult.overallStatus === 'success' ? '✓' : pkgResult.overallStatus === 'partial' ? '◐' : '✗';
    lines.push(`${icon} ${pkgResult.package}`);

    for (const stepResult of pkgResult.steps) {
      const stepIcon = stepResult.status === 'success' ? '  ✓' : stepResult.status === 'skipped' ? '  ○' : '  ✗';
      const msg = stepResult.message ?? stepResult.error ?? '';
      lines.push(`${stepIcon} ${stepResult.step.type}: ${msg}`);
    }
  }

  return lines.join('\n');
}
