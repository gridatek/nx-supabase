import { ExecutorContext, logger } from '@nx/devkit';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join } from 'node:path';
import { Client } from 'pg';
import { LoadDbFunctionsExecutorSchema } from './schema';

const runExecutor = async (
  options: LoadDbFunctionsExecutorSchema,
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
  const env = options.env || 'local';
  const envDir = join(projectRoot, '.generated', env, 'supabase');

  const functionsDir = resolveFunctionsDir(options.functionsDir, context.root, envDir);
  if (!existsSync(functionsDir)) {
    logger.error(`Functions directory not found: ${functionsDir}`);
    return { success: false };
  }

  const files = readdirSync(functionsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(functionsDir, f));

  if (files.length === 0) {
    logger.info(`No SQL files in ${functionsDir}`);
    return { success: true };
  }

  let dbUrl: string | undefined = options.dbUrl ?? process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    dbUrl = resolveDbUrlFromSupabaseStatus(envDir);
  }
  if (!dbUrl) {
    logger.error(
      'Could not determine database URL. Pass --dbUrl, set $SUPABASE_DB_URL, or ensure supabase is running for the local environment.'
    );
    return { success: false };
  }

  logger.info(`Loading DB functions for ${projectName} (${env})`);
  logger.info(`From: ${functionsDir}`);
  logger.info(`Files: ${files.length}`);
  logger.info('');

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
  } catch (err) {
    logger.error(`Failed to connect to database: ${(err as Error).message}`);
    return { success: false };
  }

  try {
    for (const file of files) {
      logger.info(`→ loading ${basename(file)}`);
      const sql = readFileSync(file, 'utf8');
      await client.query(sql);
    }
    logger.info('');
    logger.info(`✅ Loaded ${files.length} function file${files.length > 1 ? 's' : ''}`);
    return { success: true };
  } catch (err) {
    logger.error(`Failed: ${(err as Error).message}`);
    return { success: false };
  } finally {
    await client.end();
  }
};

function resolveFunctionsDir(
  override: string | undefined,
  workspaceRoot: string,
  envDir: string
): string {
  if (!override) {
    return join(envDir, 'db_functions');
  }
  return isAbsolute(override) ? override : join(workspaceRoot, override);
}

function resolveDbUrlFromSupabaseStatus(envDir: string): string | undefined {
  if (!existsSync(envDir)) return undefined;
  try {
    const output = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
      cwd: envDir,
      encoding: 'utf8',
    });
    const match = output.match(/^DB_URL="(.+)"$/m);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export default runExecutor;
