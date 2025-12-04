# Advanced Usage

Advanced patterns, customizations, and complex scenarios for @gridatek/nx-supabase.

## Table of Contents

- [Custom Executors](#custom-executors)
- [Dynamic Environments](#dynamic-environments)
- [Monorepo Sharing](#monorepo-sharing)
- [Custom Build Logic](#custom-build-logic)
- [Environment Variables](#environment-variables)
- [Docker Compose Integration](#docker-compose-integration)
- [Branch-based Environments](#branch-based-environments)
- [Custom Plugins](#custom-plugins)
- [Advanced Migration Patterns](#advanced-migration-patterns)
- [Performance Optimization](#performance-optimization)

---

## Custom Executors

### Creating Wrapper Executors

Create custom executors that wrap the built-in ones:

```typescript
// tools/executors/custom-start/executor.ts
import { ExecutorContext } from '@nx/devkit';
import runCommand from '@gridatek/nx-supabase/run-command';

export interface CustomStartExecutorSchema {
  env?: string;
  seed?: boolean;
}

export default async function customStartExecutor(
  options: CustomStartExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  // 1. Start Supabase
  const startResult = await runCommand(
    { command: 'supabase start', env: options.env },
    context
  );

  if (!startResult.success) {
    return { success: false };
  }

  // 2. Optionally run seeds
  if (options.seed) {
    const seedResult = await runCommand(
      { command: 'supabase db reset', env: options.env },
      context
    );

    if (!seedResult.success) {
      return { success: false };
    }
  }

  // 3. Custom post-start logic
  console.log('✅ Supabase started and ready!');

  return { success: true };
}
```

Register in `executors.json`:

```json
{
  "executors": {
    "custom-start": {
      "implementation": "./tools/executors/custom-start/executor",
      "schema": "./tools/executors/custom-start/schema.json"
    }
  }
}
```

---

## Dynamic Environments

### Per-Developer Environments

Create personalized environments for each developer:

```bash
# Generate developer-specific environment
DEVELOPER_NAME=$(whoami)
mkdir -p my-api/$DEVELOPER_NAME
cp -r my-api/local/* my-api/$DEVELOPER_NAME/

# Start with personal environment
npx nx run my-api:build
npx nx run my-api:start --env=$DEVELOPER_NAME
```

### Feature Branch Environments

Automate environment creation for feature branches:

```typescript
// tools/scripts/create-branch-env.ts
import { execSync } from 'child_process';
import { mkdirSync, cpSync } from 'fs';
import { join } from 'path';

const branchName = execSync('git branch --show-current')
  .toString()
  .trim()
  .replace(/[^a-z0-9-]/gi, '-');

const projectRoot = 'apps/my-api';
const envDir = join(projectRoot, branchName);

// Create environment from local template
mkdirSync(envDir, { recursive: true });
cpSync(
  join(projectRoot, 'local'),
  envDir,
  { recursive: true }
);

console.log(`Created environment: ${branchName}`);
console.log(`Start with: nx run my-api:start --env=${branchName}`);
```

Add to `package.json`:

```json
{
  "scripts": {
    "create-branch-env": "tsx tools/scripts/create-branch-env.ts"
  }
}
```

---

## Monorepo Sharing

### Shared Database Schema

Share database schema across multiple Supabase projects:

```
libs/
  └── database-schema/
      ├── tables/
      │   ├── users.sql
      │   ├── posts.sql
      │   └── comments.sql
      ├── functions/
      │   └── trigger_set_updated_at.sql
      └── policies/
          └── rls_policies.sql

apps/
  ├── api/
  │   └── production/
  │       └── migrations/
  │           └── 20240101000000_init.sql  # Includes from libs/
  └── admin/
      └── production/
          └── migrations/
              └── 20240101000000_init.sql  # Includes from libs/
```

Migration that includes shared schema:

```sql
-- apps/api/production/migrations/20240101000000_init.sql

-- Include shared schema
\ir ../../../../libs/database-schema/tables/users.sql
\ir ../../../../libs/database-schema/tables/posts.sql
\ir ../../../../libs/database-schema/functions/trigger_set_updated_at.sql
\ir ../../../../libs/database-schema/policies/rls_policies.sql

-- Project-specific additions
CREATE TABLE api_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Cross-Project Type Generation

Generate types from multiple projects into a shared library:

```typescript
// libs/shared-types/generate-types.ts
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const projects = ['api', 'admin', 'analytics'];

for (const project of projects) {
  // Start project
  execSync(`nx run ${project}:start`, { stdio: 'inherit' });

  // Generate types
  const types = execSync(
    `nx run ${project}:run-command --command="supabase gen types typescript --local"`,
    { encoding: 'utf-8' }
  );

  // Write to shared library
  writeFileSync(
    `libs/shared-types/src/${project}-database.ts`,
    types
  );

  // Stop project
  execSync(`nx run ${project}:stop`, { stdio: 'inherit' });
}
```

---

## Custom Build Logic

### Build Hooks

Add pre/post build hooks:

```typescript
// tools/executors/build-with-hooks/executor.ts
import { ExecutorContext, logger } from '@nx/devkit';
import buildExecutor from '@gridatek/nx-supabase/build';
import { execSync } from 'child_process';
import { join } from 'path';

export default async function buildWithHooks(
  options: any,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectConfig = context.projectsConfigurations?.projects[context.projectName!];
  const projectRoot = join(context.root, projectConfig!.root);

  // Pre-build hook
  logger.info('Running pre-build hook...');
  try {
    execSync(`node ${join(projectRoot, 'scripts/pre-build.js')}`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
  } catch (error) {
    logger.error('Pre-build hook failed');
    return { success: false };
  }

  // Run actual build
  const buildResult = await buildExecutor(options, context);

  if (!buildResult.success) {
    return { success: false };
  }

  // Post-build hook
  logger.info('Running post-build hook...');
  try {
    execSync(`node ${join(projectRoot, 'scripts/post-build.js')}`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
  } catch (error) {
    logger.error('Post-build hook failed');
    return { success: false };
  }

  return { success: true };
}
```

### Conditional File Merging

Implement custom merge logic for specific file types:

```typescript
// tools/utils/custom-merge.ts
import { readFileSync, writeFileSync } from 'fs';
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml';

export function mergeTomlFiles(
  baseFile: string,
  overrideFile: string,
  outputFile: string
): void {
  const base = parseToml(readFileSync(baseFile, 'utf-8'));
  const override = parseToml(readFileSync(overrideFile, 'utf-8'));

  // Deep merge
  const merged = deepMerge(base, override);

  writeFileSync(outputFile, stringifyToml(merged));
}

function deepMerge(target: any, source: any): any {
  const output = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }

  return output;
}
```

---

## Environment Variables

### Template Substitution

Use environment variables in config files:

```toml
# production/config.toml
[auth.external.google]
enabled = true
client_id = "{{GOOGLE_CLIENT_ID}}"
client_secret = "{{GOOGLE_CLIENT_SECRET}}"

[db]
host = "{{DB_HOST}}"
port = {{DB_PORT}}
```

Build-time substitution script:

```typescript
// tools/scripts/substitute-env-vars.ts
import { readFileSync, writeFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

export function substituteEnvVars(filePath: string): void {
  let content = readFileSync(filePath, 'utf-8');

  // Replace {{VAR_NAME}} with process.env.VAR_NAME
  content = content.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    const value = process.env[varName];
    if (!value) {
      throw new Error(`Environment variable ${varName} not found`);
    }
    return value;
  });

  writeFileSync(filePath, content);
}
```

Integrate with build:

```json
{
  "targets": {
    "build": {
      "executor": "@nx/run-commands",
      "options": {
        "commands": [
          "tsx tools/scripts/substitute-env-vars.ts",
          "nx run my-api:build"
        ]
      }
    }
  }
}
```

---

## Docker Compose Integration

### Multi-Service Setup

Integrate Supabase with other services:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Let Supabase CLI manage its services
  # We just add complementary services

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
```

Update `config.toml`:

```toml
[storage]
backend = "s3"
s3_region = "us-east-1"
s3_endpoint = "http://localhost:9000"
```

---

## Branch-based Environments

### Automatic Environment Creation

GitHub Actions workflow for branch environments:

```yaml
name: Branch Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  create-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create branch environment
        run: |
          BRANCH_NAME=$(echo "${{ github.head_ref }}" | sed 's/[^a-zA-Z0-9-]/-/g')
          mkdir -p apps/my-api/$BRANCH_NAME

          # Copy from staging template
          cp -r apps/my-api/staging/* apps/my-api/$BRANCH_NAME/

          # Customize for this branch
          echo "# Branch: $BRANCH_NAME" >> apps/my-api/$BRANCH_NAME/README.md

      - name: Build and start
        run: |
          BRANCH_NAME=$(echo "${{ github.head_ref }}" | sed 's/[^a-zA-Z0-9-]/-/g')
          npx nx run my-api:build
          npx nx run my-api:start --env=$BRANCH_NAME &

      - name: Run tests
        run: |
          BRANCH_NAME=$(echo "${{ github.head_ref }}" | sed 's/[^a-zA-Z0-9-]/-/g')
          SUPABASE_URL=http://localhost:54321 \
          SUPABASE_ENV=$BRANCH_NAME \
          npm test

      - name: Cleanup
        if: always()
        run: |
          BRANCH_NAME=$(echo "${{ github.head_ref }}" | sed 's/[^a-zA-Z0-9-]/-/g')
          npx nx run my-api:stop --env=$BRANCH_NAME
```

---

## Custom Plugins

### Plugin Extension

Extend the plugin with custom behavior:

```typescript
// tools/plugins/custom-supabase-plugin.ts
import {
  CreateNodesV2,
  CreateNodesContextV2,
  TargetConfiguration
} from '@nx/devkit';
import { createNodesV2 as baseCreateNodesV2 } from '@gridatek/nx-supabase/plugins';

export const createNodesV2: CreateNodesV2 = [
  '**/production/config.toml',
  async (configFiles, options, context) => {
    // Get base results from original plugin
    const [pattern, handler] = baseCreateNodesV2;
    const baseResults = await handler(configFiles, options, context);

    // Enhance with custom targets
    for (const [configFile, result] of baseResults) {
      if (result.projects) {
        for (const [projectRoot, projectConfig] of Object.entries(result.projects)) {
          // Add custom targets
          projectConfig.targets = {
            ...projectConfig.targets,
            'db-backup': createBackupTarget(projectRoot),
            'db-restore': createRestoreTarget(projectRoot),
          };
        }
      }
    }

    return baseResults;
  }
];

function createBackupTarget(projectRoot: string): TargetConfiguration {
  return {
    executor: '@nx/run-commands',
    options: {
      command: `pg_dump -h localhost -U postgres -d postgres > ${projectRoot}/backups/$(date +%Y%m%d-%H%M%S).sql`
    }
  };
}

function createRestoreTarget(projectRoot: string): TargetConfiguration {
  return {
    executor: '@nx/run-commands',
    options: {
      command: `psql -h localhost -U postgres -d postgres < ${projectRoot}/backups/latest.sql`
    }
  };
}
```

Register in `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "./tools/plugins/custom-supabase-plugin",
      "options": {}
    }
  ]
}
```

---

## Advanced Migration Patterns

### Migration Dependencies

Ensure migrations run in order across projects:

```json
// apps/api/project.json
{
  "targets": {
    "migrate": {
      "executor": "@gridatek/nx-supabase:run-command",
      "options": {
        "command": "supabase db push"
      },
      "dependsOn": [
        {
          "target": "migrate",
          "projects": "dependencies"
        }
      ]
    }
  }
}
```

### Reversible Migrations

Create up/down migrations:

```sql
-- migrations/up/20240101000000_add_posts.sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- migrations/down/20240101000000_add_posts.sql
DROP TABLE IF EXISTS posts;
```

Custom migration runner:

```typescript
// tools/scripts/run-migration.ts
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

interface MigrationOptions {
  direction: 'up' | 'down';
  version: string;
  project: string;
}

export function runMigration(options: MigrationOptions): void {
  const { direction, version, project } = options;
  const sqlFile = `apps/${project}/migrations/${direction}/${version}.sql`;

  const sql = readFileSync(sqlFile, 'utf-8');

  execSync(
    `nx run ${project}:run-command --command="supabase db execute '${sql}'"`,
    { stdio: 'inherit' }
  );
}
```

---

## Performance Optimization

### Parallel Builds

Build multiple projects in parallel:

```json
{
  "scripts": {
    "build:all": "nx run-many --target=build --all --parallel=3"
  }
}
```

### Incremental Builds

Only rebuild changed environments:

```typescript
// tools/scripts/smart-build.ts
import { execSync } from 'child_process';
import { statSync } from 'fs';

const projects = ['api', 'admin', 'analytics'];

for (const project of projects) {
  const productionMtime = statSync(`apps/${project}/production`).mtimeMs;
  const generatedMtime = statSync(`apps/${project}/.generated`).mtimeMs;

  if (productionMtime > generatedMtime) {
    console.log(`Building ${project}...`);
    execSync(`nx run ${project}:build`, { stdio: 'inherit' });
  } else {
    console.log(`${project} is up to date`);
  }
}
```

### Caching Strategy

Optimize Nx caching:

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "cache": true,
      "inputs": [
        "{projectRoot}/production/**/*",
        "{projectRoot}/*/config.toml"
      ],
      "outputs": ["{projectRoot}/.generated"]
    }
  }
}
```

---

## Database Sharding

### Multi-Database Setup

Run multiple Supabase instances:

```bash
# Project 1 - Main database
npx nx run api:start --env=local

# Project 2 - Analytics database
npx nx run analytics:start --env=local
```

Configure different ports:

```toml
# apps/api/local/config.toml
[api]
port = 54321

# apps/analytics/local/config.toml
[api]
port = 54322
```

---

## Monitoring and Observability

### Custom Health Checks

```typescript
// tools/scripts/health-check.ts
import { execSync } from 'child_process';

interface HealthCheckResult {
  project: string;
  status: 'healthy' | 'unhealthy';
  services: Record<string, boolean>;
}

export async function checkHealth(project: string): Promise<HealthCheckResult> {
  try {
    const status = execSync(
      `nx run ${project}:run-command --command="supabase status"`,
      { encoding: 'utf-8' }
    );

    const services = parseStatus(status);

    return {
      project,
      status: Object.values(services).every(v => v) ? 'healthy' : 'unhealthy',
      services
    };
  } catch (error) {
    return {
      project,
      status: 'unhealthy',
      services: {}
    };
  }
}

function parseStatus(output: string): Record<string, boolean> {
  const lines = output.split('\n');
  const services: Record<string, boolean> = {};

  for (const line of lines) {
    if (line.includes('running')) {
      const serviceName = line.split(':')[0].trim();
      services[serviceName] = true;
    }
  }

  return services;
}
```

---

## Troubleshooting Advanced Scenarios

### Port Conflicts

Run multiple projects with dynamic ports:

```typescript
// tools/utils/port-manager.ts
import { execSync } from 'child_process';

let nextPort = 54321;

export function getAvailablePort(): number {
  while (true) {
    try {
      execSync(`lsof -i:${nextPort}`, { stdio: 'ignore' });
      nextPort++;
    } catch {
      return nextPort++;
    }
  }
}
```

### Resource Cleanup

Clean up Docker resources:

```bash
# Stop all Supabase containers
docker ps | grep supabase | awk '{print $1}' | xargs docker stop

# Remove all Supabase volumes
docker volume ls | grep supabase | awk '{print $2}' | xargs docker volume rm

# Clean up networks
docker network ls | grep supabase | awk '{print $2}' | xargs docker network rm
```

---

For more examples and best practices, see [Best Practices](./best-practices.md).

For API details, see [API Reference](./api-reference.md).
