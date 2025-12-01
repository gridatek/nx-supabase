import {
  addProjectConfiguration,
  formatFiles,
  Tree,
  logger,
} from '@nx/devkit';
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
      start: {
        executor: '@gridatek/nx-supabase:start',
      },
      stop: {
        executor: '@gridatek/nx-supabase:stop',
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

Start Supabase for an environment:
\`\`\`bash
nx start ${options.name} --env=local
\`\`\`

Stop Supabase:
\`\`\`bash
nx stop ${options.name}
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
  const envCallbacks: (() => void)[] = [];

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
    // Run all environment generator callbacks to create configs
    for (const callback of envCallbacks) {
      callback();
    }

    logger.info('');
    logger.info('✅ Supabase project created successfully!');
    logger.info('');
    logger.info(`Created with ${envList.length} environment${envList.length > 1 ? 's' : ''}: ${envList.join(', ')}`);
    logger.info('');
    logger.info('Next steps:');
    logger.info(`  1. Start Supabase: nx start ${options.name} --env=${envList[0]}`);
    if (envList.length === 1) {
      logger.info(`  2. Create another environment: nx g @gridatek/nx-supabase:environment --project=${options.name} --name=production`);
    }
  };
}

export default projectGenerator;
