import type { RegistryClient } from '../registry/client.js';
import { OtpRequiredError } from '../registry/client.js';
import { getPackument, updatePackument } from '../registry/packument.js';
import type { ActionResult, DeprecateOptions, UndeprecateOptions } from '../types/action.js';
import { logger } from '../utils/logger.js';
import { satisfies, validRange } from './semver.js';

export async function deprecate(
  client: RegistryClient,
  options: DeprecateOptions
): Promise<ActionResult> {
  const { package: packageName, range, message, otp } = options;

  try {
    logger.info(`Deprecating ${packageName}@${range}...`);

    const packument = await getPackument(client, packageName);
    const parsedRange = validRange(range);

    if (!parsedRange && range !== '*') {
      return {
        success: false,
        action: 'deprecate',
        package: packageName,
        error: `Invalid version range: ${range}`,
      };
    }

    let versionsUpdated = 0;

    for (const [version, versionData] of Object.entries(packument.versions)) {
      const shouldDeprecate = range === '*' || satisfies(version, range);

      if (shouldDeprecate) {
        versionData.deprecated = message;
        versionsUpdated++;
      }
    }

    if (versionsUpdated === 0) {
      return {
        success: false,
        action: 'deprecate',
        package: packageName,
        error: `No versions matched range: ${range}`,
      };
    }

    await updatePackument(client, packument, otp);

    logger.success(`Deprecated ${versionsUpdated} version(s) of ${packageName}`);

    return {
      success: true,
      action: 'deprecate',
      package: packageName,
      message: `Deprecated ${versionsUpdated} version(s)`,
      details: { versionsUpdated, range, deprecationMessage: message },
    };
  } catch (error) {
    if (error instanceof OtpRequiredError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      action: 'deprecate',
      package: packageName,
      error: errorMessage,
    };
  }
}

export async function undeprecate(
  client: RegistryClient,
  options: UndeprecateOptions
): Promise<ActionResult> {
  const { package: packageName, range, otp } = options;

  try {
    logger.info(`Removing deprecation from ${packageName}@${range}...`);

    const packument = await getPackument(client, packageName);
    const parsedRange = validRange(range);

    if (!parsedRange && range !== '*') {
      return {
        success: false,
        action: 'undeprecate',
        package: packageName,
        error: `Invalid version range: ${range}`,
      };
    }

    let versionsUpdated = 0;

    for (const [version, versionData] of Object.entries(packument.versions)) {
      const shouldUndeprecate = range === '*' || satisfies(version, range);

      if (shouldUndeprecate && versionData.deprecated) {
        versionData.deprecated = '';
        versionsUpdated++;
      }
    }

    if (versionsUpdated === 0) {
      return {
        success: true,
        action: 'undeprecate',
        package: packageName,
        message: 'No deprecated versions in range',
      };
    }

    await updatePackument(client, packument, otp);

    logger.success(`Removed deprecation from ${versionsUpdated} version(s) of ${packageName}`);

    return {
      success: true,
      action: 'undeprecate',
      package: packageName,
      message: `Removed deprecation from ${versionsUpdated} version(s)`,
      details: { versionsUpdated, range },
    };
  } catch (error) {
    if (error instanceof OtpRequiredError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      action: 'undeprecate',
      package: packageName,
      error: errorMessage,
    };
  }
}
