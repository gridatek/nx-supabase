## 0.20.0 (2026-01-07)

### 🚀 Features

- **plugin:** add per-project genTypesOutputPath configuration ([8b26510](https://github.com/gridatek/nx-supabase/commit/8b26510))

### ❤️ Thank You

- Claude Sonnet 4.5
- Khalil LAGRIDA

## 0.19.0 (2026-01-04)

This was a version bump only, there were no code changes.

## 0.18.0 (2026-01-04)

This was a version bump only, there were no code changes.

## 0.17.0 (2025-12-27)

This was a version bump only, there were no code changes.

## 0.16.0 (2025-12-23)

This was a version bump only, there were no code changes.

## 0.15.0 (2025-12-23)

This was a version bump only, there were no code changes.

## 0.14.0 (2025-12-23)

This was a version bump only, there were no code changes.

## 0.13.0 (2025-12-23)

This was a version bump only, there were no code changes.

## 0.12.0 (2025-12-23)

This was a version bump only, there were no code changes.

## 0.11.0 (2025-12-23)

This was a version bump only, there were no code changes.

## 0.10.0 (2025-12-23)

This was a version bump only, there were no code changes.

## 0.9.0 (2025-12-23)

This was a version bump only, there were no code changes.

## 0.8.0 (2025-12-06)

This was a version bump only, there were no code changes.

## 0.7.0 (2025-12-04)

This was a version bump only, there were no code changes.

## 0.6.0 (2025-12-04)

### 🚀 Features

- add npm-e2e tests for validating npm installation ([#24](https://github.com/gridatek/nx-supabase/pull/24))

### 🩹 Fixes

- remove failing nx fix-ci step from CI workflow ([#23](https://github.com/gridatek/nx-supabase/pull/23))

### ❤️ Thank You

- Claude
- kgridou @kgridou
- Khalil LAGRIDA @klagrida

## 0.5.0 (2025-12-04)

### 🩹 Fixes

- put LICENSE and README.md in the right folder ([#21](https://github.com/gridatek/nx-supabase/pull/21))

### ❤️ Thank You

- kgridou @kgridou
- Khalil LAGRIDA @klagrida

## 0.4.0 (2025-12-04)

This was a version bump only, there were no code changes.

## 0.3.0 (2025-12-04)

This was a version bump only, there were no code changes.

## 0.2.0 (2025-12-04)

### 🩹 Fixes

- Ensure README and LICENSE are included in npm package ([7406af4](https://github.com/gridatek/nx-supabase/commit/7406af4))

### ❤️ Thank You

- kgridou @kgridou

## 0.1.0 (2025-12-04)

### 🚀 Features

- Add inferred tasks for automatic target detection ([#11](https://github.com/gridatek/nx-supabase/pull/11))
- ⚠️  Rename default folder to production and create both local and p… ([#12](https://github.com/gridatek/nx-supabase/pull/12))
- Add option to skip project.json creation ([#13](https://github.com/gridatek/nx-supabase/pull/13))
- Use production directory directly without copying to .generated ([#14](https://github.com/gridatek/nx-supabase/pull/14))
- Always create production and local environments by default ([#15](https://github.com/gridatek/nx-supabase/pull/15))
- Include LICENSE file in npm package build ([#16](https://github.com/gridatek/nx-supabase/pull/16))
- Update publish workflow to use nx release with minor versions ([585e321](https://github.com/gridatek/nx-supabase/commit/585e321))

### 🩹 Fixes

- Configure nx release to handle first release automatically ([f76cc26](https://github.com/gridatek/nx-supabase/commit/f76cc26))

### ⚠️  Breaking Changes

- Rename default folder to production and create both local and p…  ([#12](https://github.com/gridatek/nx-supabase/pull/12))
  The base configuration folder has been renamed from 'default' to 'production'
  Changes:
  - Renamed 'default/' folder to 'production/' across the codebase
  - 'production/' now serves as both the base configuration AND a production environment
  - Project generator now creates both 'local' and 'production' environments by default
  - Build executor treats 'production' specially: copies production/ directly, merges for other envs
  - Updated inferred tasks plugin to detect 'production/config.toml' instead of 'default/config.toml'
  - Updated all tests to reflect new structure
  - Updated documentation and README templates
  Benefits:
  - Clearer naming: 'production' better represents the base/production configuration
  - Simpler structure: production is both base and an environment
  - Better defaults: Projects start with both local and production environments
  Migration guide:
  - Rename your 'default/' folder to 'production/'
  - Update any references from 'default' to 'production' in your configuration
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Co-Authored-By: Claude <noreply@anthropic.com>
  * fix: Create minimal config.toml when supabase init fails
  Ensures project detection works even when supabase init fails by creating
  a minimal config.toml with sensible defaults. This prevents the error
  "Cannot find configuration for task project:build" by guaranteeing that
  production/config.toml exists for the inferred tasks plugin to detect.
  Changes:
  - Added fallback minimal config.toml template
  - Always creates production/config.toml even if supabase init fails
  - Includes all essential Supabase configuration sections
  - User can update the config later as needed
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Co-Authored-By: Claude <noreply@anthropic.com>
  * refactor: Move config.toml template to separate file
  Moved the minimal config.toml template from hardcoded string to a
  separate template file for easier maintenance and updates.
  Changes:
  - Created config.toml.template file in generators/project/files/
  - Updated project generator to read from template file
  - Template uses __PROJECT_ID__ placeholder for substitution
  - Build configuration automatically copies template to dist/
  Benefits:
  - Easier to update configuration without touching code
  - Better separation of concerns
  - Template can be versioned and maintained independently
  - Cleaner generator code
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Co-Authored-By: Claude <noreply@anthropic.com>
  * fix: Ensure production directory exists before writing config.toml
  Fixed ENOENT error in e2e tests by ensuring the production directory
  is created before attempting to write config.toml file. The issue was
  that the callback runs after formatFiles(), but the directories only
  exist in the Nx tree at that point, not on the filesystem.
  Changes:
  - Added mkdirSync with recursive option before writeFileSync
  - Applies to both supabase init success and fallback paths
  - Ensures production/ directory exists on filesystem
  Fixes e2e test failures:
  - "should create a Supabase project with default local environment"
  - "should create project in custom directory"
  - "should start and stop Supabase using convenient shortcuts"
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Co-Authored-By: Claude <noreply@anthropic.com>
  * fix: Always create production directory structure
  Fixed e2e test failures by ensuring production directory with
  migrations and seeds subdirectories is always created, regardless
  of which environments the user specifies.
  Changes:
  - Production directory is now always created as base configuration
  - Changed default environment to 'local' only (production is implicit)
  - Filter out 'production' from user-specified environments to avoid duplication
  - Update logging to show all environments including production
  Rationale:
  - Production is the base configuration directory, not just another environment
  - It should exist even when users only specify --environments=local
  - This ensures production/config.toml and subdirectories always exist
  Fixes e2e tests:
  - "should create a Supabase project with default local environment"
  - "should create project in custom directory"
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Co-Authored-By: Claude <noreply@anthropic.com>

### ❤️ Thank You

- Claude
- kgridou @kgridou
- Khalil LAGRIDA @klagrida