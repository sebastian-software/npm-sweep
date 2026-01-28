#!/usr/bin/env node

import { Command } from 'commander';
import { scanCommand } from './scan.js';
import { tuiCommand } from './tui.js';
import { planCommand } from './plan.js';
import { applyCommand } from './apply.js';
import { configureOtp } from '../utils/otp.js';
import { logger } from '../utils/logger.js';

const program = new Command();

program
  .name('npm-sweep')
  .description('Interactive tool for managing end-of-life of your npm packages')
  .version('1.0.0')
  .option('--registry <url>', 'npm registry URL', 'https://registry.npmjs.org')
  .option('--otp <code>', 'One-time password for 2FA')
  .option('--1password-item <name>', '1Password item name for OTP')
  .option('--debug', 'Enable debug output')
  .option('-u, --user <username>', 'npm username (defaults to authenticated user)')
  .option('--scope <scope>', 'Filter by scope (e.g., @myorg)')
  .option('--enable-unpublish', 'Enable unpublish action')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();

    if (opts.debug) {
      logger.setLevel('debug');
    }

    if (opts['1passwordItem']) {
      configureOtp({ onePasswordItem: opts['1passwordItem'] as string });
    }
  })
  .action(tuiCommand);

program
  .command('scan')
  .description('Scan and list your npm packages')
  .option('-u, --user <username>', 'npm username (defaults to authenticated user)')
  .option('--scope <scope>', 'Filter by scope (e.g., @myorg)')
  .option('--json', 'Output as JSON')
  .option('--include-deprecated', 'Include already deprecated packages')
  .action(scanCommand);

program
  .command('tui')
  .description('Start interactive terminal UI')
  .option('-u, --user <username>', 'npm username (defaults to authenticated user)')
  .option('--scope <scope>', 'Filter by scope (e.g., @myorg)')
  .option('--enable-unpublish', 'Enable unpublish action (disabled by default)')
  .action(tuiCommand);

program
  .command('plan')
  .description('Generate an execution plan')
  .requiredOption('-o, --out <file>', 'Output file path for the plan')
  .option('-u, --user <username>', 'npm username (defaults to authenticated user)')
  .option('--scope <scope>', 'Filter by scope')
  .option('--packages <packages>', 'Comma-separated list of packages')
  .option('--action <action>', 'Action to apply: deprecate, tombstone, unpublish')
  .option('--message <message>', 'Deprecation/tombstone message')
  .option('--enable-unpublish', 'Enable unpublish action')
  .action(planCommand);

program
  .command('apply')
  .description('Apply an execution plan')
  .requiredOption('-i, --in <file>', 'Input plan file')
  .option('--dry-run', 'Simulate execution without making changes')
  .option('--yes', 'Skip confirmation prompt')
  .option('--enable-unpublish', 'Enable unpublish action')
  .option('--concurrency <n>', 'Number of parallel operations', '3')
  .action(applyCommand);

program.parse();
