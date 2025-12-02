import {
  CreateNodesV2,
  CreateNodesContextV2,
  CreateNodesResultV2,
  ProjectConfiguration,
  TargetConfiguration,
} from '@nx/devkit';
import { dirname } from 'path';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface SupabasePluginOptions {
  buildTargetName?: string;
  startTargetName?: string;
  stopTargetName?: string;
  runCommandTargetName?: string;
}

/**
 * Detect Supabase projects by looking for 'default/config.toml'
 * This ensures we only match properly initialized Supabase projects
 */
export const createNodesV2: CreateNodesV2<SupabasePluginOptions> = [
  '**/default/config.toml',
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

  for (const configFile of configFiles) {
    // configFile is the path to 'default/config.toml'
    // We need to go 2 levels up to get the project root
    // e.g., 'my-supabase/default/config.toml' -> 'my-supabase'
    const projectRoot = dirname(dirname(configFile));

    // Verify the config file exists
    const configFullPath = join(context.workspaceRoot, configFile);
    if (!existsSync(configFullPath)) {
      continue;
    }

    // Get environment directories (all dirs except 'default', '.generated', and hidden dirs)
    const projectFullPath = join(context.workspaceRoot, projectRoot);
    let envDirs: string[] = [];

    try {
      const entries = readdirSync(projectFullPath, { withFileTypes: true });
      envDirs = entries
        .filter(
          (entry) =>
            entry.isDirectory() &&
            entry.name !== 'default' &&
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
          '{projectRoot}/default/**/*',
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
      },
      [runCommandTargetName]: {
        executor: '@gridatek/nx-supabase:run-command',
      },
    };

    // Add result for this config file
    results.push([
      configFile,
      {
        projects: {
          [projectRoot]: {
            root: projectRoot,
            targets,
          },
        },
      },
    ]);
  }

  return results;
}
