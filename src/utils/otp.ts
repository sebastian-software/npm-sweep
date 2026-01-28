import { execSync } from 'node:child_process';
import * as readline from 'node:readline';
import { logger } from './logger.js';

interface OtpConfig {
  onePasswordItem?: string;
}

let config: OtpConfig = {};

export function configureOtp(options: OtpConfig): void {
  config = { ...config, ...options };
}

function isOnePasswordAvailable(): boolean {
  try {
    execSync('op --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getOtpFrom1Password(itemName: string): string | null {
  try {
    const result = execSync(`op item get "${itemName}" --otp`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return result.trim();
  } catch (error) {
    logger.debug(`Failed to get OTP from 1Password: ${String(error)}`);
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
