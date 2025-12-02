import { ExecutorContext, logger } from '@nx/devkit';
import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { SupabaseExecutorSchema } from './schema';

const runExecutor = async (
  options: SupabaseExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> => {
  const projectName = context.projectName;
  if (!projectName) {
    logger.error('No project name found in context');
    return { success: false };
  }

  const projectConfig = context.projectsConfigurations?.projects[projectName];
  if (!projectConfig) {
    logger.error(`Project ${projectName} not found`);
    return { success: false };
  }

  const projectRoot = join(context.root, projectConfig.root);

  // Convert command to string if it's an array
  const commandString = Array.isArray(options.command)
    ? options.command.join(' ')
    : options.command;

  // Split command string into array for spawn
  const commandArgs = commandString.split(' ');

  // Determine working directory based on whether env is specified
  let cwd = projectRoot;
  if (options.env) {
    const envGeneratedDir = join(projectRoot, '.generated', options.env);

    // Check if environment exists
    if (!existsSync(envGeneratedDir)) {
      logger.error(`Environment '${options.env}' not found at ${envGeneratedDir}`);
      logger.error(`Make sure you've run: nx run ${projectName}:build`);
      return { success: false };
    }

    const configPath = join(envGeneratedDir, 'config.toml');
    if (!existsSync(configPath)) {
      logger.error(`Config file not found at ${configPath}`);
      return { success: false };
    }

    cwd = envGeneratedDir;
    logger.info(`Running Supabase command for ${projectName} (${options.env})...`);
    logger.info(`Using config: ${configPath}`);
  } else {
    logger.info(`Running Supabase command for ${projectName}...`);
  }

  logger.info(`Command: supabase ${commandString}`);
  logger.info('');

  return new Promise((resolve) => {
    const supabase = spawn('npx', ['supabase', ...commandArgs], {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    supabase.on('exit', (code) => {
      if (code === 0) {
        logger.info('');
        logger.info('✅ Supabase command completed successfully!');
        resolve({ success: true });
      } else {
        logger.error(`Supabase command failed with code ${code}`);
        resolve({ success: false });
      }
    });

    supabase.on('error', (error) => {
      logger.error(`Failed to run Supabase command: ${error.message}`);
      resolve({ success: false });
    });
  });
};

export default runExecutor;
