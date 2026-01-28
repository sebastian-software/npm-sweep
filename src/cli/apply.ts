import ora from 'ora';
import chalk from 'chalk';
import * as readline from 'node:readline';
import type { Command } from 'commander';
import { RegistryClient } from '../registry/client.js';
import { loadPlan } from '../plan/serializer.js';
import { validatePlanRuntime, formatValidationResult } from '../plan/validator.js';
import { executePlan, formatExecutionResult } from '../plan/executor.js';
import { countSteps, hasDestructiveActions } from '../plan/generator.js';
import { getOtp } from '../utils/otp.js';
import { logger } from '../utils/logger.js';

interface ApplyOptions {
  in: string;
  dryRun?: boolean;
  yes?: boolean;
  enableUnpublish?: boolean;
  concurrency?: string;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function applyCommand(
  options: ApplyOptions,
  command: Command
): Promise<void> {
  const parentOpts = command.parent?.opts() ?? {};
  const registry = parentOpts.registry as string | undefined;
  const providedOtp = parentOpts.otp as string | undefined;

  const client = new RegistryClient({ registry });

  const spinner = ora('Loading plan...').start();

  try {
    const plan = await loadPlan(options.in);

    if (options.enableUnpublish) {
      plan.options.enableUnpublish = true;
    }

    const stats = countSteps(plan);

    spinner.text = 'Validating plan...';

    const validation = await validatePlanRuntime(client, plan);

    spinner.stop();

    console.log('');
    console.log(chalk.bold('Plan: ') + options.in);
    console.log(chalk.gray(`  Actor: ${plan.actor}`));
    console.log(chalk.gray(`  Generated: ${plan.generatedAt}`));
    console.log(chalk.gray(`  Packages: ${plan.actions.length}`));
    console.log(chalk.gray(`  Actions: ${stats.total}`));
    console.log('');

    console.log(formatValidationResult(validation));
    console.log('');

    if (!validation.valid) {
      console.log(chalk.red('Plan validation failed. Cannot proceed.'));
      process.exit(1);
    }

    if (options.dryRun) {
      console.log(chalk.yellow('DRY RUN MODE - No changes will be made'));
      console.log('');
    }

    const destructive = hasDestructiveActions(plan);
    const confirmCode = `APPLY ${stats.total}`;

    if (!options.yes) {
      if (destructive) {
        console.log(chalk.red.bold('⚠ WARNING: This plan contains IRREVERSIBLE actions'));
        console.log('');
      }

      const answer = await prompt(
        `Type ${chalk.cyan(confirmCode)} to confirm: `
      );

      if (answer !== confirmCode) {
        console.log(chalk.yellow('Aborted.'));
        process.exit(0);
      }
    }

    console.log('');

    const executionSpinner = ora('Executing plan...').start();

    let otp = providedOtp;
    if (!otp && !options.dryRun) {
      executionSpinner.stop();
      otp = await getOtp();
      executionSpinner.start();
    }

    const result = await executePlan(client, plan, {
      dryRun: options.dryRun,
      otp,
      concurrency: options.concurrency ? parseInt(options.concurrency, 10) : undefined,
      onProgress: (pkg, step, total) => {
        executionSpinner.text = `Executing: ${pkg} (${step}/${total})`;
      },
    });

    executionSpinner.stop();

    console.log('');
    console.log(formatExecutionResult(result));
    console.log('');

    if (result.summary.failed > 0) {
      console.log(chalk.yellow(`Completed with ${result.summary.failed} failure(s)`));
      process.exit(1);
    } else {
      console.log(chalk.green('All actions completed successfully'));
    }

  } catch (error) {
    spinner.fail('Failed to apply plan');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
