import { request } from 'undici';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { logger } from '../utils/logger.js';

export interface RegistryClientOptions {
  registry: string;
  token?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  otp?: string;
  headers?: Record<string, string>;
}

export class RegistryError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'RegistryError';
  }
}

export class OtpRequiredError extends RegistryError {
  constructor() {
    super('OTP required for this operation', 401);
    this.name = 'OtpRequiredError';
  }
}

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class RegistryClient {
  private registry: string;
  private token?: string;

  constructor(options: Partial<RegistryClientOptions> = {}) {
    this.registry = (options.registry ?? DEFAULT_REGISTRY).replace(/\/$/, '');
    this.token = options.token ?? this.getTokenFromEnv();
  }

  private getTokenFromEnv(): string | undefined {
    // 1. Check environment variables
    const envToken = process.env['NPM_TOKEN'] ?? process.env['NODE_AUTH_TOKEN'];
    if (envToken) {
      logger.debug('Using token from environment variable');
      return envToken;
    }

    // 2. Check .npmrc file
    const npmrcToken = this.getTokenFromNpmrc();
    if (npmrcToken) {
      logger.debug('Using token from .npmrc');
      return npmrcToken;
    }

    return undefined;
  }

  private getTokenFromNpmrc(): string | undefined {
    const npmrcPaths = [
      join(process.cwd(), '.npmrc'),
      join(homedir(), '.npmrc'),
    ];

    for (const npmrcPath of npmrcPaths) {
      if (!existsSync(npmrcPath)) {
        continue;
      }

      try {
        const content = readFileSync(npmrcPath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          // Match: //registry.npmjs.org/:_authToken=xxx
          const authTokenMatch = line.match(/:_authToken=(.+)$/);
          if (authTokenMatch) {
            return authTokenMatch[1]!.trim();
          }
        }
      } catch (error) {
        logger.debug(`Failed to read ${npmrcPath}: ${String(error)}`);
      }
    }

    return undefined;
  }

  private buildHeaders(options: RequestOptions = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (options.otp) {
      headers['npm-otp'] = options.otp;
    }

    return headers;
  }

  async fetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.registry}${path}`;
    const method = options.method ?? 'GET';

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.debug(`${method} ${url} (attempt ${attempt}/${MAX_RETRIES})`);

        const response = await request(url, {
          method,
          headers: this.buildHeaders(options),
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        const body = await response.body.text();
        let parsed: unknown;

        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }

        if (response.statusCode === 401 || response.statusCode === 403) {
          // Check various ways npm indicates OTP is required
          const otpHeader = response.headers['www-authenticate'];
          const npmNotice = response.headers['npm-notice'];
          const bodyStr = typeof parsed === 'object' && parsed !== null
            ? JSON.stringify(parsed).toLowerCase()
            : String(parsed).toLowerCase();

          logger.debug(`Auth error - status: ${response.statusCode}, www-authenticate: ${otpHeader}, npm-notice: ${npmNotice}, body: ${bodyStr.substring(0, 200)}`);

          const needsOtp =
            (typeof otpHeader === 'string' && otpHeader.toLowerCase().includes('otp')) ||
            (typeof npmNotice === 'string' && npmNotice.toLowerCase().includes('otp')) ||
            bodyStr.includes('otp') ||
            bodyStr.includes('one-time pass') ||
            bodyStr.includes('eotp');

          if (needsOtp) {
            throw new OtpRequiredError();
          }
          throw new RegistryError('Unauthorized', response.statusCode, parsed);
        }

        if (response.statusCode === 429) {
          const retryAfter = response.headers['retry-after'];
          const delay = retryAfter ? parseInt(String(retryAfter), 10) * 1000 : RETRY_DELAY_MS * attempt;
          logger.warn(`Rate limited, retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        if (response.statusCode >= 400) {
          // Extract error message from npm response
          let errorMessage = `Request failed with status ${response.statusCode}`;
          if (typeof parsed === 'object' && parsed !== null) {
            const npmError = parsed as Record<string, unknown>;
            if (typeof npmError.error === 'string') {
              errorMessage = npmError.error;
            } else if (typeof npmError.message === 'string') {
              errorMessage = npmError.message;
            } else if (typeof npmError.reason === 'string') {
              errorMessage = npmError.reason;
            }
          } else if (typeof parsed === 'string' && parsed.length > 0 && parsed.length < 500) {
            errorMessage = parsed;
          }
          throw new RegistryError(errorMessage, response.statusCode, parsed);
        }

        return parsed as T;
      } catch (error) {
        if (error instanceof OtpRequiredError) {
          throw error;
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < MAX_RETRIES) {
          logger.debug(`Request failed, retrying in ${RETRY_DELAY_MS * attempt}ms...`);
          await this.sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getRegistry(): string {
    return this.registry;
  }

  hasToken(): boolean {
    return !!this.token;
  }
}
