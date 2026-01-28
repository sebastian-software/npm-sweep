import type { RegistryClient } from './client.js';
import type { Packument, PackageVersion, DiscoveredPackage } from '../types/package.js';

export async function getPackument(client: RegistryClient, packageName: string): Promise<Packument> {
  const encodedName = encodeURIComponent(packageName).replace('%40', '@');
  return client.fetch<Packument>(`/${encodedName}`);
}

export async function getAbbreviatedPackument(
  client: RegistryClient,
  packageName: string
): Promise<Packument> {
  const encodedName = encodeURIComponent(packageName).replace('%40', '@');
  return client.fetch<Packument>(`/${encodedName}`, {
    headers: {
      Accept: 'application/vnd.npm.install-v1+json',
    },
  });
}

export function packumentToDiscovered(packument: Packument): DiscoveredPackage {
  const distTags = packument['dist-tags'];
  const latestVersion = distTags['latest'] ?? Object.keys(packument.versions).pop() ?? '0.0.0';
  const latestPackument = packument.versions[latestVersion];

  const versions: PackageVersion[] = Object.entries(packument.versions).map(([version, data]) => ({
    version,
    publishedAt: new Date(packument.time[version] ?? Date.now()),
    deprecated: data.deprecated,
    dist: data.dist,
  }));

  const lastPublishTime = Object.values(packument.time)
    .filter((t) => t !== 'created' && t !== 'modified')
    .map((t) => new Date(t))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const scope = packument.name.startsWith('@')
    ? packument.name.split('/')[0]
    : undefined;

  return {
    name: packument.name,
    scope,
    description: packument.description,
    versions: versions.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()),
    latestVersion,
    lastPublish: lastPublishTime ?? new Date(),
    owners: packument.maintainers.map((m) => m.name),
    deprecated: latestPackument?.deprecated,
    repository: packument.repository,
  };
}

export async function updatePackument(
  client: RegistryClient,
  packument: Packument,
  otp?: string
): Promise<void> {
  const encodedName = encodeURIComponent(packument.name).replace('%40', '@');
  await client.fetch(`/${encodedName}`, {
    method: 'PUT',
    body: packument,
    otp,
  });
}
