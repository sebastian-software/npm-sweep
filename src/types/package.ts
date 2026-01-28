export interface PackageVersion {
  version: string;
  publishedAt: Date;
  deprecated?: string;
  dist: {
    tarball: string;
    shasum: string;
    integrity?: string;
  };
}

export interface DiscoveredPackage {
  name: string;
  scope?: string;
  description?: string;
  versions: PackageVersion[];
  latestVersion: string;
  lastPublish: Date;
  owners: string[];
  downloadsWeekly?: number;
  dependentsCount?: number;
  deprecated?: string;
  repository?: {
    type: string;
    url: string;
  };
}

export interface Packument {
  _id: string;
  _rev?: string;
  name: string;
  description?: string;
  'dist-tags': Record<string, string>;
  versions: Record<string, PackumentVersion>;
  time: Record<string, string>;
  maintainers: Array<{ name: string; email?: string }>;
  repository?: {
    type: string;
    url: string;
  };
  readme?: string;
  readmeFilename?: string;
}

export interface PackumentVersion {
  name: string;
  version: string;
  description?: string;
  main?: string;
  types?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  deprecated?: string;
  dist: {
    tarball: string;
    shasum: string;
    integrity?: string;
  };
  maintainers?: Array<{ name: string; email?: string }>;
  _npmUser?: { name: string; email?: string };
}

export interface SearchResult {
  objects: Array<{
    package: {
      name: string;
      scope?: string;
      version: string;
      description?: string;
      date: string;
      links?: {
        npm?: string;
        homepage?: string;
        repository?: string;
      };
      publisher?: {
        username: string;
        email?: string;
      };
      maintainers?: Array<{ username: string; email?: string }>;
    };
    score: {
      final: number;
      detail: {
        quality: number;
        popularity: number;
        maintenance: number;
      };
    };
  }>;
  total: number;
  time: string;
}

export interface DownloadsResponse {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

export interface BulkDownloadsResponse {
  [packageName: string]: DownloadsResponse | null;
}
