# npm-sweep

[![npm version](https://img.shields.io/npm/v/npm-sweep.svg)](https://www.npmjs.com/package/npm-sweep)
[![CI](https://github.com/sebastian-software/npm-sweep/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastian-software/npm-sweep/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/npm-sweep.svg)](https://nodejs.org)

Interactive CLI tool for managing end-of-life of your npm packages. Like `npm-check-updates` but for sunsetting packages.

## Why?

Maintainers accumulate packages over the years — experiments, old utilities, superseded libraries. "Just delete it" feels liberating but npm's ecosystem has rules and consequences:

- **Unpublish** is heavily restricted (72h window, download limits, no dependents)
- **Deprecation** is the recommended path but needs clear messaging
- **Abandoned packages** without proper EOL hurt the ecosystem

**npm-sweep** helps you clean up responsibly by showing what's possible, explaining the impact, and executing changes safely.

## Features

- **Interactive TUI** — Browse your packages, filter, multi-select
- **Action catalog** — Deprecate, unpublish, tombstone, transfer ownership, archive repo
- **Impact explanations** — Understand consequences before applying
- **Plan workflow** — Generate a plan, review it, apply later
- **Safety first** — Dry-run mode, confirmation prompts, policy checks
- **2FA support** — OTP prompts and 1Password integration

## Installation

```bash
npm install -g npm-sweep
```

Requires Node.js 20 or later.

## Quick Start

```bash
# Start interactive TUI
npm-sweep tui

# Or scan your packages first
npm-sweep scan
```

## Commands

### `npm-sweep scan`

List all your npm packages with metadata.

```bash
npm-sweep scan                    # List your packages
npm-sweep scan --user other-user  # List another user's packages
npm-sweep scan --scope @myorg     # Filter by scope
npm-sweep scan --json             # Output as JSON
npm-sweep scan --include-deprecated
```

### `npm-sweep tui`

Start the interactive terminal UI.

```bash
npm-sweep tui
npm-sweep tui --enable-unpublish  # Enable unpublish action (disabled by default)
```

**Keyboard shortcuts:**
- `j/k` or arrows — Navigate
- `Space` — Toggle selection
- `Enter` — View details
- `a` — Add action to plan
- `p` — View current plan
- `q` — Quit

### `npm-sweep plan`

Generate an execution plan without the TUI.

```bash
npm-sweep plan --out plan.json --packages pkg1,pkg2 --action deprecate --message "No longer maintained"
```

### `npm-sweep apply`

Apply a previously generated plan.

```bash
npm-sweep apply --in plan.json              # Apply with confirmation
npm-sweep apply --in plan.json --dry-run    # Preview without changes
npm-sweep apply --in plan.json --yes        # Skip confirmation (CI)
```

## Actions

### Deprecate

Mark packages as deprecated. Users see a warning on install.

```
⚠ npm warn deprecated my-package@1.0.0: This package is no longer maintained.
```

- **Reversible:** Yes (undeprecate)
- **Impact:** Low — existing installs unaffected

### Unpublish

Remove packages from the registry permanently.

- **Reversible:** No
- **Restrictions:**
  - Within 72h: Allowed if no dependents
  - After 72h: Only if <300 downloads/week, single owner, no dependents
- **Impact:** Critical — breaks dependent projects

npm-sweep checks eligibility automatically and disables unpublish when policy doesn't allow it.

### Tombstone Release

Publish a new major version that throws on import:

```javascript
// Importing this package will throw:
Error: [TOMBSTONE] "my-package" is no longer maintained.
```

- **Reversible:** Yes (publish a working version)
- **Impact:** High — breaks auto-updating projects, but auditable

### Transfer Ownership

Add or remove maintainers. Transfer to `npm` to fully hand off a package.

## Global Options

```bash
--registry <url>     # Custom registry (default: https://registry.npmjs.org)
--otp <code>         # One-time password for 2FA
--1password-item <n> # 1Password item name for OTP
--debug              # Enable debug output
```

## Plan File Format

Plans are JSON files that can be reviewed before applying:

```json
{
  "version": 1,
  "generatedAt": "2025-01-28T10:00:00Z",
  "actor": "your-username",
  "actions": [
    {
      "package": "old-tool",
      "steps": [
        { "type": "deprecate", "range": "*", "message": "Use new-tool instead" }
      ]
    }
  ]
}
```

## Programmatic Usage

```typescript
import { RegistryClient, deprecate, checkUnpublishEligibility } from 'npm-sweep';

const client = new RegistryClient();

// Deprecate a package
await deprecate(client, {
  package: 'my-package',
  range: '*',
  message: 'Use alternative-package instead',
});

// Check if unpublish is allowed
const eligibility = await checkUnpublishEligibility(client, packageInfo);
if (eligibility.eligible) {
  // Safe to unpublish
}
```

## Security

- **No token storage** — Uses existing `npm login` session or `NPM_TOKEN` env var
- **OTP support** — Prompts for 2FA when required
- **Redacted logs** — Tokens and emails are never logged

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Setup
git clone https://github.com/sebastian-software/npm-sweep.git
cd npm-sweep
npm install

# Development
npm run dev      # Watch mode
npm run test     # Run tests
npm run lint     # Lint code
npm run build    # Build for production
```

## License

[MIT](LICENSE) © [Sebastian Software GmbH](https://sebastian-software.de)
