# @gridatek/nx-supabase

<p align="center">
  <img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="100" alt="Nx Logo" />
  <span style="font-size: 2em; margin: 0 20px;">+</span>
  <img src="https://supabase.com/docs/img/supabase-logo-wordmark--light.svg" width="200" alt="Supabase Logo" />
</p>

<p align="center">
  <strong>Nx plugin for Supabase integration</strong>
</p>

<p align="center">
  Manage multiple Supabase projects and environments in your Nx monorepo with ease
</p>

<p align="center">
  <a href="https://github.com/gridatek/nx-supabase/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/@gridatek/nx-supabase"><img src="https://img.shields.io/npm/v/@gridatek/nx-supabase.svg" alt="npm version"></a>
</p>

---

## Features

✨ **Multi-Environment Support** - Manage production, local, staging, and custom environments

🔧 **Convention Over Configuration** - Automatic project detection via inferred tasks plugin

🚀 **Simple Workflows** - Easy-to-use generators and executors for common Supabase operations

📦 **Monorepo Ready** - Built specifically for Nx workspaces

🔄 **Environment Merging** - Base configuration with environment-specific overrides

⚡ **Fast Builds** - Intelligent caching and optimized build process

## Quick Start

### Installation

```bash
# Add the plugin to your Nx workspace
npx nx add @gridatek/nx-supabase
```

This command will:
- Install the `@gridatek/nx-supabase` package
- Add Supabase CLI to your devDependencies
- Register the plugin in your `nx.json`

### Create Your First Supabase Project

```bash
# Generate a new Supabase project (defaults to project name as directory in the root)
npx nx g @gridatek/nx-supabase:project my-supabase
# Creates at: my-supabase/ (in the root)

# Custom directory (project name ≠ folder name)
npx nx g @gridatek/nx-supabase:project my-supabase --directory=apps/my-api/supabase
# Creates at: apps/my-api/supabase/
# Run with: nx run my-supabase:start

# Or match folder name to project name
npx nx g @gridatek/nx-supabase:project my-supabase --directory=apps/my-api/my-supabase
# Creates at: apps/my-api/my-supabase/
```

This creates a project with:
- **production/** - Your production configuration (base for all environments)
- **local/** - Local development overrides
- **.generated/** - Auto-generated build outputs
- **project.json** - Nx project configuration (optional with `--skipProjectJson`)

### Start Using Supabase

```bash
# Build environment configurations
npx nx run my-supabase:build

# Start Supabase locally (defaults to 'local' environment)
npx nx run my-supabase:start

# Check status
npx nx run my-supabase:status

# Stop Supabase
npx nx run my-supabase:stop
```

## Project Structure

```
my-supabase/
├── production/              # Production environment (base configuration)
│   └── config.toml          # Main Supabase configuration
├── local/                   # Local development overrides (empty by default)
├── .generated/              # AUTO-GENERATED (do not edit)
│   └── local/               # Built local config (production + local overrides)
├── .gitignore               # Ignores .generated/
├── README.md                # Project documentation
└── project.json             # Nx targets (optional with inferred tasks)
```

**Note:** Create `migrations/` and `seeds/` directories in each environment as needed.

## How It Works

### Environment Architecture

1. **Production Directory**: Serves as the base configuration for all environments.

2. **Additional Environments**: Each environment (local, staging, production, etc.) starts with the production config and merges in environment-specific overrides.

3. **Build Process**:
   - All environments: Built to `.generated/<env>/supabase` by merging production + environment-specific files

### Automatic Project Detection

Projects are automatically detected when you have a `production/config.toml` file. The plugin extracts the project name from the `project_id` field in config.toml.

## Available Commands

### Generators

#### `project` - Create a new Supabase project

```bash
# Basic usage
npx nx g @gridatek/nx-supabase:project <name>

# With options
npx nx g @gridatek/nx-supabase:project my-supabase \
  --directory=apps/my-api/supabase \
  --environments=staging,qa \
  --skipProjectJson
# Creates at: apps/my-api/supabase/
```

**Options:**
- `--directory` - Directory where the project will be created (defaults to project name)
- `--environments` - Comma-separated list of additional environments (beyond production and local)
- `--skipProjectJson` - Skip creating project.json, rely on inferred tasks plugin

**Default Environments:**
Production and local are always created. Use `--environments` to add more like staging, qa, dev, etc.

#### `init` - Initialize the plugin (runs automatically via `nx add`)

```bash
npx nx g @gridatek/nx-supabase:init
```

### Executors

#### `build` - Build environment configurations

```bash
npx nx run <project>:build
```

Merges production config with environment-specific files and outputs to `.generated/<env>/supabase/` for all environments.

#### `start` - Start Supabase

```bash
# Default environment (local)
npx nx run <project>:start

# Specific environment
npx nx run <project>:start --env=production
```

Automatically runs build before starting.

#### `stop` - Stop Supabase

```bash
npx nx run <project>:stop
```

Stops the running Supabase instance.

#### Common Targets

The plugin provides convenient shortcuts for frequently used Supabase commands:

```bash
# Check status
npx nx run <project>:status

# Reset database
npx nx run <project>:db-reset

# Push migrations to remote
npx nx run <project>:db-push

# Pull schema from remote
npx nx run <project>:db-pull

# Generate TypeScript types (from local database)
npx nx run <project>:gen-types

# Generate types with custom output path
npx nx run <project>:gen-types --outputPath=libs/project-name/src/database.types.ts

# Generate types from remote project
npx nx run <project>:gen-types --projectId=your-project-id

# Create a new migration (pass name via command option)
npx nx run <project>:migration-new --command="supabase migration new my_table"

# Link to remote project
npx nx run <project>:link

# Show database diff
npx nx run <project>:db-diff
```

All targets (except `link`) automatically run `build` first to ensure configurations are up-to-date.

#### `run-command` - Run any Supabase CLI command

For commands not covered by the convenience targets:

```bash
# Run any Supabase command
npx nx run <project>:run-command --command="supabase functions new my-function"

# With specific environment
npx nx run <project>:run-command --env=staging --command="supabase db remote commit"
```

## Multiple Environments

### Creating Additional Environments

```bash
npx nx g @gridatek/nx-supabase:project my-supabase \
  --directory=apps/my-api/supabase \
  --environments=staging,qa,dev
# Creates at: apps/my-api/supabase/
```

This creates:
- `production/` (base config, always created)
- `local/` (always created)
- `staging/` (additional)
- `qa/` (additional)
- `dev/` (additional)

### Working with Environments

```bash
# Build all environments
npx nx run my-api:build

# Start with staging environment
npx nx run my-api:start --env=staging

# Run command in QA environment
npx nx run my-api:run-command --env=qa --command="supabase status"
```

### Environment Override Strategy

1. Start with production config as base
2. Override with environment-specific files
3. Files in environment directories take precedence

**Example:**
- `production/config.toml` - Base config for all environments
- `staging/config.toml` - Overrides only the settings different in staging
- Result: `.generated/staging/` contains merged configuration

## Inferred Tasks (Optional)

By default, projects include a `project.json` with explicit targets. You can skip this file and rely entirely on the inferred tasks plugin:

```bash
npx nx g @gridatek/nx-supabase:project my-api --skipProjectJson
```

Benefits:
- Less configuration to maintain
- Automatic task detection
- Convention over configuration
- Projects detected by `production/config.toml` presence

The plugin automatically infers these targets:
- `build` - Build environment configurations
- `start` - Start Supabase
- `stop` - Stop Supabase
- `status` - Check Supabase status
- `db-reset` - Reset the database
- `db-push` - Push migrations to remote
- `db-pull` - Pull schema from remote
- `gen-types` - Generate TypeScript types
- `migration-new` - Create a new migration
- `link` - Link to remote project
- `db-diff` - Show database diff
- `run-command` - Run any Supabase command

## Examples

### Common Workflows

#### Setting up a new project

```bash
# 1. Generate project
npx nx g @gridatek/nx-supabase:project my-app

# 2. Start locally
npx nx run my-app:start

# 3. Check it's running
npx nx run my-app:status

# 4. Create a migration
npx nx run my-app:migration-new --command="supabase migration new create_users_table"

# 5. Stop when done
npx nx run my-app:stop
```

#### Working with multiple projects

```bash
# Start multiple projects in parallel
npx nx run-many --target=start --projects=api,admin

# Build all Supabase projects
npx nx run-many --target=build --all

# Stop all
npx nx run-many --target=stop --all
```

#### Environment-specific migrations

```bash
# Local-only test migration
# 1. Create in local/migrations/
# 2. Build to apply
npx nx run my-app:build

# 3. Start with local environment (default)
npx nx run my-app:start
```

## Configuration

### Plugin Options (nx.json)

You can customize target names and configure global defaults:

```json
{
  "plugins": [
    {
      "plugin": "@gridatek/nx-supabase",
      "options": {
        "buildTargetName": "build",
        "startTargetName": "start",
        "stopTargetName": "stop",
        "statusTargetName": "status",
        "dbResetTargetName": "db-reset",
        "dbPushTargetName": "db-push",
        "dbPullTargetName": "db-pull",
        "genTypesTargetName": "gen-types",
        "genTypesOutputPath": "database.types.ts",
        "migrationNewTargetName": "migration-new",
        "linkTargetName": "link",
        "dbDiffTargetName": "db-diff",
        "runCommandTargetName": "run-command"
      }
    }
  ]
}
```

### Per-Project Configuration

You can configure different `genTypesOutputPath` for each project in your monorepo:

```json
{
  "plugins": [
    {
      "plugin": "@gridatek/nx-supabase",
      "options": {
        "genTypesOutputPath": "database.types.ts",
        "projects": {
          "my-api": {
            "genTypesOutputPath": "libs/api-types/src/database.types.ts"
          },
          "admin": {
            "genTypesOutputPath": "libs/admin-types/src/database.types.ts"
          }
        }
      }
    }
  ]
}
```

**Configuration Priority:**
1. Project-specific configuration in `options.projects[projectName]`
2. Global configuration in `options.genTypesOutputPath`
3. Default: `database.types.ts`

**Example:**
```bash
# Generate types for my-api (uses libs/api-types/src/database.types.ts)
npx nx run my-api:gen-types

# Generate types for admin (uses libs/admin-types/src/database.types.ts)
npx nx run admin:gen-types

# Override at runtime
npx nx run my-api:gen-types --outputPath=custom/path.ts
```

### Supabase Configuration

Edit `production/config.toml` for base configuration. See [Supabase CLI documentation](https://supabase.com/docs/guides/cli/config) for available options.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Build Supabase projects
        run: npx nx run-many --target=build --all

      - name: Start Supabase
        run: npx nx run my-app:start

      - name: Run migrations
        run: npx nx run my-app:run-command --command="supabase db reset"

      - name: Run tests
        run: npm test

      - name: Stop Supabase
        run: npx nx run my-app:stop
```

## Documentation

- 📖 [API Reference](./docs/api-reference.md) - Detailed API documentation
- 🎯 [Best Practices](./docs/best-practices.md) - Recommended patterns and workflows
- 🔧 [Advanced Usage](./docs/advanced-usage.md) - Complex scenarios and customization
- 🚀 [Migration Guide](./docs/migration-guide.md) - Migrating existing Supabase projects

## Requirements

- Node.js 18+
- Nx 22+
- Docker (for running Supabase locally)

## Contributing

Contributions are welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) before submitting a PR.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/gridatek/nx-supabase.git
cd nx-supabase

# Install dependencies
npm install

# Run tests
npx nx test nx-supabase

# Build the plugin
npx nx build nx-supabase

# Run e2e tests
npx nx e2e e2e
```

## License

MIT © [GridaTek](https://github.com/gridatek)

## Support

- 🐛 [Report Issues](https://github.com/gridatek/nx-supabase/issues)
- 💬 [Discussions](https://github.com/gridatek/nx-supabase/discussions)
- 📧 [Email Support](mailto:support@gridatek.com)

## Acknowledgments

- Built on top of [Nx](https://nx.dev) and [Supabase](https://supabase.com)
- Inspired by the Nx community's excellent plugins

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/gridatek">GridaTek</a>
</p>
