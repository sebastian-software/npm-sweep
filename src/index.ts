// Core exports for programmatic usage
export * from './types/index.js';

// Registry exports (renaming low-level owner functions to avoid conflicts)
export {
  RegistryClient,
  RegistryError,
  OtpRequiredError,
  whoami,
  verifyAuth,
  getPackument,
  getAbbreviatedPackument,
  packumentToDiscovered,
  updatePackument,
  searchPackages,
  searchAllPackages,
  findPackagesByMaintainer,
  getWeeklyDownloads,
  getBulkDownloads,
  getOwners,
  downloadTarball,
  calculateIntegrity,
  calculateShasum,
  publishPackage,
  unpublishVersion,
  unpublishPackage,
} from './registry/index.js';
export type { RegistryClientOptions, RequestOptions, PublishManifest, PublishPayload } from './registry/index.js';

// Actions (high-level API)
export * from './actions/index.js';

export * from './policy/index.js';
export * from './plan/index.js';
export { logger, configureOtp, getOtp } from './utils/index.js';
