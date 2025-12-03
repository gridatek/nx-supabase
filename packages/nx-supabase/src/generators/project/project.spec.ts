import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { projectGenerator } from './project';
import { ProjectGeneratorSchema } from './schema';

describe('project generator', () => {
  let tree: Tree;
  const options: ProjectGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should create project configuration', async () => {
    await projectGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
    expect(config.root).toBe('test');
    expect(config.projectType).toBe('application');
  });

  it('should create default directory structure', async () => {
    await projectGenerator(tree, options);
    expect(tree.exists('test/default/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/default/seeds/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/.generated/.gitkeep')).toBeTruthy();
  });

  it('should create .gitignore file', async () => {
    await projectGenerator(tree, options);
    expect(tree.exists('test/.gitignore')).toBeTruthy();
    const gitignore = tree.read('test/.gitignore', 'utf-8');
    expect(gitignore).toContain('.generated/');
  });

  it('should create README file', async () => {
    await projectGenerator(tree, options);
    expect(tree.exists('test/README.md')).toBeTruthy();
    const readme = tree.read('test/README.md', 'utf-8');
    expect(readme).toContain('# test');
    expect(readme).toContain('Folder Structure');
  });

  it('should support custom directory', async () => {
    const optionsWithDir: ProjectGeneratorSchema = {
      name: 'test',
      directory: 'apps'
    };
    await projectGenerator(tree, optionsWithDir);
    const config = readProjectConfiguration(tree, 'test');
    expect(config.root).toBe('apps/test');
    expect(tree.exists('apps/test/default/migrations/.gitkeep')).toBeTruthy();
  });

  it('should create project configuration without explicit targets', async () => {
    await projectGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test');

    // Targets are now inferred by the plugin, not explicitly configured
    expect(config.root).toBe('test');
    expect(config.projectType).toBe('application');
    expect(config.sourceRoot).toBe('test');
  });

  it('should create default local environment', async () => {
    await projectGenerator(tree, options);
    expect(tree.exists('test/local/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/local/seeds/.gitkeep')).toBeTruthy();
  });

  it('should create multiple environments when specified', async () => {
    const optionsWithEnvs: ProjectGeneratorSchema = {
      name: 'test',
      environments: 'local,staging,production',
    };
    await projectGenerator(tree, optionsWithEnvs);

    // Check local environment
    expect(tree.exists('test/local/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/local/seeds/.gitkeep')).toBeTruthy();

    // Check staging environment
    expect(tree.exists('test/staging/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/staging/seeds/.gitkeep')).toBeTruthy();

    // Check production environment
    expect(tree.exists('test/production/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/production/seeds/.gitkeep')).toBeTruthy();
  });
});
