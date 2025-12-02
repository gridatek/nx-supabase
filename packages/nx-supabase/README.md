# @gridatek/nx-supabase

An Nx plugin for integrating [Supabase](https://supabase.com/) into your Nx workspace with automatic task inference and environment management.

## Features

- 🚀 **Automatic Task Inference** - Targets are automatically detected when you have a `default/config.toml` file
- 🌍 **Multi-Environment Support** - Manage multiple environments (local, staging, production) with ease
- 🔨 **Build System** - Automatically merges default configuration with environment-specific overrides
- 📦 **Type-Safe** - Full TypeScript support
- ⚡ **Nx Integration** - Proper caching and task orchestration

## Installation

```bash
npm install --save-dev @gridatek/nx-supabase supabase
# or
yarn add --dev @gridatek/nx-supabase supabase
# or
pnpm add --save-dev @gridatek/nx-supabase supabase
```

## Quick Start

### 1. Initialize the plugin

```bash
npx nx add @gridatek/nx-supabase
```

### 2. Create a Supabase project

```bash
npx nx g @gridatek/nx-supabase:project my-supabase
```

This creates a project structure:

```
my-supabase/
├── default/              # Default/baseline environment
│   ├── config.toml      # Main Supabase configuration
│   ├── migrations/      # Default migrations
│   └── seeds/           # Default seeds
├── local/               # Empty by default (overrides only)
│   ├── migrations/
│   └── seeds/
└── .generated/          # Auto-generated (git-ignored)
    └── local/           # Merged: default + local overrides
```

### 3. Use the inferred targets

Targets are **automatically inferred** when the plugin detects `default/config.toml`:

```bash
# Build environment configurations (merges default + environment)
nx run my-supabase:build

# Start Supabase (runs build first)
nx run my-supabase:start

# Start with specific environment
nx run my-supabase:start --env=production

# Stop Supabase
nx run my-supabase:stop

# Run any Supabase CLI command
nx run my-supabase:run-command --command="supabase status"
```

## Inferred Tasks

The plugin automatically creates these targets for any project with a `default/config.toml` file:

| Target | Description | Configuration |
|--------|-------------|---------------|
| `build` | Merges default + environment configs | Cached, with proper inputs/outputs |
| `start` | Starts Supabase for an environment | Depends on `build` |
| `stop` | Stops Supabase | No dependencies |
| `run-command` | Runs arbitrary Supabase CLI commands | Flexible command execution |

### How Detection Works

1. The plugin scans your workspace for `**/default/config.toml` files
2. Each detected file indicates a Supabase project
3. Targets are automatically created for that project
4. No manual configuration needed in `project.json`

### Customizing Target Names

You can customize target names in your workspace `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "@gridatek/nx-supabase",
      "options": {
        "buildTargetName": "supabase-build",
        "startTargetName": "supabase-start",
        "stopTargetName": "supabase-stop",
        "runCommandTargetName": "supabase-cmd"
      }
    }
  ]
}
```

## Project Structure

### Default Directory

The `default/` directory contains your baseline Supabase configuration that's shared across all environments:

- `default/config.toml` - Main Supabase configuration
- `default/migrations/` - Default database migrations
- `default/seeds/` - Default seed data

### Environment Directories

Environment directories (e.g., `local/`, `staging/`, `production/`) contain **overrides only**:

- Start with empty directories (just `.gitkeep` files)
- Add files only when you need environment-specific behavior
- Files here override the corresponding files in `default/`

### Build Process

The `build` target merges configurations:

1. Copies all files from `default/` to `.generated/<env>/`
2. Overlays environment-specific files from `<env>/` to `.generated/<env>/`
3. The `.generated/` directory is used by Supabase CLI commands

## Generators

### Project Generator

Create a new Supabase project:

```bash
npx nx g @gridatek/nx-supabase:project <name> [options]
```

**Options:**
- `--name` - Project name (required)
- `--directory` - Directory where the project will be created
- `--environments` - Comma-separated list of environments (default: "local")

**Example:**

```bash
npx nx g @gridatek/nx-supabase:project my-api --environments=local,staging,production
```

## Executors

### Build Executor

Merges default and environment-specific configurations.

```bash
nx run my-supabase:build [--env=<environment>]
```

### Run Command Executor

Executes Supabase CLI commands for a specific environment.

```bash
nx run my-supabase:run-command --command="<command>" [--env=<environment>]
```

**Examples:**

```bash
# Check status
nx run my-supabase:run-command --command="supabase status"

# Create a migration
nx run my-supabase:run-command --command="supabase migration new add_users_table"

# Reset database
nx run my-supabase:run-command --env=local --command="supabase db reset"
```

## Advanced Usage

### Multiple Environments

Create projects with multiple environments:

```bash
npx nx g @gridatek/nx-supabase:project my-api --environments=local,staging,production
```

Each environment gets its own directory for overrides.

### Environment-Specific Overrides

To customize an environment:

1. Add files to the environment directory (e.g., `local/config.toml`)
2. These files override the corresponding files in `default/`
3. Run `nx run my-supabase:build` to merge configurations

**Example:**

```toml
# default/config.toml
[api]
port = 54321

# local/config.toml
[api]
port = 3000  # Override port for local development
```

### CI/CD Integration

The plugin properly configures task caching for CI:

```yaml
# .github/workflows/ci.yml
- name: Build Supabase configurations
  run: nx run-many -t build --all

- name: Start Supabase for tests
  run: nx run my-supabase:start --env=test
```

## Development

### Building the Plugin

```bash
nx build nx-supabase
```

### Running Tests

```bash
nx test nx-supabase
```

### Running E2E Tests

```bash
nx e2e e2e
```

## Migration Guide

### From Manual Target Configuration

If you were previously configuring targets manually in `project.json`, you can now remove them:

**Before:**
```json
{
  "targets": {
    "build": {
      "executor": "@gridatek/nx-supabase:build"
    },
    "start": {
      "executor": "@gridatek/nx-supabase:run-command",
      "options": {
        "command": "supabase start"
      },
      "dependsOn": ["build"]
    }
  }
}
```

**After:**
```json
{
  // Targets are now inferred automatically!
  // No manual configuration needed
}
```

## Contributing

Contributions are welcome! Please open an issue or submit a PR.

## License

MIT

## Links

- [Supabase Documentation](https://supabase.com/docs)
- [Nx Documentation](https://nx.dev)
- [GitHub Repository](https://github.com/gridatek/nx-supabase)
