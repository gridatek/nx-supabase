import {
  addDependenciesToPackageJson,
  formatFiles,
  Tree,
  logger,
  GeneratorCallback,
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
        supabase: '^2.0.0',
      }
    );

    logger.info('Added Supabase CLI to devDependencies');
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
    logger.info('  2. Start Supabase: nx start my-project --env=local');
    logger.info('');
  };
}

export default initGenerator;
