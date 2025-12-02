import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readJson } from '@nx/devkit';

import { initGenerator } from './init';
import { InitGeneratorSchema } from './schema';

describe('init generator', () => {
  let tree: Tree;
  const options: InitGeneratorSchema = {};

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should add supabase CLI to devDependencies', async () => {
    await initGenerator(tree, options);
    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.devDependencies['supabase']).toBeDefined();
    expect(packageJson.devDependencies['supabase']).toBe('^2.0.0');
  });

  it('should skip package.json update when skipPackageJson is true', async () => {
    const optionsWithSkip: InitGeneratorSchema = {
      skipPackageJson: true,
    };
    await initGenerator(tree, optionsWithSkip);
    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.devDependencies?.['supabase']).toBeUndefined();
  });

  it('should return a callback function', async () => {
    const result = await initGenerator(tree, options);
    expect(typeof result).toBe('function');
  });
});
