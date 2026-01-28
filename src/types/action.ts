export type ActionType =
  | 'deprecate'
  | 'undeprecate'
  | 'unpublish'
  | 'tombstone'
  | 'ownerAdd'
  | 'ownerRemove'
  | 'archiveRepo';

export interface ActionResult {
  success: boolean;
  action: ActionType;
  package: string;
  message?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface DeprecateOptions {
  package: string;
  range: string;
  message: string;
  otp?: string;
}

export interface UndeprecateOptions {
  package: string;
  range: string;
  otp?: string;
}

export interface UnpublishOptions {
  package: string;
  version?: string;
  force?: boolean;
  otp?: string;
}

export interface TombstoneOptions {
  package: string;
  targetVersion: string;
  message: string;
  otp?: string;
}

export interface OwnerAddOptions {
  package: string;
  user: string;
  otp?: string;
}

export interface OwnerRemoveOptions {
  package: string;
  user: string;
  otp?: string;
}

export interface ArchiveRepoOptions {
  package: string;
  provider: 'github' | 'gitlab';
  repo: string;
  addBanner?: boolean;
}

export interface UnpublishEligibility {
  eligible: boolean;
  reason?: string;
  checks: {
    publishAge: {
      passed: boolean;
      value: string;
      description: string;
    };
    weeklyDownloads: {
      passed: boolean;
      value: number | 'unknown';
      description: string;
    };
    ownerCount: {
      passed: boolean;
      value: number;
      description: string;
    };
    hasDependents: {
      passed: boolean;
      value: 'unknown' | boolean;
      description: string;
    };
  };
}

export interface ImpactInfo {
  action: ActionType;
  title: string;
  description: string;
  consequences: string[];
  reversible: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const ACTION_IMPACTS: Record<ActionType, ImpactInfo> = {
  deprecate: {
    action: 'deprecate',
    title: 'Deprecate Package',
    description: 'Mark package or version range as deprecated',
    consequences: [
      'Users will see a deprecation warning on install',
      'Does not break existing installs',
      'Package remains installable',
    ],
    reversible: true,
    severity: 'low',
  },
  undeprecate: {
    action: 'undeprecate',
    title: 'Remove Deprecation',
    description: 'Remove deprecation warning from package',
    consequences: ['Deprecation warning will no longer appear', 'Package appears maintained again'],
    reversible: true,
    severity: 'low',
  },
  unpublish: {
    action: 'unpublish',
    title: 'Unpublish Package',
    description: 'Permanently remove package or version from registry',
    consequences: [
      'Package/version becomes uninstallable',
      'IRREVERSIBLE - cannot undo',
      'pkg@version can never be reused',
      'Full package unpublish blocks republish for 24h',
      'May break dependent projects',
    ],
    reversible: false,
    severity: 'critical',
  },
  tombstone: {
    action: 'tombstone',
    title: 'Tombstone Release',
    description: 'Publish a major version that throws on import',
    consequences: [
      'Latest version will fail intentionally',
      'Users auto-updating (^) may break',
      'Package remains in registry (auditable)',
      'Old versions still installable',
    ],
    reversible: true,
    severity: 'high',
  },
  ownerAdd: {
    action: 'ownerAdd',
    title: 'Add Owner',
    description: 'Add a maintainer to the package',
    consequences: ['New user gains full publish/admin rights', 'They can add/remove other owners'],
    reversible: true,
    severity: 'medium',
  },
  ownerRemove: {
    action: 'ownerRemove',
    title: 'Remove Owner',
    description: 'Remove a maintainer from the package',
    consequences: [
      'User loses all access to package',
      'If removing yourself, you lose control',
      'Cannot undo without another owner adding you back',
    ],
    reversible: false,
    severity: 'high',
  },
  archiveRepo: {
    action: 'archiveRepo',
    title: 'Archive Repository',
    description: 'Set repository to read-only and add unmaintained banner',
    consequences: [
      'Repository becomes read-only',
      'No new issues, PRs, or commits allowed',
      'README will show unmaintained banner',
      'Code remains accessible for reference',
    ],
    reversible: true,
    severity: 'medium',
  },
};
