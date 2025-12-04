# Migration Guide

Guide for migrating existing Supabase projects to @gridatek/nx-supabase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Migration Strategies](#migration-strategies)
- [From Standalone Supabase](#from-standalone-supabase)
- [From Custom Nx Setup](#from-custom-nx-setup)
- [Troubleshooting](#troubleshooting)
- [Rollback Plan](#rollback-plan)

---

## Prerequisites

Before migrating, ensure you have:

- [x] Nx workspace (22+)
- [x] Node.js 18+
- [x] Docker installed and running
- [x] Existing Supabase project(s) backed up
- [x] Git repository with clean working tree

---

## Migration Strategies

### Strategy 1: In-Place Migration (Recommended)

Migrate your existing Supabase project structure to the plugin's conventions.

**Pros:**
- Preserves git history
- Minimal disruption
- Gradual adoption possible

**Cons:**
- Requires restructuring files

### Strategy 2: Fresh Start

Create new projects with the plugin and migrate database schema.

**Pros:**
- Clean structure from day one
- Easier to follow best practices

**Cons:**
- Loses git history
- More initial work

---

## From Standalone Supabase

### Current Structure

Typical standalone Supabase project:

```
my-project/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20240101000000_init.sql
│   │   └── 20240102000000_add_posts.sql
│   └── seed.sql
└── package.json
```

### Step 1: Install the Plugin

```bash
cd my-nx-workspace
npx nx add @gridatek/nx-supabase
```

### Step 2: Generate Project Structure

```bash
# Generate new project (creates folder structure)
npx nx g @gridatek/nx-supabase:project my-project

# Or if you want it in apps directory
npx nx g @gridatek/nx-supabase:project my-project --directory=apps
```

This creates:
```
my-project/                    # or apps/my-project/
├── production/
│   ├── config.toml
│   ├── migrations/
│   └── seeds/
├── local/
│   ├── migrations/
│   └── seeds/
├── .generated/
├── .gitignore
├── README.md
└── project.json
```

### Step 3: Migrate Files

```bash
# Backup original
cp -r old-project/supabase old-project/supabase.backup

# Copy config
cp old-project/supabase/config.toml my-project/production/config.toml

# Copy migrations
cp old-project/supabase/migrations/* my-project/production/migrations/

# Copy seeds (if you have seed.sql)
mv my-project/production/migrations/*seed* my-project/production/seeds/ 2>/dev/null || true
```

### Step 4: Update Configuration

Edit `my-project/production/config.toml`:

```toml
# Update project_id to match your naming convention
project_id = "my-project-production"

# Review all settings and adjust as needed
[api]
port = 54321

[db]
port = 54322
```

### Step 5: Test Migration

```bash
# Build
npx nx run my-project:build

# Start locally
npx nx run my-project:start

# Verify migrations applied
npx nx run my-project:run-command --command="supabase migration list"

# Test your application
# ... run your tests ...

# Stop when done
npx nx run my-project:stop
```

### Step 6: Clean Up

```bash
# If everything works, remove old structure
rm -rf old-project/supabase

# Update your application code to use new paths
# (If you were referencing supabase/ directly)
```

### Step 7: Update CI/CD

Update your CI/CD pipelines:

**Before:**
```yaml
- name: Start Supabase
  run: npx supabase start

- name: Run migrations
  run: npx supabase db reset
```

**After:**
```yaml
- name: Build Supabase
  run: npx nx run my-project:build

- name: Start Supabase
  run: npx nx run my-project:start

- name: Run migrations
  run: npx nx run my-project:run-command --command="supabase db reset"
```

---

## From Custom Nx Setup

### Current Structure

If you already have Supabase in an Nx workspace with custom setup:

```
apps/
  └── api/
      ├── supabase/
      │   ├── config.toml
      │   └── migrations/
      └── project.json  # Custom targets
```

### Step 1: Install Plugin

```bash
npx nx add @gridatek/nx-supabase
```

### Step 2: Restructure Project

```bash
cd apps/api

# Create production environment
mkdir -p production
mv supabase/config.toml production/
mv supabase/migrations production/
mv supabase/seeds production/ 2>/dev/null || mkdir production/seeds

# Create local environment
mkdir -p local/migrations
mkdir -p local/seeds

# Create .generated directory
mkdir -p .generated

# Clean up old supabase directory
rm -rf supabase
```

### Step 3: Update project.json

Replace custom targets with plugin targets (or remove for inferred tasks):

**Before:**
```json
{
  "name": "api",
  "targets": {
    "supabase:start": {
      "executor": "nx:run-commands",
      "options": {
        "command": "cd apps/api/supabase && supabase start"
      }
    },
    "supabase:stop": {
      "executor": "nx:run-commands",
      "options": {
        "command": "cd apps/api/supabase && supabase stop"
      }
    }
  }
}
```

**After (explicit targets):**
```json
{
  "name": "api",
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
    },
    "stop": {
      "executor": "@gridatek/nx-supabase:run-command",
      "options": {
        "command": "supabase stop --no-backup"
      }
    }
  }
}
```

**Or (inferred tasks - recommended):**

Remove the targets entirely and let the plugin infer them. The plugin will detect your project via `production/config.toml`.

### Step 4: Update Git Ignore

```gitignore
# Add to apps/api/.gitignore
.generated/
.supabase/
```

### Step 5: Test

```bash
# Build
npx nx run api:build

# Start
npx nx run api:start

# Verify
npx nx run api:run-command --command="supabase status"

# Stop
npx nx run api:stop
```

### Step 6: Update Scripts

Update any npm scripts or shell scripts:

**Before:**
```json
{
  "scripts": {
    "api:start": "cd apps/api/supabase && supabase start",
    "api:migrate": "cd apps/api/supabase && supabase db reset"
  }
}
```

**After:**
```json
{
  "scripts": {
    "api:start": "nx run api:start",
    "api:migrate": "nx run api:run-command --command='supabase db reset'"
  }
}
```

---

## Multiple Environments Migration

### Adding Environments to Existing Project

If you have separate projects for different environments:

**Before:**
```
apps/
  ├── api-local/
  │   └── supabase/
  ├── api-staging/
  │   └── supabase/
  └── api-prod/
      └── supabase/
```

**After:**
```
apps/
  └── api/
      ├── production/      # From api-prod
      ├── staging/         # From api-staging
      └── local/           # From api-local
```

### Migration Steps

```bash
# 1. Create unified project
npx nx g @gridatek/nx-supabase:project api --directory=apps

# 2. Migrate production (base config)
cp -r apps/api-prod/supabase/* apps/api/production/

# 3. Migrate staging (only differences)
# Compare configs and copy only what differs
diff apps/api-prod/supabase/config.toml apps/api-staging/supabase/config.toml > staging-diff.txt
# Manually create apps/api/staging/config.toml with only differences
cp apps/api-staging/supabase/migrations/* apps/api/staging/migrations/ 2>/dev/null || true

# 4. Migrate local (only differences)
diff apps/api-prod/supabase/config.toml apps/api-local/supabase/config.toml > local-diff.txt
# Manually create apps/api/local/config.toml with only differences
cp apps/api-local/supabase/migrations/* apps/api/local/migrations/ 2>/dev/null || true

# 5. Remove old projects
rm -rf apps/api-{prod,staging,local}
```

---

## Database Schema Migration

### Exporting Existing Schema

If you have a running Supabase project:

```bash
# Dump schema from remote project
npx supabase db dump --linked -f apps/api/production/migrations/20240101000000_initial_schema.sql

# Or from local
npx supabase db dump --local -f apps/api/production/migrations/20240101000000_initial_schema.sql
```

### Importing to New Project

```bash
# Apply to new project
npx nx run api:build
npx nx run api:start
npx nx run api:run-command --command="supabase db reset"
```

---

## Migrating Remote Projects

### Linking to Remote Supabase Project

```bash
# Link to remote project
npx nx run api:run-command \
  --env=production \
  --command="supabase link --project-ref YOUR_PROJECT_REF"

# Pull remote schema
npx nx run api:run-command \
  --env=production \
  --command="supabase db pull"

# This creates migration files in production/migrations/
```

### Pushing Local Changes to Remote

```bash
# Push migrations to remote
npx nx run api:run-command \
  --env=production \
  --command="supabase db push"
```

---

## Type Generation Migration

### Before

```json
{
  "scripts": {
    "types": "supabase gen types typescript --local > src/types/database.ts"
  }
}
```

### After

```json
{
  "scripts": {
    "types": "nx run api:run-command --command='supabase gen types typescript --local' > libs/types/src/database.ts"
  }
}
```

Or create a custom target:

```json
{
  "targets": {
    "generate-types": {
      "executor": "nx:run-commands",
      "options": {
        "command": "nx run api:run-command --command='supabase gen types typescript --local' > libs/types/src/database.ts"
      },
      "dependsOn": ["build"]
    }
  }
}
```

---

## Troubleshooting

### Issue: Migrations Not Found

**Problem:** "No migrations found in production/migrations/"

**Solution:**
```bash
# Check file locations
ls -la apps/api/production/migrations/

# Ensure files match pattern: YYYYMMDDHHMMSS_name.sql
# Rename if needed:
mv old_migration.sql 20240101000000_old_migration.sql
```

### Issue: Config Not Found

**Problem:** "Config file not found at production/config.toml"

**Solution:**
```bash
# Generate default config
npx supabase init

# Move to production directory
mv supabase/config.toml apps/api/production/

# Update project_id
sed -i 's/project_id = ".*"/project_id = "api-production"/' apps/api/production/config.toml
```

### Issue: Port Conflicts

**Problem:** "Port 54321 already in use"

**Solution:**
```bash
# Stop old Supabase instances
docker ps | grep supabase | awk '{print $1}' | xargs docker stop

# Or change port in config.toml
[api]
port = 54322
```

### Issue: Docker Issues

**Problem:** "Docker daemon not running"

**Solution:**
```bash
# Start Docker
# On macOS: open -a Docker

# Verify Docker is running
docker ps

# Reset Docker if needed
docker system prune -a
```

---

## Rollback Plan

If migration fails, you can rollback:

### Step 1: Stop New Setup

```bash
npx nx run api:stop
```

### Step 2: Restore Backup

```bash
# Restore from backup
cp -r old-project/supabase.backup old-project/supabase

# Or restore from git
git checkout HEAD -- old-project/supabase
```

### Step 3: Start Old Setup

```bash
cd old-project/supabase
npx supabase start
```

### Step 4: Investigate Issues

Review error logs and revisit migration steps.

---

## Post-Migration Checklist

- [ ] All migrations run successfully
- [ ] Application connects to Supabase
- [ ] Tests pass
- [ ] CI/CD updated
- [ ] Team documentation updated
- [ ] Old structure removed
- [ ] Git history clean (committed changes)
- [ ] Team members notified of changes

---

## Getting Help

If you encounter issues during migration:

1. Check the [API Reference](./api-reference.md)
2. Review [Best Practices](./best-practices.md)
3. Search [GitHub Issues](https://github.com/gridatek/nx-supabase/issues)
4. Create a new issue with:
   - Current structure
   - Attempted migration steps
   - Error messages
   - Nx version (`npx nx --version`)
   - Node version (`node --version`)

---

## Example: Complete Migration

### Before

```
my-app/
├── package.json
└── supabase/
    ├── config.toml
    ├── migrations/
    │   ├── 20240101_init.sql
    │   └── 20240102_posts.sql
    └── seed.sql
```

### After

```
my-workspace/
├── apps/
│   └── my-app/
│       ├── production/
│       │   ├── config.toml
│       │   ├── migrations/
│       │   │   ├── 20240101000000_init.sql
│       │   │   └── 20240102000000_posts.sql
│       │   └── seeds/
│       │       └── initial_data.sql
│       ├── local/
│       │   ├── migrations/
│       │   └── seeds/
│       │       └── dev_data.sql
│       ├── .generated/
│       ├── .gitignore
│       ├── README.md
│       └── project.json
├── nx.json
└── package.json
```

### Migration Commands

```bash
# 1. Create Nx workspace (if needed)
npx create-nx-workspace@latest my-workspace --preset=apps

# 2. Add plugin
cd my-workspace
npx nx add @gridatek/nx-supabase

# 3. Generate project
npx nx g @gridatek/nx-supabase:project my-app --directory=apps

# 4. Copy files
cp ../my-app/supabase/config.toml apps/my-app/production/
cp ../my-app/supabase/migrations/* apps/my-app/production/migrations/
cp ../my-app/supabase/seed.sql apps/my-app/production/seeds/initial_data.sql

# 5. Test
npx nx run my-app:build
npx nx run my-app:start
npx nx run my-app:run-command --command="supabase status"

# 6. Success! Clean up
rm -rf ../my-app/supabase
```

---

For ongoing usage, see the [Best Practices Guide](./best-practices.md).
