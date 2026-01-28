import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface GitHubRepo {
  owner: string;
  name: string;
  fullName: string;
  archived: boolean;
  description: string | null;
  defaultBranch: string;
}

export interface ArchiveResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function parseRepoUrl(repoUrl: string): { owner: string; name: string } | null {
  const patterns = [
    /github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/,
    /^([^/]+)\/([^/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = repoUrl.match(pattern);
    if (match) {
      return { owner: match[1]!, name: match[2]!.replace(/\.git$/, '') };
    }
  }

  return null;
}

export async function checkGhCli(): Promise<boolean> {
  try {
    await execAsync('gh --version');
    return true;
  } catch {
    return false;
  }
}

export async function checkGhAuth(): Promise<boolean> {
  try {
    await execAsync('gh auth status');
    return true;
  } catch {
    return false;
  }
}

export async function getRepoInfo(owner: string, name: string): Promise<GitHubRepo | null> {
  try {
    const { stdout } = await execAsync(
      `gh api repos/${owner}/${name} --jq '.owner.login, .name, .full_name, .archived, .description, .default_branch'`
    );

    const lines = stdout.trim().split('\n');
    if (lines.length < 6) {
      return null;
    }

    return {
      owner: lines[0]!,
      name: lines[1]!,
      fullName: lines[2]!,
      archived: lines[3] === 'true',
      description: lines[4] === 'null' ? null : lines[4]!,
      defaultBranch: lines[5]!,
    };
  } catch (error) {
    logger.debug(`Failed to get repo info: ${String(error)}`);
    return null;
  }
}

export async function archiveRepository(owner: string, name: string): Promise<ArchiveResult> {
  try {
    const repo = await getRepoInfo(owner, name);

    if (!repo) {
      return {
        success: false,
        error: `Repository ${owner}/${name} not found or not accessible`,
      };
    }

    if (repo.archived) {
      return {
        success: true,
        message: 'Repository is already archived',
      };
    }

    await execAsync(
      `gh api repos/${owner}/${name} -X PATCH -f archived=true`
    );

    logger.success(`Archived repository ${owner}/${name}`);

    return {
      success: true,
      message: `Repository ${owner}/${name} has been archived`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to archive repository: ${errorMessage}`,
    };
  }
}

export async function unarchiveRepository(owner: string, name: string): Promise<ArchiveResult> {
  try {
    await execAsync(
      `gh api repos/${owner}/${name} -X PATCH -f archived=false`
    );

    return {
      success: true,
      message: `Repository ${owner}/${name} has been unarchived`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to unarchive repository: ${errorMessage}`,
    };
  }
}

const UNMAINTAINED_BANNER = `> [!CAUTION]
> **This project is no longer maintained.**
>
> This repository has been archived and is read-only.
> No further updates, bug fixes, or support will be provided.
>
> If you need this functionality, consider forking the repository.

---

`;

export async function addUnmaintainedBanner(
  owner: string,
  name: string,
  packageName: string
): Promise<ArchiveResult> {
  try {
    const repo = await getRepoInfo(owner, name);

    if (!repo) {
      return {
        success: false,
        error: `Repository ${owner}/${name} not found`,
      };
    }

    if (repo.archived) {
      return {
        success: false,
        error: 'Cannot modify README of archived repository. Add banner before archiving.',
      };
    }

    const { stdout: readmeContent } = await execAsync(
      `gh api repos/${owner}/${name}/contents/README.md --jq '.content' | base64 -d`
    ).catch(() => ({ stdout: '' }));

    if (!readmeContent) {
      return {
        success: false,
        error: 'README.md not found in repository',
      };
    }

    if (readmeContent.includes('This project is no longer maintained')) {
      return {
        success: true,
        message: 'Banner already present in README',
      };
    }

    const updatedContent = UNMAINTAINED_BANNER + readmeContent;
    const base64Content = Buffer.from(updatedContent).toString('base64');

    const { stdout: sha } = await execAsync(
      `gh api repos/${owner}/${name}/contents/README.md --jq '.sha'`
    );

    const commitMessage = `docs: add unmaintained banner for ${packageName}`;

    await execAsync(
      `gh api repos/${owner}/${name}/contents/README.md -X PUT ` +
      `-f message="${commitMessage}" ` +
      `-f content="${base64Content}" ` +
      `-f sha="${sha.trim()}"`
    );

    logger.success(`Added unmaintained banner to ${owner}/${name}/README.md`);

    return {
      success: true,
      message: 'Added unmaintained banner to README.md',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to update README: ${errorMessage}`,
    };
  }
}
