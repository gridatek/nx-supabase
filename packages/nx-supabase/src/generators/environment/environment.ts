import {
  formatFiles,
  Tree,
  logger,
  readProjectConfiguration,
} from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { EnvironmentGeneratorSchema } from './schema';

export async function environmentGenerator(
  tree: Tree,
  options: EnvironmentGeneratorSchema
) {
  // Get the project configuration
  const projectConfig = readProjectConfiguration(tree, options.project);
  const projectRoot = projectConfig.root;

  logger.info(`Creating environment '${options.name}' for project '${options.project}'...`);

  // Create environment-specific directories
  const directories = [
    `${projectRoot}/${options.name}/migrations`,
    `${projectRoot}/${options.name}/seeds`,
  ];

  for (const dir of directories) {
    tree.write(`${dir}/.gitkeep`, '');
  }

  await formatFiles(tree);

  // Return callback to generate config.toml
  return () => {
    logger.info('Generating config.toml from supabase init...');

    const absoluteProjectRoot = join(tree.root, projectRoot);

    try {
      // Run supabase init to get default config
      execSync('npx supabase init', {
        cwd: tree.root,
        stdio: 'pipe'
      });

      // Read the generated config.toml
      const generatedConfigPath = join(tree.root, 'supabase', 'config.toml');

      if (existsSync(generatedConfigPath)) {
        let configContent = readFileSync(generatedConfigPath, 'utf-8');

        // Update project_id to projectname-env format
        const projectNameWithEnv = `${options.project}-${options.name}`;
        configContent = configContent.replace(
          /project_id = "[^"]*"/,
          `project_id = "${projectNameWithEnv}"`
        );

        // Write to environment config.toml using fs (not tree, since this is a callback)
        const envConfigPath = join(absoluteProjectRoot, options.name, 'config.toml');
        writeFileSync(envConfigPath, configContent, 'utf-8');

        // Clean up the supabase directory created by init
        rmSync(join(tree.root, 'supabase'), { recursive: true, force: true });

        logger.info(`✅ Environment '${options.name}' created successfully!`);
        logger.info(`   Project ID: ${projectNameWithEnv}`);
      } else {
        logger.warn('Could not find generated config.toml, please run manually:');
        logger.warn(`  npx supabase init`);
        logger.warn(`  Then move config.toml to ${projectRoot}/${options.name}/config.toml`);
      }
    } catch (error) {
      logger.warn('Failed to run supabase init automatically.');
      logger.warn('Please run manually:');
      logger.warn(`  npx supabase init`);
      logger.warn(`  Then move config.toml to ${projectRoot}/${options.name}/config.toml`);
    }
  };
}

export default environmentGenerator;
