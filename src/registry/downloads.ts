import type { DownloadsResponse } from '../types/package.js';
import { logger } from '../utils/logger.js';

const DOWNLOADS_API = 'https://api.npmjs.org';

export async function getWeeklyDownloads(packageName: string): Promise<number | null> {
  try {
    const encodedName = encodeURIComponent(packageName).replace('%40', '@');
    const response = await fetch(
      `${DOWNLOADS_API}/downloads/point/last-week/${encodedName}`
    );

    if (!response.ok) {
      logger.debug(`Failed to get downloads for ${packageName}: ${response.status}`);
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

  const chunks: string[][] = [];
  for (let i = 0; i < packageNames.length; i += 128) {
    chunks.push(packageNames.slice(i, i + 128));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (name) => {
      const downloads = await getWeeklyDownloads(name);
      results.set(name, downloads);
    });

    await Promise.all(promises);
  }

  return results;
}
