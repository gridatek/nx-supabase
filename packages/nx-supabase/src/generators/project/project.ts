import {
  addProjectConfiguration,
  formatFiles,
  Tree,
  logger,
} from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { ProjectGeneratorSchema } from './schema';
import { environmentGenerator } from '../environment/environment';

export async function projectGenerator(
  tree: Tree,
  options: ProjectGeneratorSchema
) {
  const projectRoot = options.directory
    ? `${options.directory}/${options.name}`
    : options.name;

  logger.info(`Creating Supabase project at ${projectRoot}...`);

  // Add Nx project configuration
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'application',
    sourceRoot: `${projectRoot}`,
    targets: {
      build: {
        executor: '@gridatek/nx-supabase:build',
      },
      start: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'start',
        },
        dependsOn: ['build'],
      },
      stop: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'stop',
        },
      },
      supabase: {
        executor: '@gridatek/nx-supabase:run-command',
      },
    },
  });

  // Create common directory structure
  const directories = [
    `${projectRoot}/common/migrations`,
    `${projectRoot}/common/seeds`,
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
├── common/                # Shared across ALL environments
│   ├── migrations/        # Common migrations
│   └── seeds/            # Common seeds
├── <env>/                # Environment-specific (e.g., local, production)
│   ├── config.toml
│   ├── migrations/
│   └── seeds/
└── .generated/           # AUTO-GENERATED (never edit manually)
    └── <env>/            # Merged: common + environment
        ├── config.toml
        ├── migrations/
        └── seeds/
\`\`\`

## Usage

Build environment configurations (merges common and environment-specific files):
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
nx run ${options.name}:supabase --command=status

# Create migration
nx run ${options.name}:supabase --command="migration new my_table"

# Run any Supabase CLI command
nx run ${options.name}:supabase --env=local --command="db reset"
\`\`\`

Create additional environments:
\`\`\`bash
nx g @gridatek/nx-supabase:environment --project=${options.name} --name=production
\`\`\`
`
  );

  await formatFiles(tree);

  // Parse environments from comma-separated string
  const envList = (options.environments || 'local')
    .split(',')
    .map(env => env.trim())
    .filter(env => env.length > 0);

  // Create each environment using the environment generator
  const envCallbacks: ((configTemplate?: string) => void)[] = [];

  for (const envName of envList) {
    logger.info(`Creating ${envName} environment...`);
    const envCallback = await environmentGenerator(tree, {
      project: options.name,
      name: envName,
    });

    if (envCallback) {
      envCallbacks.push(envCallback);
    }
  }

  // Return combined callback
  return () => {
    logger.info('Generating config template from supabase init...');

    let configTemplate: string | undefined;

    try {
      // Run supabase init once to get the config template
      execSync('npx supabase init', {
        cwd: tree.root,
        stdio: 'pipe'
      });

      const generatedConfigPath = join(tree.root, 'supabase', 'config.toml');

      if (existsSync(generatedConfigPath)) {
        configTemplate = readFileSync(generatedConfigPath, 'utf-8');
        rmSync(join(tree.root, 'supabase'), { recursive: true, force: true });
      } else {
        logger.warn('Could not find generated config.toml');
      }
    } catch {
      logger.warn('Failed to run supabase init, will fallback to individual runs');
    }

    // Run all environment generator callbacks with the shared config template
    for (const callback of envCallbacks) {
      callback(configTemplate);
    }

    logger.info('');
    logger.info('✅ Supabase project created successfully!');
    logger.info('');
    logger.info(`Created with ${envList.length} environment${envList.length > 1 ? 's' : ''}: ${envList.join(', ')}`);
    logger.info('');
    logger.info('Next steps:');
    logger.info(`  1. Start Supabase: nx run ${options.name}:start`);
    if (envList.length === 1) {
      logger.info(`  2. Create another environment: nx g @gridatek/nx-supabase:environment --project=${options.name} --name=production`);
    }
    logger.info('');
    logger.info('Other commands:');
    logger.info(`  Stop: nx run ${options.name}:stop`);
    logger.info(`  Status: nx run ${options.name}:supabase --command=status`);
  };
}

export default projectGenerator;
