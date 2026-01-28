import { execSync } from 'node:child_process';
import * as readline from 'node:readline';
import { logger } from './logger.js';

interface OtpConfig {
  onePasswordItem?: string;
}

let config: OtpConfig = {};

export function configureOtp(options: OtpConfig): void {
  config = { ...config, ...options };

  // Validate 1Password setup immediately if configured
  if (options.onePasswordItem) {
    validateOnePasswordSetup(options.onePasswordItem);
  }
}

function isOnePasswordAvailable(): boolean {
  try {
    execSync('op --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function validateOnePasswordSetup(itemName: string): void {
  if (!isOnePasswordAvailable()) {
    throw new Error(
      '1Password CLI (op) is not installed or not in PATH.\n' +
      'Install it from: https://1password.com/downloads/command-line/'
    );
  }

  // Test that we can access the item
  try {
    execSync(`op item get "${itemName}" --otp`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    logger.info(`1Password: Successfully connected to item "${itemName}"`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `1Password: Cannot get OTP from item "${itemName}".\n` +
      `Make sure the item exists and has a one-time password configured.\n` +
      `Error: ${errorMsg}`
    );
  }
}

function getOtpFrom1Password(itemName: string): string | null {
  try {
    const result = execSync(`op item get "${itemName}" --otp`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get OTP from 1Password: ${errorMsg}`);
    return null;
  }
}

async function promptForOtp(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter OTP code: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function getOtp(providedOtp?: string): Promise<string> {
  if (providedOtp) {
    return providedOtp;
  }

  if (config.onePasswordItem && isOnePasswordAvailable()) {
    logger.debug(`Attempting to get OTP from 1Password item: ${config.onePasswordItem}`);
    const otp = getOtpFrom1Password(config.onePasswordItem);
    if (otp) {
      logger.info('OTP retrieved from 1Password');
      return otp;
    }
    logger.warn('Could not get OTP from 1Password, falling back to manual input');
  }

  return promptForOtp();
}

export function validateOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}
