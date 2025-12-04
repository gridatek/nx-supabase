# Contributing to @gridatek/nx-supabase

Thank you for your interest in contributing to @gridatek/nx-supabase! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Documentation](#documentation)
- [Release Process](#release-process)

---

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

### Our Standards

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Constructive**: Provide helpful feedback and suggestions
- **Be Collaborative**: Work together towards common goals
- **Be Patient**: Remember that everyone has different experience levels

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **Git** installed and configured
- **Docker** installed and running
- **npm** or **yarn** package manager
- **Nx CLI** (optional): `npm install -g nx`

### Finding Issues to Work On

1. Browse [open issues](https://github.com/gridatek/nx-supabase/issues)
2. Look for issues labeled `good first issue` or `help wanted`
3. Comment on the issue to express interest
4. Wait for maintainer approval before starting work

### Reporting Bugs

Before creating a bug report:

1. **Search existing issues** to avoid duplicates
2. **Update to latest version** and verify the bug persists
3. **Create a minimal reproduction** if possible

When creating a bug report, include:

- Nx version (`npx nx --version`)
- Node version (`node --version`)
- Operating system
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages (if any)
- Relevant code snippets

**Template:**

```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. ...
2. ...
3. ...

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [e.g., macOS 14.0]
- Node: [e.g., v20.10.0]
- Nx: [e.g., 22.1.3]
- @gridatek/nx-supabase: [e.g., 0.0.1]

## Additional Context
[Screenshots, error logs, etc.]
```

### Suggesting Features

Feature requests are welcome! Please:

1. **Check existing feature requests** first
2. **Provide clear use case** and motivation
3. **Describe expected behavior** in detail
4. **Consider backwards compatibility**

**Template:**

```markdown
## Feature Description
[Clear description of the feature]

## Motivation
[Why is this feature needed?]

## Proposed Solution
[How should it work?]

## Alternatives Considered
[Other solutions you've thought about]

## Additional Context
[Any other relevant information]
```

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/nx-supabase.git
cd nx-supabase
```

### 2. Add Upstream Remote

```bash
git remote add upstream https://github.com/gridatek/nx-supabase.git
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Verify Setup

```bash
# Run tests
npx nx test nx-supabase

# Build the plugin
npx nx build nx-supabase

# Run e2e tests
npx nx e2e e2e
```

---

## Project Structure

```
nx-supabase/
├── packages/
│   └── nx-supabase/              # Main plugin package
│       ├── src/
│       │   ├── executors/        # Build, start, stop, run-command
│       │   ├── generators/       # init, project
│       │   └── plugins/          # Inferred tasks plugin
│       ├── project.json
│       ├── package.json
│       └── tsconfig.lib.json
├── e2e/                          # End-to-end tests
│   └── src/
│       └── nx-supabase.spec.ts
├── docs/                         # Documentation
│   ├── api-reference.md
│   ├── best-practices.md
│   ├── advanced-usage.md
│   └── migration-guide.md
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── package.json
```

### Key Directories

- **executors/** - Nx executors for running tasks
- **generators/** - Nx generators for scaffolding
- **plugins/** - Plugin for automatic task inference
- **e2e/** - Integration tests
- **docs/** - Documentation files

---

## Development Workflow

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feat/your-feature-name

# Or for bugfixes
git checkout -b fix/issue-description
```

### Making Changes

1. **Write tests first** (TDD approach recommended)
2. **Implement the feature/fix**
3. **Run tests**
4. **Update documentation**
5. **Test manually** with local project

### Testing Changes Locally

#### Option 1: Local Registry

```bash
# Terminal 1: Start local registry
npx nx local-registry

# Terminal 2: Build and publish to local registry
npx nx build nx-supabase
cd packages/nx-supabase
npm publish --registry http://localhost:4873

# Terminal 3: Test in a sample project
cd /path/to/test-project
npm install @gridatek/nx-supabase@e2e --registry http://localhost:4873
```

#### Option 2: Link Locally

```bash
# In nx-supabase project
npx nx build nx-supabase
cd packages/nx-supabase/dist
npm link

# In test project
npm link @gridatek/nx-supabase
```

### Running Tests

```bash
# Unit tests
npx nx test nx-supabase

# With coverage
npx nx test nx-supabase --coverage

# Watch mode
npx nx test nx-supabase --watch

# E2E tests (requires Docker)
npx nx e2e e2e

# Specific test file
npx nx test nx-supabase --testFile=build.spec.ts
```

### Debugging Tests

```typescript
// Use .only to run specific tests
describe.only('Build Executor', () => {
  it.only('should build environments', async () => {
    // ...
  });
});
```

---

## Testing

### Unit Tests

Located in `packages/nx-supabase/src/**/*.spec.ts`

Example:

```typescript
import { describe, it, expect } from 'vitest';
import executor from './executor';

describe('My Executor', () => {
  it('should execute successfully', async () => {
    const result = await executor({}, mockContext);
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests

Located in `e2e/src/nx-supabase.spec.ts`

Tests the full user workflow:

```typescript
describe('@gridatek/nx-supabase', () => {
  it('should create and run a project', () => {
    // Generate project
    execSync('npx nx g @gridatek/nx-supabase:project my-app');

    // Build
    execSync('npx nx run my-app:build');

    // Start
    execSync('npx nx run my-app:start');

    // Verify
    const status = execSync('npx nx run my-app:run-command --command="supabase status"');
    expect(status.toString()).toContain('running');

    // Stop
    execSync('npx nx run my-app:stop');
  });
});
```

### Test Coverage

Aim for:
- **80%+ statement coverage**
- **80%+ branch coverage**
- **Test critical paths**
- **Test error handling**

---

## Submitting Changes

### Before Submitting

Checklist:

- [ ] Tests pass (`npx nx test nx-supabase`)
- [ ] E2E tests pass (`npx nx e2e e2e`)
- [ ] Code follows style guidelines
- [ ] Commits follow commit conventions
- [ ] Documentation updated (if applicable)
- [ ] No linting errors (`npx nx lint nx-supabase`)
- [ ] Changes tested manually

### Creating a Pull Request

1. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

2. **Open PR on GitHub**

3. **Fill out PR template**:

   ```markdown
   ## Description
   [Clear description of changes]

   ## Related Issue
   Closes #[issue number]

   ## Type of Change
   - [ ] Bug fix (non-breaking change that fixes an issue)
   - [ ] New feature (non-breaking change that adds functionality)
   - [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] E2E tests pass
   - [ ] Manually tested

   ## Screenshots (if applicable)
   [Add screenshots]

   ## Checklist
   - [ ] My code follows the project's style guidelines
   - [ ] I have performed a self-review of my code
   - [ ] I have commented my code, particularly in hard-to-understand areas
   - [ ] I have made corresponding changes to the documentation
   - [ ] My changes generate no new warnings
   - [ ] I have added tests that prove my fix is effective or that my feature works
   - [ ] New and existing unit tests pass locally with my changes
   ```

4. **Wait for review**

### Code Review Process

- Maintainers will review your PR
- Address feedback by pushing new commits
- Once approved, a maintainer will merge

### After Merge

```bash
# Sync your fork
git checkout main
git pull upstream main
git push origin main

# Delete feature branch
git branch -d feat/your-feature-name
git push origin --delete feat/your-feature-name
```

---

## Code Style

### TypeScript Guidelines

- Use TypeScript for all source code
- Enable strict mode
- Avoid `any` types
- Use interfaces for public APIs
- Document complex logic

### Formatting

The project uses Prettier for code formatting:

```bash
# Format all files
npx prettier --write .

# Check formatting
npx prettier --check .
```

### Linting

```bash
# Lint code
npx nx lint nx-supabase

# Auto-fix issues
npx nx lint nx-supabase --fix
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Interfaces**: `PascalCase` (no `I` prefix)
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private members**: Prefix with `_` (optional)

### Example

```typescript
// Good
export interface ExecutorSchema {
  env?: string;
  command: string;
}

export default async function runExecutor(
  options: ExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectName = context.projectName;
  // ...
}

// Bad
export interface IExecutorSchema {  // No I prefix
  Env?: string;  // Should be camelCase
  COMMAND: string;  // Should be camelCase
}

export default async function run_executor(  // Should be camelCase
  Options: ExecutorSchema,  // Should be camelCase
  Context: ExecutorContext  // Should be camelCase
): Promise<{ Success: boolean }> {  // Should be camelCase
  // ...
}
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Scopes

- **executor**: Executor changes
- **generator**: Generator changes
- **plugin**: Plugin changes
- **build**: Build system changes
- **ci**: CI configuration
- **docs**: Documentation

### Examples

```bash
# Feature
git commit -m "feat(generator): add support for custom environments"

# Bug fix
git commit -m "fix(executor): resolve path issues on Windows"

# Documentation
git commit -m "docs(api): update executor options"

# Breaking change
git commit -m "feat(plugin)!: change project detection pattern

BREAKING CHANGE: Projects must now have production/config.toml"

# Multiple changes
git commit -m "feat(executor): add new start options

- Add --no-cleanup flag
- Support custom ports
- Improve error messages

Closes #123"
```

---

## Documentation

### When to Update Documentation

Update docs when:
- Adding new features
- Changing existing behavior
- Fixing bugs that affect usage
- Adding new configuration options

### Documentation Files

- **README.md** - Overview and quick start
- **docs/api-reference.md** - Detailed API docs
- **docs/best-practices.md** - Usage patterns
- **docs/advanced-usage.md** - Complex scenarios
- **docs/migration-guide.md** - Migration instructions

### Writing Style

- Use clear, concise language
- Provide code examples
- Include both common and edge cases
- Link to related sections
- Keep examples up-to-date

---

## Release Process

**Note**: Only maintainers can create releases.

### Version Bumping

```bash
# Use Nx release for versioning
npx nx release --dry-run

# Actually release
npx nx release
```

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Git tags created
- [ ] Published to npm
- [ ] GitHub release created

---

## Getting Help

### Resources

- **Documentation**: [README.md](../README.md)
- **API Reference**: [docs/api-reference.md](../docs/api-reference.md)
- **Discord**: [Join our Discord](https://discord.gg/gridatek) (if available)
- **Email**: support@gridatek.com

### Questions

- Search [existing discussions](https://github.com/gridatek/nx-supabase/discussions)
- Ask in [GitHub Discussions](https://github.com/gridatek/nx-supabase/discussions/new)
- Join our community chat (if available)

---

## Recognition

Contributors will be:
- Listed in GitHub contributors
- Mentioned in release notes (for significant contributions)
- Added to CONTRIBUTORS.md (if we create one)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to @gridatek/nx-supabase! 🎉
