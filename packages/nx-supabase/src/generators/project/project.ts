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
  // by the plugin when it detects default/config.toml
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'application',
    sourceRoot: `${projectRoot}`,
  });

  // Create default directory structure
  const directories = [
    `${projectRoot}/default/migrations`,
    `${projectRoot}/default/seeds`,
    `${projectRoot}/.generated`,
  ];

  for (const dir of directories) {
    tree.write(`${dir}/.gitkeep`, '');
  }

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
├── default/               # Default/baseline environment
│   ├── config.toml        # Main Supabase configuration
│   ├── migrations/        # Default migrations
│   └── seeds/             # Default seeds
├── <env>/                 # Environment overrides (e.g., local, production)
│   ├── migrations/        # Environment-specific migrations (optional)
│   └── seeds/             # Environment-specific seeds (optional)
└── .generated/            # AUTO-GENERATED (never edit manually)
    └── <env>/             # Merged: default + environment overrides
        ├── config.toml
        ├── migrations/
        └── seeds/
\`\`\`

## How it Works

- **default/** - Your baseline Supabase configuration (config.toml, migrations, seeds)
- **<env>/** - Environment-specific overrides (empty by default, only add what's different)
- **.generated/** - Build output that merges default + environment overrides

## Usage

Build environment configurations (merges default and environment-specific files):
\`\`\`bash
nx run ${options.name}:build
\`\`\`

Start/Stop Supabase (convenient shortcuts):
\`\`\`bash
# Start Supabase (defaults to 'local' environment, runs build first)
nx run ${options.name}:start

# Start with specific environment
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
  const envList = (options.environments || 'local')
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

        // Write config.toml to the default directory
        const defaultConfigPath = join(absoluteProjectRoot, 'default', 'config.toml');
        const projectNameWithDefault = `${options.name}-default`;
        const configContent = configTemplate.replace(
          /project_id = "[^"]*"/,
          `project_id = "${projectNameWithDefault}"`
        );

        writeFileSync(defaultConfigPath, configContent, 'utf-8');

        // Clean up temporary supabase directory
        rmSync(join(tree.root, 'supabase'), { recursive: true, force: true });

        logger.info('✅ Default environment config created successfully!');
      } else {
        logger.warn('Could not find generated config.toml');
        logger.warn('Please create config.toml manually in the default directory');
      }
    } catch {
      logger.warn('Failed to run supabase init');
      logger.warn('Please create config.toml manually in the default directory');
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
