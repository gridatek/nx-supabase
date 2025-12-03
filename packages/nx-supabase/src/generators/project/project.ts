import {
  addProjectConfiguration,
  formatFiles,
  Tree,
  logger,
} from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ProjectGeneratorSchema } from './schema';

export async function projectGenerator(
  tree: Tree,
  options: ProjectGeneratorSchema
) {
  const projectRoot = options.directory
    ? `${options.directory}/${options.name}`
    : options.name;

  logger.info(`Creating Supabase project at ${projectRoot}...`);

  // Add Nx project configuration
  // Note: targets (build, start, stop, run-command) are automatically inferred
  // by the plugin when it detects production/config.toml
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'application',
    sourceRoot: `${projectRoot}`,
  });

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
- **.generated/** - Build output. For production: copies production/. For other envs: merges production + env overrides

## Usage

Build environment configurations:
\`\`\`bash
nx run ${options.name}:build
\`\`\`

Start/Stop Supabase (convenient shortcuts):
\`\`\`bash
# Start Supabase (defaults to 'local' environment, runs build first)
nx run ${options.name}:start

# Start with production environment
nx run ${options.name}:start --env=production

# Stop Supabase
nx run ${options.name}:stop
\`\`\`

Run other Supabase commands:
\`\`\`bash
# Check status
nx run ${options.name}:run-command --command="supabase status"

# Create migration
nx run ${options.name}:run-command --command="supabase migration new my_table"

# Run any Supabase CLI command
nx run ${options.name}:run-command --env=local --command="supabase db reset"
\`\`\`
`
  );

  // Parse environments from comma-separated string
  // Default to both local and production environments
  const envList = (options.environments || 'local,production')
    .split(',')
    .map(env => env.trim())
    .filter(env => env.length > 0);

  // Create each environment as empty directories
  for (const envName of envList) {
    logger.info(`Creating ${envName} environment...`);
    const envDirectories = [
      `${projectRoot}/${envName}/migrations`,
      `${projectRoot}/${envName}/seeds`,
    ];

    for (const dir of envDirectories) {
      tree.write(`${dir}/.gitkeep`, '');
    }
  }

  await formatFiles(tree);

  // Return combined callback
  return () => {
    const absoluteProjectRoot = join(tree.root, projectRoot);

    logger.info('Generating config template from supabase init...');

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
        const productionConfigPath = join(absoluteProjectRoot, 'production', 'config.toml');
        const projectNameWithProduction = `${options.name}-production`;
        const configContent = configTemplate.replace(
          /project_id = "[^"]*"/,
          `project_id = "${projectNameWithProduction}"`
        );

        writeFileSync(productionConfigPath, configContent, 'utf-8');

        // Clean up temporary supabase directory
        rmSync(join(tree.root, 'supabase'), { recursive: true, force: true });

        logger.info('✅ Production environment config created successfully!');
      } else {
        logger.warn('Could not find generated config.toml');
        logger.warn('Please create config.toml manually in the production directory');
      }
    } catch {
      logger.warn('Failed to run supabase init');
      logger.warn('Please create config.toml manually in the production directory');
    }

    logger.info('');
    logger.info('✅ Supabase project created successfully!');
    logger.info('');
    logger.info(`Created with ${envList.length} environment${envList.length > 1 ? 's' : ''}: ${envList.join(', ')}`);
    logger.info('');
    logger.info('Next steps:');
    logger.info(`  1. Start Supabase: nx run ${options.name}:start`);
    logger.info('');
    logger.info('Other commands:');
    logger.info(`  Stop: nx run ${options.name}:stop`);
    logger.info(`  Status: nx run ${options.name}:run-command --command="supabase status"`);
  };
}

export default projectGenerator;
