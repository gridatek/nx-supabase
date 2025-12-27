import {
  CreateNodesV2,
  CreateNodesContextV2,
  CreateNodesResultV2,
  TargetConfiguration,
} from '@nx/devkit';
import { dirname } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export interface SupabasePluginOptions {
  buildTargetName?: string;
  startTargetName?: string;
  stopTargetName?: string;
  runCommandTargetName?: string;
  statusTargetName?: string;
  dbResetTargetName?: string;
  dbPushTargetName?: string;
  dbPullTargetName?: string;
  genTypesTargetName?: string;
  migrationNewTargetName?: string;
  linkTargetName?: string;
  dbDiffTargetName?: string;
}

/**
 * Detect Supabase projects by looking for 'production/config.toml'
 * This ensures we only match properly initialized Supabase projects
 */
export const createNodesV2: CreateNodesV2<SupabasePluginOptions> = [
  '**/production/config.toml',
  (configFiles, options, context) =>
    createNodesInternal(configFiles, options, context),
];

async function createNodesInternal(
  configFiles: readonly string[],
  options: SupabasePluginOptions | undefined,
  context: CreateNodesContextV2
): Promise<CreateNodesResultV2> {
  const results: CreateNodesResultV2 = [];

  // Default target names (can be customized via options in nx.json)
  const buildTargetName = options?.buildTargetName ?? 'build';
  const startTargetName = options?.startTargetName ?? 'start';
  const stopTargetName = options?.stopTargetName ?? 'stop';
  const runCommandTargetName = options?.runCommandTargetName ?? 'run-command';
  const statusTargetName = options?.statusTargetName ?? 'status';
  const dbResetTargetName = options?.dbResetTargetName ?? 'db-reset';
  const dbPushTargetName = options?.dbPushTargetName ?? 'db-push';
  const dbPullTargetName = options?.dbPullTargetName ?? 'db-pull';
  const genTypesTargetName = options?.genTypesTargetName ?? 'gen-types';
  const migrationNewTargetName = options?.migrationNewTargetName ?? 'migration-new';
  const linkTargetName = options?.linkTargetName ?? 'link';
  const dbDiffTargetName = options?.dbDiffTargetName ?? 'db-diff';

  for (const configFile of configFiles) {
    // configFile is the path to 'production/config.toml'
    // We need to go 2 levels up to get the project root
    // e.g., 'my-supabase/production/config.toml' -> 'my-supabase'
    const projectRoot = dirname(dirname(configFile));

    // Verify the config file exists
    const configFullPath = join(context.workspaceRoot, configFile);
    if (!existsSync(configFullPath)) {
      continue;
    }

    // Get environment directories (all dirs except '.generated' and hidden dirs)
    // Note: 'production' is both the base config AND an environment
    const projectFullPath = join(context.workspaceRoot, projectRoot);
    let envDirs: string[] = [];

    try {
      const entries = readdirSync(projectFullPath, { withFileTypes: true });
      envDirs = entries
        .filter(
          (entry) =>
            entry.isDirectory() &&
            entry.name !== '.generated' &&
            !entry.name.startsWith('.')
        )
        .map((entry) => entry.name);
    } catch {
      // If we can't read the directory, skip this project
      continue;
    }

    // Create inferred targets
    const targets: Record<string, TargetConfiguration> = {
      [buildTargetName]: {
        executor: '@gridatek/nx-supabase:build',
        cache: true,
        inputs: [
          ...envDirs.map((env) => `{projectRoot}/${env}/**/*`),
        ],
        outputs: ['{projectRoot}/.generated'],
      },
      [startTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'supabase start',
        },
        dependsOn: [buildTargetName],
      },
      [stopTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'supabase stop --no-backup',
        },
        dependsOn: [buildTargetName],
      },
      [runCommandTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        dependsOn: [buildTargetName],
      },
      [statusTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'supabase status',
        },
        dependsOn: [buildTargetName],
      },
      [dbResetTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'supabase db reset',
        },
        dependsOn: [buildTargetName],
      },
      [dbPushTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'supabase db push',
        },
        dependsOn: [buildTargetName],
      },
      [dbPullTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'supabase db pull',
        },
        dependsOn: [buildTargetName],
      },
      [genTypesTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'supabase gen types typescript',
        },
        dependsOn: [buildTargetName],
      },
      [migrationNewTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        dependsOn: [buildTargetName],
      },
      [linkTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'supabase link',
        },
      },
      [dbDiffTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
        options: {
          command: 'supabase db diff',
        },
        dependsOn: [buildTargetName],
      },
    };

    // Extract project name from config.toml project_id
    let projectName: string | undefined;
    try {
      const configContent = readFileSync(configFullPath, 'utf-8');
      const projectIdMatch = configContent.match(/project_id\s*=\s*"([^"]+)"/);
      if (projectIdMatch && projectIdMatch[1]) {
        projectName = projectIdMatch[1];
      }
    } catch {
      // If we can't read the config, skip this project
      continue;
    }

    // If we couldn't extract a project name, skip this project
    if (!projectName) {
      continue;
    }

    // Add result for this config file
    results.push([
      configFile,
      {
        projects: {
          [projectRoot]: {
            name: projectName,
            root: projectRoot,
            targets,
          },
        },
      },
    ]);
  }

  return results;
}
