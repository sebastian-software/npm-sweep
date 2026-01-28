import type { DiscoveredPackage, UnpublishEligibility } from '../types/index.js';
import { getWeeklyDownloads } from '../registry/downloads.js';
import type { RegistryClient } from '../registry/client.js';
import { searchPackages } from '../registry/search.js';

const UNPUBLISH_DOWNLOAD_THRESHOLD = 300;
const UNPUBLISH_HOURS_THRESHOLD = 72;

export async function checkUnpublishEligibility(
  client: RegistryClient,
  pkg: DiscoveredPackage
): Promise<UnpublishEligibility> {
  const checks: UnpublishEligibility['checks'] = {
    publishAge: { passed: false, value: '', description: '' },
    weeklyDownloads: { passed: false, value: 'unknown', description: '' },
    ownerCount: { passed: false, value: 0, description: '' },
    hasDependents: { passed: false, value: 'unknown', description: '' },
  };

  const now = new Date();
  const hoursSincePublish = (now.getTime() - pkg.lastPublish.getTime()) / (1000 * 60 * 60);
  const isRecent = hoursSincePublish <= UNPUBLISH_HOURS_THRESHOLD;

  checks.publishAge = {
    passed: true,
    value: isRecent
      ? `${Math.round(hoursSincePublish)}h ago (within 72h window)`
      : `${Math.round(hoursSincePublish / 24)} days ago`,
    description: isRecent
      ? 'Package was published recently (within 72h), easier unpublish rules apply'
      : 'Package is older than 72h, stricter unpublish rules apply',
  };

  const downloads = pkg.downloadsWeekly ?? (await getWeeklyDownloads(pkg.name));
  if (downloads !== null) {
    const passesDownloadCheck = downloads < UNPUBLISH_DOWNLOAD_THRESHOLD;
    checks.weeklyDownloads = {
      passed: isRecent || passesDownloadCheck,
      value: downloads,
      description: passesDownloadCheck
        ? `${downloads} downloads/week (under ${UNPUBLISH_DOWNLOAD_THRESHOLD} threshold)`
        : `${downloads} downloads/week (exceeds ${UNPUBLISH_DOWNLOAD_THRESHOLD} threshold)`,
    };
  } else {
    checks.weeklyDownloads = {
      passed: isRecent,
      value: 'unknown',
      description: 'Could not determine download count',
    };
  }

  const ownerCount = pkg.owners.length;
  const isSingleOwner = ownerCount === 1;
  checks.ownerCount = {
    passed: isRecent || isSingleOwner,
    value: ownerCount,
    description: isSingleOwner
      ? 'Single owner (you)'
      : `${ownerCount} owners - may need coordination`,
  };

  const hasDependents = await checkForDependents(client, pkg.name);
  checks.hasDependents = {
    passed: hasDependents === false,
    value: hasDependents,
    description:
      hasDependents === 'unknown'
        ? 'Could not determine if package has dependents'
        : hasDependents
          ? 'Package has dependents that would break'
          : 'No known dependents',
  };

  const isEligible = isRecent
    ? checks.hasDependents.passed
    : checks.publishAge.passed &&
      checks.weeklyDownloads.passed &&
      checks.ownerCount.passed &&
      checks.hasDependents.passed;

  let reason: string | undefined;
  if (!isEligible) {
    const failedChecks = Object.entries(checks)
      .filter(([_, check]) => !check.passed)
      .map(([name]) => name);
    reason = `Failed checks: ${failedChecks.join(', ')}`;
  }

  return {
    eligible: isEligible,
    reason,
    checks,
  };
}

async function checkForDependents(
  client: RegistryClient,
  packageName: string
): Promise<boolean | 'unknown'> {
  try {
    const result = await searchPackages(client, {
      text: `dependencies:${packageName}`,
      size: 1,
    });
    return result.total > 0;
  } catch {
    return 'unknown';
  }
}

export function formatEligibilityReport(eligibility: UnpublishEligibility): string {
  const lines: string[] = [];

  lines.push(eligibility.eligible ? '✓ Eligible for unpublish' : '✗ Not eligible for unpublish');

  if (eligibility.reason) {
    lines.push(`  Reason: ${eligibility.reason}`);
  }

  lines.push('');
  lines.push('Checks:');

  for (const [name, check] of Object.entries(eligibility.checks)) {
    const icon = check.passed ? '✓' : '✗';
    lines.push(`  ${icon} ${name}: ${check.description}`);
  }

  return lines.join('\n');
}
