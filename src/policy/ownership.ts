import type { DiscoveredPackage } from '../types/package.js';

export interface OwnershipValidation {
  canTransfer: boolean;
  canRemoveSelf: boolean;
  isOnlyOwner: boolean;
  owners: string[];
  warnings: string[];
}

export function validateOwnership(
  pkg: DiscoveredPackage,
  currentUser: string
): OwnershipValidation {
  const warnings: string[] = [];
  const isOwner = pkg.owners.some(
    (owner) => owner.toLowerCase() === currentUser.toLowerCase()
  );
  const isOnlyOwner = pkg.owners.length === 1 && isOwner;

  if (!isOwner) {
    warnings.push('You are not an owner of this package');
  }

  if (isOnlyOwner) {
    warnings.push('You are the only owner - removing yourself will orphan the package');
  }

  return {
    canTransfer: isOwner,
    canRemoveSelf: isOwner && !isOnlyOwner,
    isOnlyOwner,
    owners: pkg.owners,
    warnings,
  };
}

export function formatOwnershipReport(validation: OwnershipValidation): string {
  const lines: string[] = [];

  lines.push(`Owners: ${validation.owners.join(', ')}`);
  lines.push(`Can transfer: ${validation.canTransfer ? 'Yes' : 'No'}`);
  lines.push(`Can remove self: ${validation.canRemoveSelf ? 'Yes' : 'No'}`);

  if (validation.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of validation.warnings) {
      lines.push(`  ⚠ ${warning}`);
    }
  }

  return lines.join('\n');
}
