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
    expect(tree.exists('test/production/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/production/seeds/.gitkeep')).toBeTruthy();
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
      directory: 'apps/my-api/supabase'
    };
    await projectGenerator(tree, optionsWithDir);
    const config = readProjectConfiguration(tree, 'test');
    expect(config.root).toBe('apps/my-api/supabase');
    expect(tree.exists('apps/my-api/supabase/production/migrations/.gitkeep')).toBeTruthy();
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

  it('should create additional environments beyond production and local', async () => {
    const optionsWithEnvs: ProjectGeneratorSchema = {
      name: 'test',
      environments: 'staging,dev',
    };
    await projectGenerator(tree, optionsWithEnvs);

    // Production and local should always be created
    expect(tree.exists('test/production/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/production/seeds/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/local/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/local/seeds/.gitkeep')).toBeTruthy();

    // Additional environments should also be created
    expect(tree.exists('test/staging/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/staging/seeds/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/dev/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/dev/seeds/.gitkeep')).toBeTruthy();
  });

  it('should skip project.json when skipProjectJson is true', async () => {
    const optionsWithSkip: ProjectGeneratorSchema = {
      name: 'test',
      skipProjectJson: true,
    };
    await projectGenerator(tree, optionsWithSkip);

    // Should not have project.json
    expect(tree.exists('test/project.json')).toBeFalsy();

    // Should still create directory structure
    expect(tree.exists('test/production/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/local/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/.gitignore')).toBeTruthy();
    expect(tree.exists('test/README.md')).toBeTruthy();

    // Should not throw when trying to read config (project doesn't exist in tree)
    expect(() => readProjectConfiguration(tree, 'test')).toThrow();
  });
});
