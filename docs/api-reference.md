# API Reference

Complete API documentation for @gridatek/nx-supabase

## Table of Contents

- [Generators](#generators)
  - [init](#init-generator)
  - [project](#project-generator)
- [Executors](#executors)
  - [build](#build-executor)
  - [start](#start-executor)
  - [stop](#stop-executor)
  - [run-command](#run-command-executor)
- [Plugin Options](#plugin-options)

---

## Generators

Generators are used to scaffold new projects and configurations.

### init Generator

Initializes the @gridatek/nx-supabase plugin in your workspace.

**Usage:**

```bash
npx nx g @gridatek/nx-supabase:init [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--skipPackageJson` | `boolean` | `false` | Skip adding Supabase CLI to package.json devDependencies |

**What it does:**

1. Adds `supabase` CLI (^2.0.0) to devDependencies (unless `--skipPackageJson` is true)
2. Registers `@gridatek/nx-supabase` plugin in `nx.json`
3. Returns a callback to install dependencies

**Example:**

```bash
# Standard initialization
npx nx g @gridatek/nx-supabase:init

# Skip package.json modification (manual Supabase CLI installation)
npx nx g @gridatek/nx-supabase:init --skipPackageJson
```

**Notes:**

- This generator is automatically run when using `nx add @gridatek/nx-supabase`
- The plugin won't be added twice if it already exists in `nx.json`

---

### project Generator

Creates a new Supabase project in your workspace.

**Usage:**

```bash
npx nx g @gridatek/nx-supabase:project <name> [options]
```

**Arguments:**

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | The name of the Supabase project |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--directory` | `string` | `undefined` | Directory where the project will be created. If not specified, creates in workspace root |
| `--environments` | `string` | `undefined` | Comma-separated list of additional environments to create (beyond production and local) |
| `--skipProjectJson` | `boolean` | `false` | Skip creating project.json and rely on inferred tasks plugin |

**What it creates:**

```
<project-root>/
├── production/              # Base configuration (always created)
│   ├── config.toml          # Supabase configuration
│   ├── migrations/
│   │   └── .gitkeep
│   └── seeds/
│       └── .gitkeep
├── local/                   # Local environment (always created)
│   ├── migrations/
│   │   └── .gitkeep
│   └── seeds/
│       └── .gitkeep
├── [additional-envs]/       # Any additional environments specified
│   ├── migrations/
│   └── seeds/
├── .generated/              # Build output directory
│   └── .gitkeep
├── .gitignore               # Ignores .generated/
├── README.md                # Project documentation
└── project.json             # Nx targets (unless --skipProjectJson)
```

**Examples:**

```bash
# Basic project in workspace root
npx nx g @gridatek/nx-supabase:project my-supabase

# Project in apps directory
npx nx g @gridatek/nx-supabase:project api --directory=apps

# With additional environments
npx nx g @gridatek/nx-supabase:project backend \
  --directory=apps \
  --environments=staging,qa,dev

# Using inferred tasks (no project.json)
npx nx g @gridatek/nx-supabase:project my-api --skipProjectJson
```

**Environment Behavior:**

- **production** and **local** are always created by default
- Use `--environments` to add additional environments like staging, qa, dev, etc.
- If you specify `production` or `local` in `--environments`, they will be filtered out (no duplicates)

**Project Configuration:**

When `--skipProjectJson` is false (default), creates a `project.json` with:

```json
{
  "name": "my-supabase",
  "root": "my-supabase",
  "projectType": "application",
  "sourceRoot": "my-supabase"
}
```

Targets (build, start, stop, run-command) are inferred by the plugin, not explicitly defined.

---

## Executors

Executors are used to run tasks on your Supabase projects.

### build Executor

Builds environment configurations by merging production config with environment-specific files.

**Usage:**

```bash
npx nx run <project>:build
```

**Schema:**

```typescript
interface BuildExecutorSchema {
  // No options - configuration is derived from project structure
}
```

**Behavior:**

1. Locates the project root from Nx context
2. Finds all environment directories (excludes `.generated/` and hidden directories)
3. For each environment except production:
   - Cleans `.generated/<env>/` directory
   - Copies files from `production/` (base configuration)
   - Overlays files from `<env>/` (environment-specific overrides)
   - Skips `.gitkeep` files
4. Production environment is used directly from `production/` folder (not copied)

**Output:**

- `.generated/<env>/` for each non-production environment
- Cached by Nx for faster rebuilds

**Inputs (for caching):**

- All files in environment directories: `{projectRoot}/<env>/**/*`

**Outputs (for caching):**

- `{projectRoot}/.generated`

**Example:**

```bash
# Build all environments
npx nx run my-api:build

# Build with verbose logging
npx nx run my-api:build --verbose

# Clear cache and rebuild
npx nx run my-api:build --skip-nx-cache
```

**Notes:**

- Automatically runs before `start` target (via `dependsOn`)
- Uses Nx caching for fast incremental builds
- Safe to run multiple times (cleans before building)

---

### start Executor

Starts a Supabase instance using the Supabase CLI.

**Usage:**

```bash
npx nx run <project>:start [options]
```

**Schema:**

```typescript
interface StartExecutorSchema {
  env?: string;  // Default: 'local'
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--env` | `string` | `'local'` | Environment to use (local, production, staging, etc.) |

**Behavior:**

1. Runs `build` target first (via `dependsOn`)
2. Determines working directory:
   - Production: Uses `production/` directly
   - Other environments: Uses `.generated/<env>/`
3. Validates that `config.toml` exists
4. Executes `supabase start` in the appropriate directory
5. Streams output to console
6. Waits for process to complete

**Examples:**

```bash
# Start with default local environment
npx nx run my-api:start

# Start with production configuration
npx nx run my-api:start --env=production

# Start with staging environment
npx nx run my-api:start --env=staging
```

**Notes:**

- Requires Docker to be running
- First run may take several minutes to download Docker images
- Process runs in foreground by default
- Use `Ctrl+C` to stop, or use the `stop` target

**Error Handling:**

- Returns `{ success: false }` if environment directory doesn't exist
- Suggests running `build` target if `.generated/<env>` is missing
- Returns exit code from Supabase CLI

---

### stop Executor

Stops a running Supabase instance.

**Usage:**

```bash
npx nx run <project>:stop [options]
```

**Schema:**

```typescript
interface StopExecutorSchema {
  env?: string;  // Default: 'local'
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--env` | `string` | `'local'` | Environment to stop (local, production, staging, etc.) |

**Behavior:**

1. Determines working directory (same logic as `start`)
2. Validates environment exists
3. Executes `supabase stop --no-backup` in the appropriate directory
4. Streams output to console

**Examples:**

```bash
# Stop local environment
npx nx run my-api:stop

# Stop production environment
npx nx run my-api:stop --env=production
```

**Notes:**

- Uses `--no-backup` flag to avoid creating database dumps
- Safe to run even if Supabase is not running
- Stops Docker containers for the specific project

---

### run-command Executor

Runs any arbitrary Supabase CLI command in the appropriate environment context.

**Usage:**

```bash
npx nx run <project>:run-command --command="<supabase-command>" [options]
```

**Schema:**

```typescript
interface RunCommandExecutorSchema {
  command: string | string[];  // Required: Supabase CLI command to run
  env?: string;                // Default: 'local'
}
```

**Options:**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--command` | `string` or `string[]` | - | Yes | Supabase CLI command to execute |
| `--env` | `string` | `'local'` | No | Environment context (local, production, staging, etc.) |

**Behavior:**

1. Determines working directory based on environment
2. Validates environment directory and config exist
3. Parses command string (or joins array)
4. Executes command via `npx` in shell mode
5. Streams stdout/stderr to console
6. Returns success/failure based on exit code

**Examples:**

```bash
# Check status
npx nx run my-api:run-command --command="supabase status"

# Create a new migration
npx nx run my-api:run-command --command="supabase migration new create_users"

# Reset database
npx nx run my-api:run-command --command="supabase db reset"

# Generate TypeScript types
npx nx run my-api:run-command --command="supabase gen types typescript --local"

# Run migration up
npx nx run my-api:run-command --command="supabase db push"

# With specific environment
npx nx run my-api:run-command \
  --env=staging \
  --command="supabase db diff --use-migra"

# Array format (useful in project.json)
npx nx run my-api:run-command \
  --command="['supabase', 'migration', 'new', 'my_table']"
```

**Common Commands:**

| Command | Description |
|---------|-------------|
| `supabase status` | Show status of all services |
| `supabase start` | Start Supabase (prefer using `start` target) |
| `supabase stop` | Stop Supabase (prefer using `stop` target) |
| `supabase db reset` | Reset database to initial state |
| `supabase db push` | Apply pending migrations |
| `supabase db diff` | Show SQL diff |
| `supabase migration new <name>` | Create new migration |
| `supabase gen types typescript` | Generate TypeScript types |
| `supabase functions new <name>` | Create new Edge Function |
| `supabase link --project-ref <ref>` | Link to remote project |

**Notes:**

- Runs in shell mode, so shell operators (pipes, redirects) are supported
- Working directory is set to environment directory
- All Supabase CLI commands available
- Return value indicates success/failure of command

---

## Plugin Options

Configure the plugin behavior in `nx.json`.

**Schema:**

```typescript
interface SupabasePluginOptions {
  buildTargetName?: string;
  startTargetName?: string;
  stopTargetName?: string;
  runCommandTargetName?: string;
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `buildTargetName` | `string` | `'build'` | Name of the build target |
| `startTargetName` | `string` | `'start'` | Name of the start target |
| `stopTargetName` | `string` | `'stop'` | Name of the stop target |
| `runCommandTargetName` | `string` | `'run-command'` | Name of the run-command target |

**Example Configuration:**

```json
{
  "plugins": [
    {
      "plugin": "@gridatek/nx-supabase",
      "options": {
        "buildTargetName": "supabase-build",
        "startTargetName": "supabase-start",
        "stopTargetName": "supabase-stop",
        "runCommandTargetName": "supabase"
      }
    }
  ]
}
```

**Inferred Tasks:**

The plugin uses `createNodesV2` API to automatically infer tasks for projects that have a `production/config.toml` file.

**Detection Pattern:**

```
**/production/config.toml
```

**Inferred Target Configuration:**

For each detected project, the plugin creates:

```typescript
{
  build: {
    executor: '@gridatek/nx-supabase:build',
    cache: true,
    inputs: [
      '{projectRoot}/production/**/*',
      '{projectRoot}/local/**/*',
      '{projectRoot}/<other-envs>/**/*'
    ],
    outputs: ['{projectRoot}/.generated']
  },
  start: {
    executor: '@gridatek/nx-supabase:run-command',
    options: { command: 'supabase start' },
    dependsOn: ['build']
  },
  stop: {
    executor: '@gridatek/nx-supabase:run-command',
    options: { command: 'supabase stop --no-backup' }
  },
  'run-command': {
    executor: '@gridatek/nx-supabase:run-command'
  }
}
```

**Project Name Extraction:**

The plugin extracts the project name from `config.toml`:

```toml
project_id = "my-project-name"  # Used as Nx project name
```

This allows projects without `project.json` to be automatically detected and integrated into the Nx graph.

---

## Type Definitions

### ExecutorContext

Standard Nx executor context, provided by `@nx/devkit`:

```typescript
interface ExecutorContext {
  root: string;
  cwd: string;
  isVerbose: boolean;
  projectName?: string;
  projectsConfigurations?: {
    projects: Record<string, ProjectConfiguration>;
    version: number;
  };
  nxJsonConfiguration?: any;
  projectGraph?: ProjectGraph;
}
```

### Return Values

All executors return a Promise with success status:

```typescript
interface ExecutorResult {
  success: boolean;
}
```

---

## Error Codes

Common error scenarios and how to resolve them:

| Error | Cause | Solution |
|-------|-------|----------|
| "No project name found in context" | Executor called without valid project context | Ensure you're using `nx run <project>:target` |
| "Project not found" | Project name doesn't exist in workspace | Check project name with `nx show projects` |
| "Production directory not found" | Missing `production/` folder | Run project generator or create manually |
| "Environment 'X' not found" | Specified environment doesn't exist | Run `build` target or create environment directory |
| "Config file not found" | Missing `config.toml` in environment | Run `build` target or check config exists |
| "Supabase command failed with code X" | Supabase CLI error | Check Supabase CLI logs and Docker status |

---

## Advanced Usage

### Custom Target Configuration

Override inferred targets in `project.json`:

```json
{
  "name": "my-api",
  "targets": {
    "build": {
      "executor": "@gridatek/nx-supabase:build"
    },
    "start:dev": {
      "executor": "@gridatek/nx-supabase:run-command",
      "options": {
        "command": "supabase start",
        "env": "local"
      },
      "dependsOn": ["build"]
    },
    "migrate": {
      "executor": "@gridatek/nx-supabase:run-command",
      "options": {
        "command": "supabase db reset",
        "env": "local"
      }
    },
    "types": {
      "executor": "@gridatek/nx-supabase:run-command",
      "options": {
        "command": "supabase gen types typescript --local > types/database.ts"
      }
    }
  }
}
```

### Programmatic Usage

Use executors programmatically in scripts:

```typescript
import { ExecutorContext } from '@nx/devkit';
import buildExecutor from '@gridatek/nx-supabase/build';

async function customBuild(context: ExecutorContext) {
  const result = await buildExecutor({}, context);
  if (!result.success) {
    throw new Error('Build failed');
  }
}
```

---

For more examples and patterns, see [Best Practices](./best-practices.md) and [Advanced Usage](./advanced-usage.md).
