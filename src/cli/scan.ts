import ora from 'ora';
import chalk from 'chalk';
import type { Command } from 'commander';
import { RegistryClient } from '../registry/client.js';
import { whoami } from '../registry/auth.js';
import { findPackagesByMaintainer } from '../registry/search.js';
import { getPackument, packumentToDiscovered } from '../registry/packument.js';
import { getBulkDownloads } from '../registry/downloads.js';
import { formatRelativeDate, formatDownloads } from '../utils/format.js';
import { logger } from '../utils/logger.js';

interface ScanOptions {
  user?: string;
  scope?: string;
  json?: boolean;
  includeDeprecated?: boolean;
}

export async function scanCommand(
  options: ScanOptions,
  command: Command
): Promise<void> {
  const parentOpts = command.parent?.opts() ?? {};
  const registry = parentOpts.registry as string | undefined;

  const client = new RegistryClient({ registry });

  const spinner = ora('Authenticating...').start();

  try {
    let username = options.user;

    if (!username) {
      username = await whoami(client);
    }

    spinner.text = `Searching packages for ${username}...`;

    const packageNames = await findPackagesByMaintainer(client, username);

    if (packageNames.length === 0) {
      spinner.succeed(`No packages found for ${username}`);
      return;
    }

    spinner.text = `Found ${packageNames.length} packages, fetching details...`;

    const packages = await Promise.all(
      packageNames.map(async (name) => {
        try {
          const packument = await getPackument(client, name);
          return packumentToDiscovered(packument);
        } catch (error) {
          logger.debug(`Failed to fetch ${name}: ${String(error)}`);
          return null;
        }
      })
    );

    const validPackages = packages.filter((p) => p !== null);

    spinner.text = 'Fetching download stats...';

    const downloads = await getBulkDownloads(validPackages.map((p) => p.name));

    for (const pkg of validPackages) {
      pkg.downloadsWeekly = downloads.get(pkg.name) ?? undefined;
    }

    let filteredPackages = validPackages;

    if (options.scope) {
      filteredPackages = filteredPackages.filter(
        (p) => p.scope === options.scope
      );
    }

    if (!options.includeDeprecated) {
      filteredPackages = filteredPackages.filter((p) => !p.deprecated);
    }

    spinner.succeed(`Found ${filteredPackages.length} packages`);

    if (options.json) {
      console.log(JSON.stringify(filteredPackages, null, 2));
      return;
    }

    console.log('');
    console.log(
      chalk.gray(
        'NAME'.padEnd(40) +
        'LAST PUBLISH'.padEnd(15) +
        'DL/WK'.padEnd(10) +
        'STATUS'
      )
    );
    console.log(chalk.gray('─'.repeat(80)));

    for (const pkg of filteredPackages.sort(
      (a, b) => a.lastPublish.getTime() - b.lastPublish.getTime()
    )) {
      const status = pkg.deprecated
        ? chalk.yellow('deprecated')
        : chalk.green('active');

      console.log(
        chalk.cyan(pkg.name.padEnd(40).slice(0, 40)) +
        chalk.gray(formatRelativeDate(pkg.lastPublish).padEnd(15)) +
        chalk.gray(
          (pkg.downloadsWeekly !== undefined
            ? formatDownloads(pkg.downloadsWeekly)
            : '-'
          ).padEnd(10)
        ) +
        status
      );
    }

    console.log('');
    console.log(
      chalk.gray(`Total: ${filteredPackages.length} packages`)
    );

  } catch (error) {
    spinner.fail('Failed to scan packages');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
