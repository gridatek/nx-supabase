import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, addProjectConfiguration } from '@nx/devkit';

import { environmentGenerator } from './environment';
import { EnvironmentGeneratorSchema } from './schema';

describe('environment generator', () => {
  let tree: Tree;
  const options: EnvironmentGeneratorSchema = {
    project: 'test-project',
    name: 'staging'
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();

    // Create a project first (environment generator needs an existing project)
    addProjectConfiguration(tree, 'test-project', {
      root: 'test-project',
      projectType: 'application',
      sourceRoot: 'test-project',
      targets: {},
    });
  });

  it('should create environment directories', async () => {
    await environmentGenerator(tree, options);
    expect(tree.exists('test-project/staging/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test-project/staging/seeds/.gitkeep')).toBeTruthy();
  });

  it('should create environment for existing project', async () => {
    const productionOptions: EnvironmentGeneratorSchema = {
      project: 'test-project',
      name: 'production'
    };
    await environmentGenerator(tree, productionOptions);
    expect(tree.exists('test-project/production/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test-project/production/seeds/.gitkeep')).toBeTruthy();
  });

  it('should create multiple environments for same project', async () => {
    await environmentGenerator(tree, options);
    await environmentGenerator(tree, {
      project: 'test-project',
      name: 'production'
    });

    expect(tree.exists('test-project/staging/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test-project/production/migrations/.gitkeep')).toBeTruthy();
  });

  it('should return a callback function', async () => {
    const callback = await environmentGenerator(tree, options);
    expect(callback).toBeDefined();
    expect(typeof callback).toBe('function');
  });

  it('should work with project in custom directory', async () => {
    // Add project in custom directory
    addProjectConfiguration(tree, 'custom-project', {
      root: 'apps/custom-project',
      projectType: 'application',
      sourceRoot: 'apps/custom-project',
      targets: {},
    });

    const customOptions: EnvironmentGeneratorSchema = {
      project: 'custom-project',
      name: 'dev'
    };

    await environmentGenerator(tree, customOptions);
    expect(tree.exists('apps/custom-project/dev/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('apps/custom-project/dev/seeds/.gitkeep')).toBeTruthy();
  });
});
