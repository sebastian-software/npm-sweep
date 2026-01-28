import React from 'react';
import { render } from 'ink';
import ora from 'ora';
import type { Command } from 'commander';
import { RegistryClient } from '../registry/client.js';
import { whoami } from '../registry/auth.js';
import { findPackagesWithMetadata } from '../registry/search.js';
import { getPackument, packumentToDiscovered } from '../registry/packument.js';
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

    const searchResults = await findPackagesWithMetadata(client, username);

    if (searchResults.length === 0) {
      spinner.succeed(`No packages found for ${username}`);
      return;
    }

    spinner.text = `Found ${searchResults.length} packages, fetching details...`;

    // Build a lookup for search metadata (downloads, dependents)
    const metaByName = new Map(searchResults.map(m => [m.name, m]));

    const packages = await Promise.all(
      searchResults.map(async (meta) => {
        try {
          const packument = await getPackument(client, meta.name);
          return packumentToDiscovered(packument);
        } catch (error) {
          logger.debug(`Failed to fetch ${meta.name}: ${String(error)}`);
          return null;
        }
      })
    );

    const validPackages = packages.filter((p) => p !== null);

    // Enrich with search metadata
    for (const pkg of validPackages) {
      const meta = metaByName.get(pkg.name);
      if (meta) {
        pkg.downloadsWeekly = meta.downloadsWeekly;
        pkg.dependentsCount = meta.dependents;
      }
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
