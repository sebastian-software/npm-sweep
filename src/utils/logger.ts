import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level: LogLevel;
  silent: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_PATTERNS = [
  /npm_[a-zA-Z0-9]{36}/gi,
  /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  /Authorization:\s*[^\s]+/gi,
  /otp[=:]\s*\d{6}/gi,
  /"password"\s*:\s*"[^"]+"/gi,
  /"token"\s*:\s*"[^"]+"/gi,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
];

function redact(message: string): string {
  let result = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

class Logger {
  private options: LoggerOptions = {
    level: 'info',
    silent: false,
  };

  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  setSilent(silent: boolean): void {
    this.options.silent = silent;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.options.silent) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.options.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const redacted = redact(message);
    const timestamp = new Date().toISOString();

    switch (level) {
      case 'debug':
        return chalk.gray(`[${timestamp}] ${redacted}`);
      case 'info':
        return chalk.blue('ℹ') + ' ' + redacted;
      case 'warn':
        return chalk.yellow('⚠') + ' ' + chalk.yellow(redacted);
      case 'error':
        return chalk.red('✖') + ' ' + chalk.red(redacted);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  success(message: string): void {
    if (!this.options.silent) {
      console.log(chalk.green('✔') + ' ' + message);
    }
  }

  box(title: string, content: string): void {
    if (this.options.silent) return;

    const lines = content.split('\n');
    const maxLen = Math.max(title.length, ...lines.map((l) => l.length));
    const border = '─'.repeat(maxLen + 2);

    console.log(chalk.gray(`┌${border}┐`));
    console.log(chalk.gray('│ ') + chalk.bold(title.padEnd(maxLen)) + chalk.gray(' │'));
    console.log(chalk.gray(`├${border}┤`));
    for (const line of lines) {
      console.log(chalk.gray('│ ') + line.padEnd(maxLen) + chalk.gray(' │'));
    }
    console.log(chalk.gray(`└${border}┘`));
  }
}

export const logger = new Logger();
