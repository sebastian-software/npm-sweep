import type { RegistryClient } from './client.js';

interface WhoamiResponse {
  username: string;
}

export async function whoami(client: RegistryClient): Promise<string> {
  const response = await client.fetch<WhoamiResponse>('/-/whoami');
  return response.username;
}

export async function verifyAuth(client: RegistryClient): Promise<{ authenticated: boolean; username?: string }> {
  if (!client.hasToken()) {
    return { authenticated: false };
  }

  try {
    const username = await whoami(client);
    return { authenticated: true, username };
  } catch {
    return { authenticated: false };
  }
}
