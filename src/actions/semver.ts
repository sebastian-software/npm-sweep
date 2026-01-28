const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function validRange(range: string): string | null {
  if (range === '*') return '*';

  if (SEMVER_REGEX.test(range)) return range;

  if (range.startsWith('<=') || range.startsWith('>=') || range.startsWith('<') || range.startsWith('>')) {
    const version = range.replace(/^[<>=]+/, '');
    if (SEMVER_REGEX.test(version)) return range;
  }

  if (/^\d+\.x$/.test(range) || /^\d+\.\d+\.x$/.test(range)) {
    return range;
  }

  if (/^\d+$/.test(range)) {
    return `${range}.x`;
  }

  return null;
}

export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(SEMVER_REGEX);
  if (!match) return null;

  return {
    major: parseInt(match[1] ?? '0', 10),
    minor: parseInt(match[2] ?? '0', 10),
    patch: parseInt(match[3] ?? '0', 10),
  };
}

export function satisfies(version: string, range: string): boolean {
  if (range === '*') return true;

  const parsed = parseVersion(version);
  if (!parsed) return false;

  if (SEMVER_REGEX.test(range)) {
    return version === range;
  }

  if (range.startsWith('<=')) {
    const targetParsed = parseVersion(range.slice(2));
    if (!targetParsed) return false;
    return compareVersions(parsed, targetParsed) <= 0;
  }

  if (range.startsWith('>=')) {
    const targetParsed = parseVersion(range.slice(2));
    if (!targetParsed) return false;
    return compareVersions(parsed, targetParsed) >= 0;
  }

  if (range.startsWith('<')) {
    const targetParsed = parseVersion(range.slice(1));
    if (!targetParsed) return false;
    return compareVersions(parsed, targetParsed) < 0;
  }

  if (range.startsWith('>')) {
    const targetParsed = parseVersion(range.slice(1));
    if (!targetParsed) return false;
    return compareVersions(parsed, targetParsed) > 0;
  }

  const majorMatch = range.match(/^(\d+)\.x$/);
  if (majorMatch?.[1]) {
    return parsed.major === parseInt(majorMatch[1], 10);
  }

  const minorMatch = range.match(/^(\d+)\.(\d+)\.x$/);
  if (minorMatch?.[1] && minorMatch[2]) {
    return (
      parsed.major === parseInt(minorMatch[1], 10) &&
      parsed.minor === parseInt(minorMatch[2], 10)
    );
  }

  return false;
}

function compareVersions(
  a: { major: number; minor: number; patch: number },
  b: { major: number; minor: number; patch: number }
): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function getNextMajor(currentVersion: string): string {
  const parsed = parseVersion(currentVersion);
  if (!parsed) return '99.0.0';
  return `${String(parsed.major + 1)}.0.0`;
}
