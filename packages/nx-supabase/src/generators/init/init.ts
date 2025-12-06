import {
  addDependenciesToPackageJson,
  formatFiles,
  Tree,
  logger,
  GeneratorCallback,
  readNxJson,
  updateNxJson,
} from '@nx/devkit';
import { InitGeneratorSchema } from './schema';

export async function initGenerator(
  tree: Tree,
  options: InitGeneratorSchema
): Promise<GeneratorCallback | void> {
  logger.info('Initializing @gridatek/nx-supabase plugin...');

  let installTask: GeneratorCallback | undefined;

  if (!options.skipPackageJson) {
    // Add Supabase CLI as a dev dependency
    installTask = addDependenciesToPackageJson(
      tree,
      {},
      {
        supabase: '^2.65.6',
      }
    );

    logger.info('Added Supabase CLI to devDependencies');
  }

  // Register the inferred tasks plugin in nx.json
  const nxJson = readNxJson(tree);
  if (nxJson) {
    nxJson.plugins = nxJson.plugins || [];

    // Check if plugin is already registered
    const pluginExists = nxJson.plugins.some(
      (p) =>
        p === '@gridatek/nx-supabase' ||
        (typeof p === 'object' && p.plugin === '@gridatek/nx-supabase')
    );

    if (!pluginExists) {
      nxJson.plugins.push('@gridatek/nx-supabase');
      updateNxJson(tree, nxJson);
      logger.info('Registered @gridatek/nx-supabase plugin in nx.json');
    }
  }

  await formatFiles(tree);

  return () => {
    if (installTask) {
      installTask();
    }

    logger.info('');
    logger.info('✅ @gridatek/nx-supabase plugin initialized successfully!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('  1. Create a Supabase project: nx g @gridatek/nx-supabase:project my-project');
    logger.info('  2. Start Supabase: nx run my-project:start --env=local');
    logger.info('');
  };
}

export default initGenerator;
