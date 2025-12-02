import { ExecutorContext, logger } from '@nx/devkit';
import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { StartExecutorSchema } from './schema';

const runExecutor = async (
  options: StartExecutorSchema,
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

  logger.info(`Starting Supabase for ${projectName} (${options.env})...`);
  logger.info(`Using config: ${configPath}`);

  return new Promise((resolve) => {
    const supabase = spawn('npx', ['supabase', 'start'], {
      cwd: envGeneratedDir,
      stdio: 'inherit',
      shell: true,
    });

    supabase.on('exit', (code) => {
      if (code === 0) {
        logger.info('');
        logger.info('✅ Supabase started successfully!');
        logger.info(`   Environment: ${options.env}`);
        logger.info('');
        logger.info(`To stop: nx run ${projectName}:stop`);
        resolve({ success: true });
      } else {
        logger.error(`Supabase start failed with code ${code}`);
        resolve({ success: false });
      }
    });

    supabase.on('error', (error) => {
      logger.error(`Failed to start Supabase: ${error.message}`);
      resolve({ success: false });
    });
  });
};

export default runExecutor;
