# @gridatek/nx-supabase

Nx plugin for Supabase integration - Manage multiple Supabase projects and environments in your Nx monorepo.

## Features

- ✨ Multi-environment support (production, local, staging, custom)
- 🔧 Convention over configuration with automatic project detection
- 🚀 Simple generators and executors for common workflows
- 📦 Built specifically for Nx monorepos
- 🔄 Environment merging with base configuration
- ⚡ Intelligent caching for fast builds

## Quick Start

### Installation

```bash
npx nx add @gridatek/nx-supabase
```

This automatically:
- Installs the plugin
- Adds Supabase CLI to devDependencies
- Registers the plugin in nx.json

### Create a Project

```bash
npx nx g @gridatek/nx-supabase:project my-api
```

### Start Using Supabase

```bash
# Build configurations
npx nx run my-api:build

# Start locally
npx nx run my-api:start

# Run Supabase commands
npx nx run my-api:run-command --command="supabase status"

# Stop
npx nx run my-api:stop
```

## Project Structure

```
my-api/
├── production/          # Base configuration
│   ├── config.toml
│   ├── migrations/
│   └── seeds/
├── local/               # Local overrides
│   ├── migrations/
│   └── seeds/
├── .generated/          # Build output
└── project.json         # Nx configuration
```

## Available Commands

### Generators

- `project` - Create new Supabase project
- `init` - Initialize plugin (runs automatically)

### Executors

- `build` - Build environment configurations
- `start` - Start Supabase instance
- `stop` - Stop Supabase instance
- `run-command` - Run any Supabase CLI command

## Usage Examples

### Multiple Environments

```bash
# Create with additional environments
npx nx g @gridatek/nx-supabase:project my-api \
  --environments=staging,qa

# Start with specific environment
npx nx run my-api:start --env=staging
```

### Common Workflows

```bash
# Create migration
npx nx run my-api:run-command \
  --command="supabase migration new create_users"

# Reset database
npx nx run my-api:run-command \
  --command="supabase db reset"

# Generate TypeScript types
npx nx run my-api:run-command \
  --command="supabase gen types typescript --local"
```

### Multi-Project Monorepo

```bash
# Build all projects
npx nx run-many --target=build --all

# Start multiple projects
npx nx run-many --target=start --projects=api,admin

# Stop all
npx nx run-many --target=stop --all
```

## Configuration

### Plugin Options (nx.json)

```json
{
  "plugins": [
    {
      "plugin": "@gridatek/nx-supabase",
      "options": {
        "buildTargetName": "build",
        "startTargetName": "start",
        "stopTargetName": "stop",
        "runCommandTargetName": "run-command"
      }
    }
  ]
}
```

### Inferred Tasks

Projects are automatically detected by `production/config.toml`. Use `--skipProjectJson` to skip creating `project.json` and rely entirely on inferred tasks.

```bash
npx nx g @gridatek/nx-supabase:project my-api --skipProjectJson
```

## Environment Management

### How It Works

1. **production/** - Base configuration used by all environments
2. **Additional Environments** - Merged with production config
3. **Build Process**:
   - Production: Used directly (no copying)
   - Others: Built to `.generated/<env>` with merged files

### Environment Overrides

Only include files that differ from production:

```
production/
  ├── config.toml          # Full config
  └── migrations/          # All migrations

staging/
  └── config.toml          # Only differences
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: CI
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - run: npm ci
      - run: npx nx run my-api:build
      - run: npx nx run my-api:start
      - run: npx nx run my-api:run-command --command="supabase db reset"
      - run: npm test
      - run: npx nx run my-api:stop
```

## Requirements

- Node.js 18+
- Nx 22+
- Docker (for local development)

## Documentation

- [Full Documentation](https://github.com/gridatek/nx-supabase#readme)
- [API Reference](https://github.com/gridatek/nx-supabase/blob/main/docs/api-reference.md)
- [Best Practices](https://github.com/gridatek/nx-supabase/blob/main/docs/best-practices.md)
- [Advanced Usage](https://github.com/gridatek/nx-supabase/blob/main/docs/advanced-usage.md)
- [Migration Guide](https://github.com/gridatek/nx-supabase/blob/main/docs/migration-guide.md)

## Support

- [Report Issues](https://github.com/gridatek/nx-supabase/issues)
- [Discussions](https://github.com/gridatek/nx-supabase/discussions)
- Email: support@gridatek.com

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](https://github.com/gridatek/nx-supabase/blob/main/CONTRIBUTING.md).

## License

MIT © [GridaTek](https://github.com/gridatek)

## Acknowledgments

Built on [Nx](https://nx.dev) and [Supabase](https://supabase.com).
