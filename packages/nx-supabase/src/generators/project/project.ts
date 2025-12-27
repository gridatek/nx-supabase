import {
  addProjectConfiguration,
  formatFiles,
  Tree,
  logger,
} from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ProjectGeneratorSchema } from './schema';

export async function projectGenerator(
  tree: Tree,
  options: ProjectGeneratorSchema
) {
  // Use directory if provided, otherwise default to project name
  const projectRoot = options.directory || options.name;

  // Check if directory already exists
  if (tree.exists(projectRoot)) {
    throw new Error(
      `Directory "${projectRoot}" already exists. ` +
      `Please choose a different name or directory, or remove the existing directory first.`
    );
  }

  logger.info(`Creating Supabase project at ${projectRoot}...`);

  // Add Nx project configuration (unless skipProjectJson is true)
  // Note: targets (build, start, stop, run-command) are automatically inferred
  // by the plugin when it detects production/config.toml
  if (!options.skipProjectJson) {
    addProjectConfiguration(tree, options.name, {
      root: projectRoot,
      projectType: 'application',
      sourceRoot: `${projectRoot}`,
    });
  } else {
    logger.info('Skipping project.json creation - project will be detected by inferred tasks plugin');
  }

  // Create .generated directory
  tree.write(`${projectRoot}/.generated/.gitkeep`, '');

  // Add .gitignore to ignore generated files
  tree.write(
    `${projectRoot}/.gitignore`,
    `.generated/
`
  );

  // Create README with structure explanation
  tree.write(
    `${projectRoot}/README.md`,
    `# ${options.name}

## Folder Structure

\`\`\`
${projectRoot}/
├── project.json           # Nx targets
├── production/            # Production environment (base configuration)
│   ├── config.toml        # Main Supabase configuration
│   ├── migrations/        # Production migrations
│   └── seeds/             # Production seeds
├── local/                 # Local development overrides
│   ├── migrations/        # Local-only migrations (optional)
│   └── seeds/             # Local-only seeds (optional)
└── .generated/            # AUTO-GENERATED (never edit manually)
    ├── production/        # Built production config
    └── local/             # Built local config (production + local overrides)
\`\`\`

## How it Works

- **production/** - Your production Supabase configuration (base config for all environments)
- **local/** - Local development overrides (empty by default, only add what's different from production)
- **.generated/** - Build output for all environments (merges production + env overrides to .generated/<env>/supabase/)

## Usage

Build environment configurations:
\`\`\`bash
nx run ${options.name}:build
\`\`\`

Start/Stop Supabase:
\`\`\`bash
# Start Supabase (defaults to 'local' environment, runs build first)
nx run ${options.name}:start

# Start with production environment
nx run ${options.name}:start --env=production

# Stop Supabase
nx run ${options.name}:stop
\`\`\`

Common Supabase commands:
\`\`\`bash
# Check status
nx run ${options.name}:status

# Reset database
nx run ${options.name}:db-reset

# Push migrations to remote
nx run ${options.name}:db-push

# Pull schema from remote
nx run ${options.name}:db-pull

# Generate TypeScript types
nx run ${options.name}:gen-types

# Create a new migration
nx run ${options.name}:migration-new --command="supabase migration new my_table"

# Link to remote project
nx run ${options.name}:link

# Show database diff
nx run ${options.name}:db-diff
\`\`\`

Run any Supabase CLI command:
\`\`\`bash
# Run any command not covered above
nx run ${options.name}:run-command --command="supabase functions new my-function"

# With specific environment
nx run ${options.name}:run-command --env=local --command="supabase db remote commit"
\`\`\`
`
  );

  // Always create production directory (base configuration)
  logger.info('Creating production environment (base configuration)...');
  tree.write(`${projectRoot}/production/migrations/.gitkeep`, '');
  tree.write(`${projectRoot}/production/seeds/.gitkeep`, '');

  // Always create local environment (default dev environment)
  logger.info('Creating local environment...');
  tree.write(`${projectRoot}/local/migrations/.gitkeep`, '');
  tree.write(`${projectRoot}/local/seeds/.gitkeep`, '');

  // Parse additional environments from comma-separated string (beyond production and local)
  const additionalEnvs = options.environments
    ? options.environments
        .split(',')
        .map(env => env.trim())
        .filter(env => env.length > 0 && env !== 'production' && env !== 'local') // Exclude production and local since they're always created
    : [];

  // Create each additional environment as empty directories
  for (const envName of additionalEnvs) {
    logger.info(`Creating ${envName} environment...`);
    const envDirectories = [
      `${projectRoot}/${envName}/migrations`,
      `${projectRoot}/${envName}/seeds`,
    ];

    for (const dir of envDirectories) {
      tree.write(`${dir}/.gitkeep`, '');
    }
  }

  // Build complete list of all environments for logging purposes
  const allEnvs = ['production', 'local', ...additionalEnvs];

  await formatFiles(tree);

  // Return combined callback
  return () => {
    const absoluteProjectRoot = join(tree.root, projectRoot);

    logger.info('Generating config template from supabase init...');

    const productionConfigPath = join(absoluteProjectRoot, 'production', 'config.toml');
    let configCreated = false;

    try {
      // Run supabase init once to get the config template
      execSync('npx supabase init', {
        cwd: tree.root,
        stdio: 'pipe'
      });

      const generatedConfigPath = join(tree.root, 'supabase', 'config.toml');

      if (existsSync(generatedConfigPath)) {
        const configTemplate = readFileSync(generatedConfigPath, 'utf-8');

        // Write config.toml to the production directory
        const projectNameWithProduction = `${options.name}-production`;
        const configContent = configTemplate.replace(
          /project_id = "[^"]*"/,
          `project_id = "${projectNameWithProduction}"`
        );

        // Ensure the production directory exists before writing
        const productionDir = join(absoluteProjectRoot, 'production');
        mkdirSync(productionDir, { recursive: true });

        writeFileSync(productionConfigPath, configContent, 'utf-8');

        // Clean up temporary supabase directory
        rmSync(join(tree.root, 'supabase'), { recursive: true, force: true });

        logger.info('✅ Production environment config created successfully!');
        configCreated = true;
      }
    } catch {
      logger.warn('Failed to run supabase init, creating minimal config.toml...');
    }

    // Create a minimal config.toml if supabase init failed
    if (!configCreated) {
      const templatePath = join(__dirname, 'files', 'config.toml.template');
      const configTemplate = readFileSync(templatePath, 'utf-8');
      const projectNameWithProduction = `${options.name}-production`;
      const configContent = configTemplate.replace(
        /__PROJECT_ID__/g,
        projectNameWithProduction
      );

      // Ensure the production directory exists before writing
      const productionDir = join(absoluteProjectRoot, 'production');
      mkdirSync(productionDir, { recursive: true });

      writeFileSync(productionConfigPath, configContent, 'utf-8');
      logger.info('✅ Created minimal config.toml (you can update it later)');
    }

    logger.info('');
    logger.info('✅ Supabase project created successfully!');
    logger.info('');
    logger.info(`Created with ${allEnvs.length} environment${allEnvs.length > 1 ? 's' : ''}: ${allEnvs.join(', ')}`);
    logger.info('');
    logger.info('Next steps:');
    logger.info(`  1. Start Supabase: nx run ${options.name}:start`);
    logger.info('');
    logger.info('Common commands:');
    logger.info(`  Status: nx run ${options.name}:status`);
    logger.info(`  Stop: nx run ${options.name}:stop`);
    logger.info(`  Reset DB: nx run ${options.name}:db-reset`);
    logger.info(`  Gen Types: nx run ${options.name}:gen-types`);
  };
}

export default projectGenerator;
