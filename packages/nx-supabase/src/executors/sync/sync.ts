import { ExecutorContext, logger } from '@nx/devkit';
import { existsSync, readdirSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { SyncExecutorSchema } from './schema';

const runExecutor = async (
  options: SyncExecutorSchema,
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
  const commonDir = join(projectRoot, 'common');
  const generatedDir = join(projectRoot, '.generated');

  // Check if common directory exists
  if (!existsSync(commonDir)) {
    logger.error(`Common directory not found at ${commonDir}`);
    return { success: false };
  }

  // Find all environment directories (exclude common and .generated)
  const entries = readdirSync(projectRoot, { withFileTypes: true });
  const envDirs = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name !== 'common' &&
        entry.name !== '.generated' &&
        !entry.name.startsWith('.')
    )
    .map((entry) => entry.name);

  if (envDirs.length === 0) {
    logger.warn('No environment directories found');
    return { success: true };
  }

  logger.info(`Found environments: ${envDirs.join(', ')}`);

  // Sync each environment
  for (const env of envDirs) {
    const envDir = join(projectRoot, env);
    const envGeneratedDir = join(generatedDir, env);

    logger.info(`Syncing ${env} environment...`);

    // Clean and recreate generated directory for this environment
    if (existsSync(envGeneratedDir)) {
      rmSync(envGeneratedDir, { recursive: true, force: true });
    }
    mkdirSync(envGeneratedDir, { recursive: true });

    // Copy common files first
    syncDirectory(commonDir, envGeneratedDir);

    // Copy environment-specific files (overwrites common files if they exist)
    syncDirectory(envDir, envGeneratedDir);

    logger.info(`✓ Synced ${env} to .generated/${env}`);
  }

  logger.info('');
  logger.info('✅ All environments synced successfully!');
  logger.info(`   Synced ${envDirs.length} environment${envDirs.length > 1 ? 's' : ''}`);

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
