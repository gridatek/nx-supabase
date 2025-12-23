import { ExecutorContext, logger } from '@nx/devkit';
import { existsSync, readdirSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { BuildExecutorSchema } from './schema';

const runExecutor = async (
  options: BuildExecutorSchema,
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
  const productionDir = join(projectRoot, 'production');
  const generatedDir = join(projectRoot, '.generated');

  // Check if production directory exists
  if (!existsSync(productionDir)) {
    logger.error(`Production directory not found at ${productionDir}`);
    return { success: false };
  }

  // Find all environment directories (exclude .generated and hidden dirs)
  // Production is both the base config AND an environment
  const entries = readdirSync(projectRoot, { withFileTypes: true });
  const envDirs = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name !== '.generated' &&
        !entry.name.startsWith('.')
    )
    .map((entry) => entry.name);

  if (envDirs.length === 0) {
    logger.warn('No environment directories found');
    return { success: true };
  }

  logger.info(`Found environments: ${envDirs.join(', ')}`);

  // Build each environment (excluding production, which is used directly)
  const envsToBuild = envDirs.filter(env => env !== 'production');

  if (envsToBuild.length === 0) {
    logger.info('No environments to build (production is used directly)');
    return { success: true };
  }

  for (const env of envsToBuild) {
    const envDir = join(projectRoot, env);
    const envGeneratedDir = join(generatedDir, env);
    const supabaseDir = join(envGeneratedDir, 'supabase');

    logger.info(`Building ${env} environment...`);

    // Clean and recreate generated directory for this environment
    if (existsSync(envGeneratedDir)) {
      rmSync(envGeneratedDir, { recursive: true, force: true });
    }
    mkdirSync(supabaseDir, { recursive: true });

    // Merge production (base) + environment-specific files
    // Copy production files first (base config)
    syncDirectory(productionDir, supabaseDir);

    // Copy environment-specific files (overwrites production files if they exist)
    syncDirectory(envDir, supabaseDir);

    logger.info(`✓ Built ${env} to .generated/${env}/supabase`);
  }

  logger.info('');
  logger.info('✅ All environments built successfully!');
  logger.info(`   Built ${envsToBuild.length} environment${envsToBuild.length > 1 ? 's' : ''}`);
  logger.info(`   Production environment uses production/ directly`);

  return { success: true };
};

/**
 * Recursively copies files from source to destination
 */
function syncDirectory(source: string, destination: string): void {
  if (!existsSync(source)) {
    return;
  }

  const entries = readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(source, entry.name);
    const destPath = join(destination, entry.name);

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      syncDirectory(sourcePath, destPath);
    } else if (entry.isFile()) {
      // Skip .gitkeep files
      if (basename(entry.name) === '.gitkeep') {
        continue;
      }
      copyFileSync(sourcePath, destPath);
    }
  }
}

export default runExecutor;
