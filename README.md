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

- **Interactive TUI** — Browse your packages with downloads, dependents, and status
- **Multi-select & bulk actions** — Select multiple packages and apply actions at once
- **Action catalog** — Deprecate, unpublish, tombstone, transfer ownership
- **Impact explanations** — Understand consequences before applying
- **Direct execution** — Select, confirm, execute, back to list
- **Safety first** — Confirmation prompts, policy checks, eligibility validation
- **2FA support** — Automatic OTP via 1Password CLI or manual input
- **Live refresh** — Reload package data without restarting

## Installation

```bash
npm install -g npm-sweep
```

Requires Node.js 20 or later.

## Quick Start

```bash
# Start interactive TUI (default command)
npm-sweep

# Or scan your packages as a table
npm-sweep scan
```

## Commands

### `npm-sweep` / `npm-sweep tui`

Start the interactive terminal UI. This is the default command.

```bash
npm-sweep                         # Start TUI
npm-sweep --enable-unpublish      # Enable unpublish action (disabled by default)
npm-sweep --1password-item npmjs  # Auto-fetch OTP from 1Password
npm-sweep --user other-user       # Browse another user's packages
```

**Keyboard shortcuts:**
- `j/k` or arrows — Navigate
- `Space` — Toggle selection
- `Enter` — View package details
- `a` — Choose action for selected package(s)
- `s` — Cycle sort column (name, date, downloads, dependents)
- `o` — Toggle sort order
- `r` — Refresh package list from registry
- `/` — Filter by name
- `q` — Quit

### `npm-sweep scan`

List all your npm packages with metadata.

```bash
npm-sweep scan                    # List your packages
npm-sweep scan --user other-user  # List another user's packages
npm-sweep scan --scope @myorg     # Filter by scope
npm-sweep scan --json             # Output as JSON
npm-sweep scan --include-deprecated
```

## Actions

### Deprecate

Mark packages as deprecated. Users see a warning on install.

```
npm warn deprecated my-package@1.0.0: This package is no longer maintained.
```

- **Reversible:** Yes (undeprecate)
- **Impact:** Low — existing installs unaffected

### Unpublish

Remove packages from the registry permanently. Disabled by default, enable with `--enable-unpublish`.

- **Reversible:** No
- **Restrictions:**
  - Within 72h: Allowed if no dependents
  - After 72h: Only if <300 downloads/week, single owner, no dependents
- **Impact:** Critical — breaks dependent projects

npm-sweep checks eligibility automatically and shows why a package can or cannot be unpublished.

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
--registry <url>         # Custom registry (default: https://registry.npmjs.org)
--otp <code>             # One-time password for 2FA
--1password-item <name>  # 1Password item name for automatic OTP
--debug                  # Enable debug output
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
- **OTP support** — Automatic via 1Password CLI or manual prompt
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
