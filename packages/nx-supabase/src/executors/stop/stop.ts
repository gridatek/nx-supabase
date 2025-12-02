import { ExecutorContext, logger } from '@nx/devkit';
import { join } from 'path';
import { spawn } from 'child_process';
import { StopExecutorSchema } from './schema';

const runExecutor = async (
  options: StopExecutorSchema,
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

  logger.info(`Stopping Supabase for ${projectName}...`);

  return new Promise((resolve) => {
    // Run supabase stop from project root
    const supabase = spawn('npx', ['supabase', 'stop'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
    });

    supabase.on('exit', (code) => {
      if (code === 0) {
        logger.info('');
        logger.info('✅ Supabase stopped successfully!');
        resolve({ success: true });
      } else {
        logger.error(`Supabase stop failed with code ${code}`);
        resolve({ success: false });
      }
    });

    supabase.on('error', (error) => {
      logger.error(`Failed to stop Supabase: ${error.message}`);
      resolve({ success: false });
    });
  });
};

export default runExecutor;
