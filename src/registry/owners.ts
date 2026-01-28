import type { RegistryClient } from './client.js';
import { getPackument, updatePackument } from './packument.js';

interface Owner {
  name: string;
  email?: string;
}

export async function getOwners(client: RegistryClient, packageName: string): Promise<Owner[]> {
  const packument = await getPackument(client, packageName);
  return packument.maintainers;
}

export async function addOwner(
  client: RegistryClient,
  packageName: string,
  username: string,
  otp?: string
): Promise<void> {
  const packument = await getPackument(client, packageName);

  const exists = packument.maintainers.some((m) => m.name === username);
  if (exists) {
    return;
  }

  packument.maintainers.push({ name: username });

  await updatePackument(client, packument, otp);
}

export async function removeOwner(
  client: RegistryClient,
  packageName: string,
  username: string,
  otp?: string
): Promise<void> {
  const packument = await getPackument(client, packageName);

  const index = packument.maintainers.findIndex((m) => m.name === username);
  if (index === -1) {
    return;
  }

  if (packument.maintainers.length === 1) {
    throw new Error('Cannot remove the last owner of a package');
  }

  packument.maintainers.splice(index, 1);

  await updatePackument(client, packument, otp);
}
