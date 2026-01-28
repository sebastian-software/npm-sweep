import chalk from 'chalk';

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? date.toISOString();
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${String(diffDays)} days ago`;
  if (diffDays < 30) return `${String(Math.floor(diffDays / 7))} weeks ago`;
  if (diffDays < 365) return `${String(Math.floor(diffDays / 30))} months ago`;
  return `${String(Math.floor(diffDays / 365))} years ago`;
}

export function formatDownloads(downloads: number): string {
  if (downloads >= 1_000_000) {
    return `${(downloads / 1_000_000).toFixed(1)}M`;
  }
  if (downloads >= 1_000) {
    return `${(downloads / 1_000).toFixed(1)}K`;
  }
  return String(downloads);
}

export function formatPackageName(name: string, scope?: string): string {
  if (scope) {
    return chalk.gray(scope + '/') + name;
  }
  return name;
}

export function colorBySeverity(text: string, severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'low':
      return chalk.green(text);
    case 'medium':
      return chalk.yellow(text);
    case 'high':
      return chalk.red(text);
    case 'critical':
      return chalk.bgRed.white(text);
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

export function padRight(str: string, length: number): string {
  if (str.length >= length) return str;
  return str + ' '.repeat(length - str.length);
}

export function padLeft(str: string, length: number): string {
  if (str.length >= length) return str;
  return ' '.repeat(length - str.length) + str;
}

export function parseVersionRange(range: string): { type: 'all' | 'exact' | 'range'; versions?: string[] } {
  if (range === '*') {
    return { type: 'all' };
  }

  if (/^\d+\.\d+\.\d+$/.test(range)) {
    return { type: 'exact', versions: [range] };
  }

  return { type: 'range' };
}

export function calculateNextMajor(currentVersion: string): string {
  const match = currentVersion.match(/^(\d+)\./);
  if (match?.[1]) {
    const major = parseInt(match[1], 10);
    return `${String(major + 1)}.0.0`;
  }
  return '99.0.0';
}
