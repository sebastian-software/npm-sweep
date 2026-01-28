import type { DownloadsResponse, BulkDownloadsResponse } from '../types/package.js';
import { logger } from '../utils/logger.js';

const DOWNLOADS_API = 'https://api.npmjs.org';

export async function getWeeklyDownloads(packageName: string): Promise<number | null> {
  const encodedName = encodeURIComponent(packageName).replace('%40', '@');

  try {
    const response = await fetch(
      `${DOWNLOADS_API}/downloads/point/last-week/${encodedName}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return 0;
      }
      logger.debug(`Failed to get downloads for ${packageName}: ${String(response.status)}`);
      return null;
    }

    const data = (await response.json()) as DownloadsResponse;
    return data.downloads;
  } catch (error) {
    logger.debug(`Error fetching downloads for ${packageName}: ${String(error)}`);
    return null;
  }
}

export async function getBulkDownloads(
  packageNames: string[]
): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>();

  if (packageNames.length === 0) {
    return results;
  }

  // Separate scoped and unscoped packages - bulk API doesn't support scoped packages
  const scopedPackages = packageNames.filter(name => name.startsWith('@'));
  const unscopedPackages = packageNames.filter(name => !name.startsWith('@'));

  // Fetch scoped packages individually (in parallel batches)
  if (scopedPackages.length > 0) {
    const batchSize = 5;
    for (let i = 0; i < scopedPackages.length; i += batchSize) {
      const batch = scopedPackages.slice(i, i + batchSize);
      await Promise.all(batch.map(async (name) => {
        const downloads = await getWeeklyDownloads(name);
        results.set(name, downloads);
      }));
      if (i + batchSize < scopedPackages.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }

  // Fetch unscoped packages in bulk
  if (unscopedPackages.length === 0) {
    return results;
  }

  const batchSize = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < unscopedPackages.length; i += batchSize) {
    chunks.push(unscopedPackages.slice(i, i + batchSize));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    if (!chunk) continue;
    const encodedNames = chunk.join(',');

    try {
      const url = `${DOWNLOADS_API}/downloads/point/last-week/${encodedNames}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        logger.debug(`Bulk downloads request failed: ${String(response.status)} - ${errorText}`);
        // Rate limited (429) - wait and retry once
        if (response.status === 429) {
          logger.debug('Rate limited, waiting 5 seconds and retrying...');
          await new Promise(r => setTimeout(r, 5000));
          const retryResponse = await fetch(
            `${DOWNLOADS_API}/downloads/point/last-week/${encodedNames}`
          );
          if (retryResponse.ok) {
            if (chunk.length === 1) {
              const data = (await retryResponse.json()) as DownloadsResponse;
              results.set(chunk[0] ?? '', data.downloads);
            } else {
              const data = (await retryResponse.json()) as BulkDownloadsResponse;
              for (const name of chunk) {
                const pkgData = data[name];
                if (pkgData && typeof pkgData.downloads === 'number') {
                  results.set(name, pkgData.downloads);
                } else {
                  results.set(name, 0);
                }
              }
            }
            continue;
          }
        }
        // Fall back to marking all as null
        for (const name of chunk) {
          results.set(name, null);
        }
        continue;
      }

      // Single package returns { package, downloads }
      // Multiple packages returns { packageName: { package, downloads }, ... }
      if (chunk.length === 1) {
        const data = (await response.json()) as DownloadsResponse;
        results.set(chunk[0] ?? '', data.downloads);
      } else {
        const data = (await response.json()) as BulkDownloadsResponse;
        for (const name of chunk) {
          const pkgData = data[name];
          if (pkgData && typeof pkgData.downloads === 'number') {
            results.set(name, pkgData.downloads);
          } else {
            results.set(name, 0); // No data = no downloads
          }
        }
      }
    } catch (error) {
      logger.debug(`Error fetching bulk downloads: ${String(error)}`);
      for (const name of chunk) {
        results.set(name, null);
      }
    }

    // Small delay between chunks
    if (chunkIndex < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}
