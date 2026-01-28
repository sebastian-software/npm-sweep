import React from 'react';
import { render } from 'ink';
import ora from 'ora';
import type { Command } from 'commander';
import { RegistryClient } from '../registry/client.js';
import { whoami } from '../registry/auth.js';
import { findPackagesByMaintainer } from '../registry/search.js';
import { getPackument, packumentToDiscovered } from '../registry/packument.js';
import { getBulkDownloads } from '../registry/downloads.js';
import { App } from '../tui/App.js';
import { logger } from '../utils/logger.js';

interface TuiOptions {
  user?: string;
  scope?: string;
  enableUnpublish?: boolean;
}

export async function tuiCommand(
  options: TuiOptions,
  command: Command
): Promise<void> {
  const parentOpts = command.parent?.opts() ?? {};
  const registry = parentOpts.registry as string | undefined;

  const client = new RegistryClient({ registry });

  const spinner = ora('Loading...').start();

  try {
    let username = options.user;

    if (!username) {
      spinner.text = 'Authenticating...';
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

    spinner.stop();

    const { waitUntilExit } = render(
      React.createElement(App, {
        client,
        packages: filteredPackages,
        username,
        enableUnpublish: options.enableUnpublish,
      })
    );

    await waitUntilExit();

  } catch (error) {
    spinner.fail('Failed to start TUI');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
