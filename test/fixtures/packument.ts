import type { Packument } from '../../src/types/package.js';

export const mockPackument: Packument = {
  _id: 'test-package',
  name: 'test-package',
  description: 'A test package',
  'dist-tags': {
    latest: '1.2.3',
  },
  versions: {
    '1.0.0': {
      name: 'test-package',
      version: '1.0.0',
      description: 'A test package',
      main: 'index.js',
      dist: {
        tarball: 'https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz',
        shasum: 'abc123',
        integrity: 'sha512-xxx',
      },
    },
    '1.2.3': {
      name: 'test-package',
      version: '1.2.3',
      description: 'A test package',
      main: 'index.js',
      dist: {
        tarball: 'https://registry.npmjs.org/test-package/-/test-package-1.2.3.tgz',
        shasum: 'def456',
        integrity: 'sha512-yyy',
      },
    },
  },
  time: {
    created: '2020-01-01T00:00:00.000Z',
    modified: '2024-01-15T00:00:00.000Z',
    '1.0.0': '2020-01-01T00:00:00.000Z',
    '1.2.3': '2024-01-15T00:00:00.000Z',
  },
  maintainers: [
    { name: 'testuser', email: 'test@example.com' },
  ],
  repository: {
    type: 'git',
    url: 'https://github.com/test/test-package.git',
  },
};

export const mockDeprecatedPackument: Packument = {
  ...mockPackument,
  _id: 'deprecated-package',
  name: 'deprecated-package',
  versions: {
    '1.0.0': {
      ...mockPackument.versions['1.0.0']!,
      name: 'deprecated-package',
      deprecated: 'This package is deprecated',
    },
  },
};

export const mockScopedPackument: Packument = {
  ...mockPackument,
  _id: '@scope/test-package',
  name: '@scope/test-package',
  versions: {
    '1.0.0': {
      ...mockPackument.versions['1.0.0']!,
      name: '@scope/test-package',
    },
  },
};
