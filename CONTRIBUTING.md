# Contributing to npm-sweep

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- Git

### Setup

```bash
git clone https://github.com/sebastian-software/npm-sweep.git
cd npm-sweep
npm install
```

### Development Commands

```bash
npm run dev        # Start in watch mode
npm run build      # Build for production
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
npm run lint       # Check for linting errors
npm run lint:fix   # Fix linting errors
npm run typecheck  # Run TypeScript type checking
npm run format     # Format code with Prettier
```

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

When filing an issue, include:

- A clear, descriptive title
- Steps to reproduce the behavior
- Expected behavior
- Actual behavior
- Your environment (Node.js version, OS, npm-sweep version)
- Any relevant logs or error messages

### Suggesting Features

Feature requests are welcome! Please:

- Check if the feature has already been requested
- Describe the use case and why it would be valuable
- Consider if it aligns with the project's goals

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** for any new functionality
4. **Run the test suite** to ensure nothing is broken
5. **Update documentation** if needed
6. **Submit a pull request** with a clear description

#### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for GitLab repository archiving
fix: handle packages with no versions gracefully
docs: update installation instructions
test: add tests for unpublish eligibility
refactor: simplify plan executor logic
chore: update dependencies
```

The commit type determines the version bump:
- `feat:` → minor version bump
- `fix:` → patch version bump
- `feat!:` or `BREAKING CHANGE:` → major version bump

#### Pull Request Guidelines

- Keep changes focused — one feature/fix per PR
- Include tests for new functionality
- Update the README if adding user-facing features
- Ensure CI passes before requesting review

## Project Structure

```
src/
├── actions/       # Individual action implementations
├── cli/           # CLI command handlers
├── plan/          # Plan generation, validation, execution
├── policy/        # npm policy checks (unpublish eligibility)
├── providers/     # External service integrations (GitHub)
├── registry/      # npm registry API client
├── tui/           # Terminal UI components (Ink/React)
├── types/         # TypeScript type definitions
└── utils/         # Shared utilities

test/
├── fixtures/      # Test data
└── unit/          # Unit tests
```

## Coding Standards

### TypeScript

- Use strict TypeScript — avoid `any` where possible
- Prefer interfaces over type aliases for object shapes
- Export types from `src/types/` for public API

### Testing

- Write unit tests for business logic
- Use descriptive test names
- Test edge cases and error conditions

### Style

- Code is formatted with Prettier (runs automatically on commit)
- ESLint enforces coding standards
- Use meaningful variable and function names

## Release Process

Releases are automated via [Release Please](https://github.com/googleapis/release-please):

1. Commits to `main` trigger Release Please to create/update a release PR
2. The PR accumulates changes and updates the changelog
3. Merging the release PR creates a GitHub release
4. The release triggers npm publishing with provenance

You don't need to manually update versions or changelogs.

## Questions?

Feel free to open an issue for any questions about contributing.
