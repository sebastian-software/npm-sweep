import { PlanSchema } from '../types/plan.js';
import type { Plan } from '../types/plan.js';
import type { RegistryClient } from '../registry/client.js';
import { getPackument, packumentToDiscovered } from '../registry/packument.js';
import { checkUnpublishEligibility } from '../policy/unpublish.js';
import { whoami } from '../registry/auth.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  package?: string;
  step?: number;
  message: string;
  code: string;
}

export interface ValidationWarning {
  package?: string;
  step?: number;
  message: string;
  code: string;
}

export function validatePlanSchema(data: unknown): { valid: boolean; plan?: Plan; error?: string } {
  const result = PlanSchema.safeParse(data);

  if (!result.success) {
    return {
      valid: false,
      error: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
    };
  }

  return { valid: true, plan: result.data };
}

export async function validatePlanRuntime(
  client: RegistryClient,
  plan: Plan
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  let currentUser: string | undefined;
  try {
    currentUser = await whoami(client);
  } catch {
    errors.push({
      message: 'Could not authenticate with registry',
      code: 'AUTH_FAILED',
    });
    return { valid: false, errors, warnings };
  }

  if (!plan.options.enableUnpublish) {
    for (const action of plan.actions) {
      for (let i = 0; i < action.steps.length; i++) {
        const step = action.steps[i];
        if (step?.type === 'unpublish') {
          errors.push({
            package: action.package,
            step: i,
            message: 'Unpublish requires --enable-unpublish flag',
            code: 'UNPUBLISH_DISABLED',
          });
        }
      }
    }
  }

  for (const action of plan.actions) {
    try {
      const packument = await getPackument(client, action.package);
      const discovered = packumentToDiscovered(packument);

      const isOwner = discovered.owners.some(
        (o) => o.toLowerCase() === currentUser.toLowerCase()
      );
      if (!isOwner) {
        errors.push({
          package: action.package,
          message: `You are not an owner of ${action.package}`,
          code: 'NOT_OWNER',
        });
        continue;
      }

      for (let i = 0; i < action.steps.length; i++) {
        const step = action.steps[i];
        if (!step) continue;

        if (step.type === 'unpublish') {
          const eligibility = await checkUnpublishEligibility(client, discovered);
          if (!eligibility.eligible) {
            errors.push({
              package: action.package,
              step: i,
              message: `Unpublish not eligible: ${eligibility.reason ?? 'unknown'}`,
              code: 'UNPUBLISH_INELIGIBLE',
            });
          }
        }

        if (step.type === 'tombstone') {
          if (packument.versions[step.targetVersion]) {
            errors.push({
              package: action.package,
              step: i,
              message: `Version ${step.targetVersion} already exists`,
              code: 'VERSION_EXISTS',
            });
          }
        }

        if (step.type === 'ownerRemove') {
          if (step.user.toLowerCase() === currentUser.toLowerCase()) {
            if (discovered.owners.length === 1) {
              errors.push({
                package: action.package,
                step: i,
                message: 'Cannot remove yourself as the only owner',
                code: 'LAST_OWNER',
              });
            } else {
              warnings.push({
                package: action.package,
                step: i,
                message: 'You are removing yourself - you will lose access',
                code: 'REMOVING_SELF',
              });
            }
          }
        }

        if (step.type === 'ownerAdd') {
          const alreadyOwner = discovered.owners.some(
            (o) => o.toLowerCase() === step.user.toLowerCase()
          );
          if (alreadyOwner) {
            warnings.push({
              package: action.package,
              step: i,
              message: `${step.user} is already an owner`,
              code: 'ALREADY_OWNER',
            });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        package: action.package,
        message: `Could not validate: ${message}`,
        code: 'VALIDATION_ERROR',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✓ Plan is valid');
  } else {
    lines.push('✗ Plan has errors');
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of result.errors) {
      const prefix = error.package
        ? `  [${error.package}${error.step !== undefined ? ` step ${String(error.step)}` : ''}]`
        : '  ';
      lines.push(`${prefix} ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      const prefix = warning.package
        ? `  [${warning.package}${warning.step !== undefined ? ` step ${String(warning.step)}` : ''}]`
        : '  ';
      lines.push(`${prefix} ${warning.message}`);
    }
  }

  return lines.join('\n');
}
