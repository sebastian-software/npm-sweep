import type { RegistryClient } from './client.js';
import type { SearchResult } from '../types/package.js';
import { logger } from '../utils/logger.js';

const SEARCH_PAGE_SIZE = 250;

interface SearchOptions {
  maintainer?: string;
  scope?: string;
  text?: string;
  size?: number;
}

export async function searchPackages(
  client: RegistryClient,
  options: SearchOptions
): Promise<SearchResult> {
  const params = new URLSearchParams();

  const textParts: string[] = [];
  if (options.maintainer) {
    textParts.push(`maintainer:${options.maintainer}`);
  }
  if (options.scope) {
    textParts.push(`scope:${options.scope}`);
  }
  if (options.text) {
    textParts.push(options.text);
  }

  params.set('text', textParts.join(' '));
  params.set('size', String(options.size ?? SEARCH_PAGE_SIZE));

  return client.fetch<SearchResult>(`/-/v1/search?${params.toString()}`);
}

export async function* searchAllPackages(
  client: RegistryClient,
  options: SearchOptions
): AsyncGenerator<SearchResult['objects'][number], void, unknown> {
  let from = 0;
  let total = Infinity;

  while (from < total) {
    const params = new URLSearchParams();

    const textParts: string[] = [];
    if (options.maintainer) {
      textParts.push(`maintainer:${options.maintainer}`);
    }
    if (options.scope) {
      textParts.push(`scope:${options.scope}`);
    }
    if (options.text) {
      textParts.push(options.text);
    }

    params.set('text', textParts.join(' '));
    params.set('size', String(SEARCH_PAGE_SIZE));
    params.set('from', String(from));

    logger.debug(`Searching packages (from=${from})...`);

    const result = await client.fetch<SearchResult>(`/-/v1/search?${params.toString()}`);
    total = result.total;

    for (const obj of result.objects) {
      yield obj;
    }

    from += result.objects.length;

    if (result.objects.length < SEARCH_PAGE_SIZE) {
      break;
    }
  }
}

export async function findPackagesByMaintainer(
  client: RegistryClient,
  username: string
): Promise<string[]> {
  const packages: string[] = [];

  for await (const result of searchAllPackages(client, { maintainer: username })) {
    packages.push(result.package.name);
  }

  return packages;
}
