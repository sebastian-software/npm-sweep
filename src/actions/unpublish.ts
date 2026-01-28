import type { RegistryClient } from '../registry/client.js';
import { unpublishPackage, unpublishVersion } from '../registry/tarball.js';
import { getPackument, packumentToDiscovered } from '../registry/packument.js';
import { checkUnpublishEligibility } from '../policy/unpublish.js';
import type { ActionResult, UnpublishOptions } from '../types/action.js';
import { logger } from '../utils/logger.js';

export async function unpublish(
  client: RegistryClient,
  options: UnpublishOptions,
  skipEligibilityCheck = false
): Promise<ActionResult> {
  const { package: packageName, version, force, otp } = options;

  try {
    if (!skipEligibilityCheck) {
      const packument = await getPackument(client, packageName);
      const discovered = packumentToDiscovered(packument);
      const eligibility = await checkUnpublishEligibility(client, discovered);

      if (!eligibility.eligible) {
        return {
          success: false,
          action: 'unpublish',
          package: packageName,
          error: `Not eligible for unpublish: ${eligibility.reason}`,
          details: { eligibility },
        };
      }
    }

    if (version) {
      logger.info(`Unpublishing ${packageName}@${version}...`);
      await unpublishVersion(client, packageName, version, otp);
      logger.success(`Unpublished ${packageName}@${version}`);

      return {
        success: true,
        action: 'unpublish',
        package: packageName,
        message: `Unpublished version ${version}`,
        details: { version },
      };
    }

    if (!force) {
      return {
        success: false,
        action: 'unpublish',
        package: packageName,
        error: 'Full package unpublish requires force=true',
      };
    }

    logger.info(`Unpublishing entire package ${packageName}...`);
    await unpublishPackage(client, packageName, otp);
    logger.success(`Unpublished ${packageName}`);

    return {
      success: true,
      action: 'unpublish',
      package: packageName,
      message: 'Unpublished entire package',
      details: { force: true },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      action: 'unpublish',
      package: packageName,
      error: errorMessage,
    };
  }
}
