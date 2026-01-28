import { createGzip } from 'node:zlib';
import * as tar from './tar.js';
import type { RegistryClient } from '../registry/client.js';
import { getPackument } from '../registry/packument.js';
import { publishPackage } from '../registry/tarball.js';
import type { PublishManifest } from '../registry/tarball.js';
import type { ActionResult, TombstoneOptions } from '../types/action.js';
import { logger } from '../utils/logger.js';
import { getNextMajor } from './semver.js';

const TOMBSTONE_INDEX_TEMPLATE = `'use strict';

const PACKAGE_NAME = '%PACKAGE_NAME%';
const MESSAGE = \`%MESSAGE%\`;

const error = new Error(
  \`[TOMBSTONE] "\${PACKAGE_NAME}" is no longer maintained.\\n\\n\` +
  \`\${MESSAGE}\\n\\n\` +
  \`This package was intentionally deprecated. Do not use.\\n\` +
  \`If you need this functionality, fork the last working version.\\n\`
);

error.code = 'ERR_PACKAGE_TOMBSTONED';

throw error;
`;

const TOMBSTONE_README_TEMPLATE = `# %PACKAGE_NAME%

> ⚠️ **THIS PACKAGE IS NO LONGER MAINTAINED**

%MESSAGE%

This is a **tombstone release** - importing this package will throw an error.

## What happened?

The maintainer has decided to end support for this package. This release exists to:

1. Clearly signal that the package is unmaintained
2. Prevent silent failures in projects that auto-update
3. Keep the package name from being claimed by someone else

## What should I do?

- If you're using this package, pin to the last working version
- Consider forking if you need continued development
- Look for alternative packages that provide similar functionality

## Last working version

Check the npm page for this package to find the last version before this tombstone release.
`;

export async function createTombstone(
  client: RegistryClient,
  options: TombstoneOptions
): Promise<ActionResult> {
  const { package: packageName, targetVersion, message, otp } = options;

  try {
    logger.info(`Creating tombstone release for ${packageName}...`);

    const packument = await getPackument(client, packageName);
    const latestVersion = packument['dist-tags']['latest'] ?? '0.0.0';

    const newVersion =
      targetVersion === 'nextMajor' ? getNextMajor(latestVersion) : targetVersion;

    if (packument.versions[newVersion]) {
      return {
        success: false,
        action: 'tombstone',
        package: packageName,
        error: `Version ${newVersion} already exists`,
      };
    }

    const indexJs = TOMBSTONE_INDEX_TEMPLATE
      .replace('%PACKAGE_NAME%', packageName)
      .replace('%MESSAGE%', message.replace(/`/g, '\\`'));

    const readmeMd = TOMBSTONE_README_TEMPLATE
      .replace(/%PACKAGE_NAME%/g, packageName)
      .replace('%MESSAGE%', message);

    const packageJson = {
      name: packageName,
      version: newVersion,
      description: `[TOMBSTONE] ${packument.description ?? packageName} - NO LONGER MAINTAINED`,
      main: 'index.js',
      scripts: {},
      keywords: ['tombstone', 'deprecated', 'unmaintained'],
      license: 'UNLICENSED',
      deprecated: message,
    };

    const tarballBuffer = await createTarball({
      'package/index.js': indexJs,
      'package/README.md': readmeMd,
      'package/package.json': JSON.stringify(packageJson, null, 2),
    });

    const manifest: PublishManifest = {
      name: packageName,
      version: newVersion,
      description: packageJson.description,
      main: 'index.js',
      deprecated: message,
      readme: readmeMd,
      _id: `${packageName}@${newVersion}`,
      dist: {
        integrity: '',
        shasum: '',
        tarball: '',
      },
    };

    await publishPackage(client, manifest, tarballBuffer, 'latest', otp);

    logger.success(`Published tombstone release ${packageName}@${newVersion}`);

    return {
      success: true,
      action: 'tombstone',
      package: packageName,
      message: `Published tombstone release ${newVersion}`,
      details: {
        version: newVersion,
        previousLatest: latestVersion,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      action: 'tombstone',
      package: packageName,
      error: errorMessage,
    };
  }
}

async function createTarball(files: Record<string, string>): Promise<Buffer> {
  const tarData = tar.create(files);
  return gzipBuffer(tarData);
}

async function gzipBuffer(data: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const gzipStream = createGzip();
    const chunks: Buffer[] = [];

    gzipStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    gzipStream.on('end', () => resolve(Buffer.concat(chunks)));
    gzipStream.on('error', reject);

    gzipStream.end(data);
  });
}
