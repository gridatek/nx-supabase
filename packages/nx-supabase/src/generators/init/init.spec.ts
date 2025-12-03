import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readJson, readNxJson } from '@nx/devkit';

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

  it('should register the plugin in nx.json', async () => {
    await initGenerator(tree, options);
    const nxJson = readNxJson(tree);
    expect(nxJson?.plugins).toBeDefined();
    expect(nxJson?.plugins).toContain('@gridatek/nx-supabase');
  });

  it('should not register the plugin twice', async () => {
    await initGenerator(tree, options);
    await initGenerator(tree, options);
    const nxJson = readNxJson(tree);
    const pluginCount = nxJson?.plugins?.filter(
      (p) =>
        p === '@gridatek/nx-supabase' ||
        (typeof p === 'object' && p.plugin === '@gridatek/nx-supabase')
    ).length;
    expect(pluginCount).toBe(1);
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
