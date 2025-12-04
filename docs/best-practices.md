# Best Practices

Recommended patterns and workflows for using @gridatek/nx-supabase effectively.

## Table of Contents

- [Project Structure](#project-structure)
- [Environment Management](#environment-management)
- [Migrations](#migrations)
- [Seed Data](#seed-data)
- [Version Control](#version-control)
- [CI/CD](#cicd)
- [Multi-Project Monorepos](#multi-project-monorepos)
- [Performance](#performance)
- [Security](#security)
- [Testing](#testing)

---

## Project Structure

### Organize by Feature

For large projects, organize migrations and seeds by feature:

```
my-api/
├── production/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20240101000000_create_auth_tables.sql
│   │   ├── 20240101000001_create_user_profiles.sql
│   │   ├── 20240102000000_create_posts_tables.sql
│   │   └── 20240102000001_create_comments_tables.sql
│   └── seeds/
│       ├── 01_auth_roles.sql
│       ├── 02_test_users.sql
│       └── 03_sample_posts.sql
└── local/
    └── seeds/
        └── dev_data.sql
```

### Use Descriptive Names

**Good:**
```
20240115120000_add_email_verification_to_users.sql
20240115130000_create_notifications_table.sql
```

**Bad:**
```
001.sql
migration.sql
update.sql
```

### Separate Concerns

Keep different types of changes in separate migrations:

- **Schema changes** - Tables, columns, indexes
- **Data migrations** - Moving or transforming data
- **Permission changes** - RLS policies, grants

---

## Environment Management

### Production as Base

**Always** use production as your base configuration:

```
production/
  ├── config.toml          # Base config
  ├── migrations/          # All production migrations
  └── seeds/               # Production seed data (lookups, etc.)

local/
  ├── config.toml          # Only override what's different for local
  └── seeds/               # Additional test data for local dev
```

### Minimal Overrides

Only override what's necessary in environment-specific directories:

**production/config.toml:**
```toml
[api]
port = 54321
max_rows = 1000

[db]
pooler_enabled = true
```

**local/config.toml (BAD - full copy):**
```toml
[api]
port = 54321        # Unnecessary duplication
max_rows = 1000     # Unnecessary duplication

[db]
pooler_enabled = false  # Only this should be here!
```

**local/config.toml (GOOD - minimal override):**
```toml
[db]
pooler_enabled = false  # Only what's different
```

### Environment Naming

Use clear, consistent environment names:

**Recommended:**
- `production` - Production environment
- `local` - Local development
- `staging` - Pre-production testing
- `qa` - Quality assurance
- `dev` - Shared development environment

**Avoid:**
- `prod`, `prd` (use full `production`)
- `test` (ambiguous - testing what?)
- `tmp`, `temp` (temporary environments should be properly named)

---

## Migrations

### Writing Migrations

#### Always Use Transactions

Wrap migrations in transactions when possible:

```sql
BEGIN;

-- Your migration here
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;

-- Always include rollback instructions in comments
-- ROLLBACK: ALTER TABLE users DROP COLUMN email_verified;

COMMIT;
```

#### Make Migrations Idempotent

Design migrations that can safely run multiple times:

```sql
-- Good: Check existence before creating
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  display_name TEXT
);

-- Good: Check before adding column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;
END $$;
```

#### Add Indexes Concurrently

For large tables in production:

```sql
-- Good: Non-blocking index creation
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_posts_user_id ON posts(user_id);

-- Bad: Blocks table during index creation
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

#### Document Complex Migrations

Add comments explaining the why:

```sql
-- Migration: Add soft delete support
-- Reason: Business requirement to retain deleted records for audit
-- Impact: No breaking changes, deleted_at defaults to NULL
-- Rollback: See ROLLBACK comment at end

ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMP;

CREATE INDEX idx_posts_deleted_at
  ON posts(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ROLLBACK:
-- DROP INDEX idx_posts_deleted_at;
-- ALTER TABLE posts DROP COLUMN deleted_at;
```

### Migration Workflow

#### Local Development

```bash
# 1. Create migration
npx nx run my-api:run-command \
  --command="supabase migration new add_user_roles"

# 2. Edit the migration file
# (Edit production/migrations/XXXXXX_add_user_roles.sql)

# 3. Apply locally
npx nx run my-api:build
npx nx run my-api:run-command --command="supabase db reset"

# 4. Test the migration
# Run your tests

# 5. Commit if successful
git add production/migrations/
git commit -m "feat: add user roles table"
```

#### Staging/Production

```bash
# 1. Deploy migrations
npx nx run my-api:run-command \
  --env=production \
  --command="supabase db push"

# 2. Verify deployment
npx nx run my-api:run-command \
  --env=production \
  --command="supabase migration list"
```

---

## Seed Data

### Types of Seed Data

#### Reference Data (Production)

Data that's required for the application to function:

```sql
-- production/seeds/01_roles.sql
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('user', 'Regular user'),
  ('moderator', 'Can moderate content')
ON CONFLICT (name) DO NOTHING;
```

#### Test Data (Local/Staging)

Data for development and testing:

```sql
-- local/seeds/dev_users.sql
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'user@test.com')
ON CONFLICT DO NOTHING;
```

### Seed Data Best Practices

1. **Use ON CONFLICT** - Make seeds idempotent
2. **Order matters** - Use numeric prefixes for seed files
3. **Separate by concern** - One seed file per logical group
4. **Don't seed in production** - Use migrations for required data
5. **Use realistic data** - Test data should mirror production patterns

---

## Version Control

### What to Commit

**DO commit:**
- ✅ `production/` directory (all files)
- ✅ `local/` and other environment directories
- ✅ `project.json` (if not using `--skipProjectJson`)
- ✅ `README.md`
- ✅ `.gitignore`

**DON'T commit:**
- ❌ `.generated/` directory (build output)
- ❌ `.supabase/` directory (if created)
- ❌ Docker volumes
- ❌ Local config overrides with secrets

### .gitignore Template

```gitignore
# Generated build outputs
.generated/

# Supabase local files
.supabase/
.branches/

# Environment variables (if using)
.env.local
.env.*.local

# OS files
.DS_Store
Thumbs.db
```

### Commit Messages

Follow conventional commits:

```bash
# Features
git commit -m "feat(my-api): add user authentication"

# Migrations
git commit -m "feat(my-api): add posts and comments tables"

# Fixes
git commit -m "fix(my-api): correct RLS policy for posts"

# Config changes
git commit -m "chore(my-api): update pooler settings"
```

---

## CI/CD

### GitHub Actions Workflow

```yaml
name: Supabase CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Supabase projects
        run: npx nx run-many --target=build --all

      - name: Start Supabase
        run: |
          npx nx run my-api:start &
          sleep 30  # Wait for services to be ready

      - name: Run migrations
        run: npx nx run my-api:run-command --command="supabase db reset"

      - name: Generate types
        run: npx nx run my-api:run-command --command="supabase gen types typescript"

      - name: Run tests
        run: npx nx test my-api

      - name: Cleanup
        if: always()
        run: npx nx run my-api:stop

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Deploy to Staging
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.STAGING_PROJECT_ID }}
        run: |
          npx nx run my-api:run-command \
            --env=staging \
            --command="supabase link --project-ref $SUPABASE_PROJECT_ID"
          npx nx run my-api:run-command \
            --env=staging \
            --command="supabase db push"
```

### Deployment Strategy

1. **Migrations First** - Always deploy migrations before application code
2. **Backwards Compatible** - Ensure migrations don't break existing code
3. **Rollback Plan** - Document how to rollback each migration
4. **Staging First** - Test migrations in staging before production

### Environment Variables in CI

```yaml
env:
  # Supabase CLI
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  # Project-specific
  SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
  SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

---

## Multi-Project Monorepos

### Project Organization

```
apps/
  ├── api/              # Backend API (Supabase project)
  ├── admin/            # Admin dashboard (Supabase project)
  └── web/              # Frontend app
libs/
  ├── shared-types/     # Shared TypeScript types
  └── database-utils/   # Shared database utilities
```

### Shared Types Generation

Create a shared library for database types:

```json
// libs/shared-types/project.json
{
  "name": "shared-types",
  "targets": {
    "generate-types": {
      "executor": "nx:run-commands",
      "options": {
        "commands": [
          "npx nx run api:run-command --command='supabase gen types typescript --local' > libs/shared-types/src/database.ts",
          "npx nx run admin:run-command --command='supabase gen types typescript --local' > libs/shared-types/src/admin-database.ts"
        ],
        "parallel": false
      },
      "dependsOn": ["api:build", "admin:build"]
    }
  }
}
```

### Running Multiple Projects

```bash
# Start all Supabase projects
npx nx run-many --target=start --all

# Build specific projects
npx nx run-many --target=build --projects=api,admin

# Run command across all projects
npx nx run-many --target=run-command --all --command="supabase status"
```

---

## Performance

### Build Performance

1. **Use Nx Caching** - Let Nx cache your builds
2. **Minimal Environment Overrides** - Less files to copy = faster builds
3. **Skip Unnecessary Builds** - Use `--skip-nx-cache` sparingly

### Runtime Performance

1. **Connection Pooling** - Enable in `config.toml`:
   ```toml
   [db]
   pooler_enabled = true
   pooler_mode = "transaction"
   ```

2. **Index Strategically** - Add indexes based on query patterns
3. **Optimize Seeds** - Use batch inserts for large seed data

---

## Security

### Secrets Management

**Never commit secrets:**

```toml
# ❌ BAD - Don't commit secrets
[auth.external.google]
client_id = "actual-client-id"
client_secret = "actual-secret"

# ✅ GOOD - Use environment variables
[auth.external.google]
client_id = "env(GOOGLE_CLIENT_ID)"
client_secret = "env(GOOGLE_CLIENT_SECRET)"
```

### RLS Policies

Always implement Row Level Security:

```sql
-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own posts
CREATE POLICY "Users can view their own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own posts
CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Environment Isolation

Keep environments isolated:

- Different API keys per environment
- Separate Supabase projects for prod/staging/dev
- Use Nx's environment-specific configuration

---

## Testing

### Database Testing

```typescript
import { createClient } from '@supabase/supabase-js';

describe('Posts API', () => {
  let supabase;

  beforeAll(async () => {
    // Connect to local Supabase
    supabase = createClient(
      'http://localhost:54321',
      'your-anon-key'
    );

    // Reset database
    // npx nx run my-api:run-command --command="supabase db reset"
  });

  it('should create a post', async () => {
    const { data, error } = await supabase
      .from('posts')
      .insert({ title: 'Test Post', content: 'Test Content' })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toHaveProperty('id');
  });

  afterAll(async () => {
    // Cleanup if needed
  });
});
```

### Migration Testing

```bash
# Test migration forward
npx nx run my-api:run-command --command="supabase db reset"

# Test rollback (if you have down migrations)
# npx nx run my-api:run-command --command="supabase migration revert"
```

### Integration Tests

```typescript
describe('Full flow integration test', () => {
  it('should handle user registration and post creation', async () => {
    // 1. Register user
    const { data: authData } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123'
    });

    // 2. Create post as new user
    const { data: post } = await supabase
      .from('posts')
      .insert({ title: 'First Post' })
      .select()
      .single();

    expect(post.user_id).toBe(authData.user?.id);
  });
});
```

---

## Common Patterns

### Generated Types Workflow

```bash
# 1. Update schema via migration
npx nx run my-api:run-command \
  --command="supabase migration new add_comments"

# 2. Apply migration
npx nx run my-api:build
npx nx run my-api:run-command --command="supabase db reset"

# 3. Generate TypeScript types
npx nx run my-api:run-command \
  --command="supabase gen types typescript --local > libs/types/src/database.ts"

# 4. Use in application
import { Database } from '@myorg/types';
type Post = Database['public']['Tables']['posts']['Row'];
```

### Multi-Stage Deployments

```bash
# 1. Deploy to staging
npx nx run my-api:run-command \
  --env=staging \
  --command="supabase db push"

# 2. Run smoke tests against staging
npm run test:staging

# 3. If successful, deploy to production
npx nx run my-api:run-command \
  --env=production \
  --command="supabase db push"
```

---

## Troubleshooting

### Build Issues

**Problem:** "Production directory not found"
```bash
# Solution: Ensure project structure is correct
ls -la my-api/production/
```

**Problem:** ".generated folder has stale files"
```bash
# Solution: Clear cache and rebuild
rm -rf my-api/.generated
npx nx run my-api:build --skip-nx-cache
```

### Runtime Issues

**Problem:** "Config file not found"
```bash
# Solution: Run build first
npx nx run my-api:build
```

**Problem:** "Docker not running"
```bash
# Solution: Start Docker
# Check with: docker ps
```

### Migration Issues

**Problem:** "Migration already applied"
```bash
# Solution: Check migration status
npx nx run my-api:run-command --command="supabase migration list"

# If needed, reset local database
npx nx run my-api:run-command --command="supabase db reset"
```

---

For more detailed API documentation, see [API Reference](./api-reference.md).

For advanced scenarios, see [Advanced Usage](./advanced-usage.md).
