import { createHash } from 'node:crypto';
import { request } from 'undici';
import type { RegistryClient } from './client.js';
import { logger } from '../utils/logger.js';

export async function downloadTarball(url: string): Promise<Buffer> {
  logger.debug(`Downloading tarball: ${url}`);

  const response = await request(url);

  if (response.statusCode !== 200) {
    throw new Error(`Failed to download tarball: ${String(response.statusCode)}`);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of response.body) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }

  return Buffer.concat(chunks);
}

export function calculateIntegrity(data: Buffer): string {
  const hash = createHash('sha512').update(data).digest('base64');
  return `sha512-${hash}`;
}

export function calculateShasum(data: Buffer): string {
  return createHash('sha1').update(data).digest('hex');
}

export interface PublishManifest {
  name: string;
  version: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  deprecated?: string;
  readme?: string;
  _id: string;
  _nodeVersion?: string;
  _npmVersion?: string;
  dist: {
    integrity: string;
    shasum: string;
    tarball: string;
  };
}

export interface PublishPayload {
  _id: string;
  name: string;
  description?: string;
  'dist-tags': Record<string, string>;
  versions: Record<string, PublishManifest>;
  readme?: string;
  _attachments: Record<
    string,
    {
      content_type: string;
      data: string;
      length: number;
    }
  >;
}

export async function publishPackage(
  client: RegistryClient,
  manifest: PublishManifest,
  tarball: Buffer,
  tag: string = 'latest',
  otp?: string
): Promise<void> {
  const integrity = calculateIntegrity(tarball);
  const shasum = calculateShasum(tarball);
  const tarballName = `${manifest.name}-${manifest.version}.tgz`;

  manifest.dist = {
    integrity,
    shasum,
    tarball: `${client.getRegistry()}/${manifest.name}/-/${tarballName}`,
  };
  manifest._id = `${manifest.name}@${manifest.version}`;

  const payload: PublishPayload = {
    _id: manifest.name,
    name: manifest.name,
    description: manifest.description,
    'dist-tags': {
      [tag]: manifest.version,
    },
    versions: {
      [manifest.version]: manifest,
    },
    readme: manifest.readme,
    _attachments: {
      [tarballName]: {
        content_type: 'application/octet-stream',
        data: tarball.toString('base64'),
        length: tarball.length,
      },
    },
  };

  const encodedName = encodeURIComponent(manifest.name).replace('%40', '@');
  await client.fetch(`/${encodedName}`, {
    method: 'PUT',
    body: payload,
    otp,
  });
}

export async function unpublishVersion(
  client: RegistryClient,
  packageName: string,
  version: string,
  otp?: string
): Promise<void> {
  const encodedName = encodeURIComponent(packageName).replace('%40', '@');

  // Get the current packument to obtain _rev
  const packument = await client.fetch<{ _rev: string }>(`/${encodedName}`);
  const rev = packument._rev;

  if (!rev) {
    throw new Error('Could not get package revision for unpublish');
  }

  await client.fetch(`/${encodedName}/-/${packageName}-${version}.tgz/-rev/${rev}`, {
    method: 'DELETE',
    otp,
  });
}

export async function unpublishPackage(
  client: RegistryClient,
  packageName: string,
  otp?: string
): Promise<void> {
  const encodedName = encodeURIComponent(packageName).replace('%40', '@');

  // Get the current packument to obtain _rev
  const packument = await client.fetch<{ _rev: string }>(`/${encodedName}`);
  const rev = packument._rev;

  if (!rev) {
    throw new Error('Could not get package revision for unpublish');
  }

  await client.fetch(`/${encodedName}/-rev/${rev}`, {
    method: 'DELETE',
    otp,
  });
}
