import type { ActionResult, ArchiveRepoOptions } from '../types/action.js';
import {
  parseRepoUrl,
  checkGhCli,
  checkGhAuth,
  archiveRepository,
  addUnmaintainedBanner,
} from '../providers/github.js';
import { logger } from '../utils/logger.js';

export async function archiveRepo(options: ArchiveRepoOptions): Promise<ActionResult> {
  const { package: packageName, provider, repo, addBanner = true } = options;

  if (provider !== 'github') {
    return {
      success: false,
      action: 'archiveRepo',
      package: packageName,
      error: `Provider "${provider}" is not yet supported. Only "github" is available.`,
    };
  }

  const parsed = parseRepoUrl(repo);
  if (!parsed) {
    return {
      success: false,
      action: 'archiveRepo',
      package: packageName,
      error: `Invalid repository format: ${repo}. Expected "owner/repo" or GitHub URL.`,
    };
  }

  const { owner, name } = parsed;

  logger.info(`Archiving repository ${owner}/${name}...`);

  const hasGh = await checkGhCli();
  if (!hasGh) {
    return {
      success: false,
      action: 'archiveRepo',
      package: packageName,
      error: 'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/',
    };
  }

  const isAuthed = await checkGhAuth();
  if (!isAuthed) {
    return {
      success: false,
      action: 'archiveRepo',
      package: packageName,
      error: 'Not authenticated with GitHub CLI. Run "gh auth login" first.',
    };
  }

  const results: string[] = [];

  if (addBanner) {
    const bannerResult = await addUnmaintainedBanner(owner, name, packageName);
    if (bannerResult.success) {
      results.push(bannerResult.message ?? 'Added banner');
    } else {
      logger.warn(`Banner update failed: ${bannerResult.error}`);
    }
  }

  const archiveResult = await archiveRepository(owner, name);
  if (!archiveResult.success) {
    return {
      success: false,
      action: 'archiveRepo',
      package: packageName,
      error: archiveResult.error,
      details: { bannerResults: results },
    };
  }

  results.push(archiveResult.message ?? 'Repository archived');

  return {
    success: true,
    action: 'archiveRepo',
    package: packageName,
    message: results.join('; '),
    details: {
      owner,
      name,
      bannerAdded: addBanner,
    },
  };
}
