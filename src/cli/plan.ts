import ora from 'ora';
import chalk from 'chalk';
import type { Command } from 'commander';
import { RegistryClient } from '../registry/client.js';
import { whoami } from '../registry/auth.js';
import { findPackagesByMaintainer } from '../registry/search.js';
import { getPackument, packumentToDiscovered } from '../registry/packument.js';
import {
  createPlan,
  createDeprecateAction,
  createTombstoneAction,
  createUnpublishAction,
} from '../plan/generator.js';
import { savePlan } from '../plan/serializer.js';
import { getNextMajor } from '../actions/semver.js';
import { logger } from '../utils/logger.js';

interface PlanOptions {
  out: string;
  user?: string;
  scope?: string;
  packages?: string;
  action?: string;
  message?: string;
  enableUnpublish?: boolean;
}

export async function planCommand(
  options: PlanOptions,
  command: Command
): Promise<void> {
  const parentOpts = command.parent?.opts() ?? {};
  const registry = parentOpts.registry as string | undefined;

  const client = new RegistryClient({ registry });

  const spinner = ora('Creating plan...').start();

  try {
    let username = options.user;

    if (!username) {
      spinner.text = 'Authenticating...';
      username = await whoami(client);
    }

    let packageNames: string[];

    if (options.packages) {
      packageNames = options.packages.split(',').map((p) => p.trim());
    } else {
      spinner.text = `Searching packages for ${username}...`;
      packageNames = await findPackagesByMaintainer(client, username);

      if (options.scope) {
        packageNames = packageNames.filter((name) =>
          name.startsWith((options.scope ?? '') + '/')
        );
      }
    }

    if (packageNames.length === 0) {
      spinner.fail('No packages to include in plan');
      return;
    }

    const defaultMessage =
      options.message ??
      'This package is no longer maintained. Please consider alternatives.';

    const actions = await Promise.all(
      packageNames.map(async (name) => {
        try {
          const packument = await getPackument(client, name);
          const pkg = packumentToDiscovered(packument);

          switch (options.action) {
            case 'deprecate':
              return createDeprecateAction(name, '*', defaultMessage);

            case 'tombstone':
              return createTombstoneAction(
                name,
                getNextMajor(pkg.latestVersion),
                defaultMessage
              );

            case 'unpublish':
              if (!options.enableUnpublish) {
                logger.warn(`Skipping ${name}: unpublish requires --enable-unpublish`);
                return null;
              }
              return createUnpublishAction(name, undefined, true);

            default:
              return createDeprecateAction(name, '*', defaultMessage);
          }
        } catch (error) {
          logger.warn(`Skipping ${name}: ${String(error)}`);
          return null;
        }
      })
    );

    const validActions = actions.filter((a) => a !== null);

    if (validActions.length === 0) {
      spinner.fail('No valid actions to include in plan');
      return;
    }

    const plan = createPlan(validActions, {
      actor: username,
      options: {
        enableUnpublish: options.enableUnpublish,
      },
    });

    await savePlan(plan, options.out);

    spinner.succeed(`Plan saved to ${options.out}`);

    console.log('');
    console.log(chalk.gray('Plan summary:'));
    console.log(chalk.gray(`  Packages: ${String(plan.actions.length)}`));
    console.log(chalk.gray(`  Actions: ${String(plan.actions.reduce((sum, a) => sum + a.steps.length, 0))}`));
    console.log('');
    console.log(chalk.gray(`Run 'npm-sweep apply -i ${options.out}' to execute`));

  } catch (error) {
    spinner.fail('Failed to create plan');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
