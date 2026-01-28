import type { RegistryClient } from '../registry/client.js';
import { OtpRequiredError } from '../registry/client.js';
import { addOwner as addOwnerToRegistry, removeOwner as removeOwnerFromRegistry } from '../registry/owners.js';
import type { ActionResult, OwnerAddOptions, OwnerRemoveOptions } from '../types/action.js';
import { logger } from '../utils/logger.js';

export async function addOwner(
  client: RegistryClient,
  options: OwnerAddOptions
): Promise<ActionResult> {
  const { package: packageName, user, otp } = options;

  try {
    logger.info(`Adding ${user} as owner of ${packageName}...`);

    await addOwnerToRegistry(client, packageName, user, otp);

    logger.success(`Added ${user} as owner of ${packageName}`);

    return {
      success: true,
      action: 'ownerAdd',
      package: packageName,
      message: `Added ${user} as owner`,
      details: { user },
    };
  } catch (error) {
    if (error instanceof OtpRequiredError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      action: 'ownerAdd',
      package: packageName,
      error: errorMessage,
    };
  }
}

export async function removeOwner(
  client: RegistryClient,
  options: OwnerRemoveOptions
): Promise<ActionResult> {
  const { package: packageName, user, otp } = options;

  try {
    logger.info(`Removing ${user} from owners of ${packageName}...`);

    await removeOwnerFromRegistry(client, packageName, user, otp);

    logger.success(`Removed ${user} from owners of ${packageName}`);

    return {
      success: true,
      action: 'ownerRemove',
      package: packageName,
      message: `Removed ${user} from owners`,
      details: { user },
    };
  } catch (error) {
    if (error instanceof OtpRequiredError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      action: 'ownerRemove',
      package: packageName,
      error: errorMessage,
    };
  }
}
