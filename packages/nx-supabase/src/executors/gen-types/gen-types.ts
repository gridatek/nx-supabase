import { ExecutorContext, logger } from '@nx/devkit';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { GenTypesExecutorSchema } from './schema';

const runExecutor = async (
  options: GenTypesExecutorSchema,
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
  const outputPath = options.outputPath || 'database.types.ts';
  const outputFile = join(context.root, outputPath);

  // Build the command arguments
  const commandArgs = ['supabase', 'gen', 'types', 'typescript'];

  if (options.projectId) {
    commandArgs.push('--project-id', options.projectId);
  } else {
    commandArgs.push('--local');
  }

  if (options.schema) {
    commandArgs.push('--schema', options.schema);
  }

  // Determine working directory - use local generated environment for local mode
  const envDir = join(projectRoot, '.generated', 'local', 'supabase');

  // Check if environment directory exists (only for local mode)
  if (!options.projectId && !existsSync(envDir)) {
    logger.error(`Local environment not found at ${envDir}`);
    logger.error(`Make sure you've run: nx run ${projectName}:build`);
    return { success: false };
  }

  logger.info(`Generating types for ${projectName}...`);
  if (options.projectId) {
    logger.info(`Using remote project: ${options.projectId}`);
  } else {
    logger.info(`Using local database`);
  }
  logger.info(`Output file: ${outputFile}`);
  logger.info('');

  return new Promise((resolve) => {
    let output = '';

    const supabase = spawn('npx', commandArgs, {
      cwd: options.projectId ? projectRoot : envDir,
      shell: true,
    });

    supabase.stdout?.on('data', (data) => {
      output += data.toString();
    });

    supabase.stderr?.on('data', (data) => {
      logger.error(data.toString());
    });

    supabase.on('exit', (code) => {
      if (code === 0) {
        // Ensure output directory exists
        const outputDir = dirname(outputFile);
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        // Write the generated types to file
        writeFileSync(outputFile, output);

        logger.info('');
        logger.info(`✅ Types generated successfully at ${outputFile}`);
        resolve({ success: true });
      } else {
        logger.error(`Type generation failed with code ${code}`);
        resolve({ success: false });
      }
    });

    supabase.on('error', (error) => {
      logger.error(`Failed to generate types: ${error.message}`);
      resolve({ success: false });
    });
  });
};

export default runExecutor;
