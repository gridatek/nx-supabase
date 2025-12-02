import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';
import { vi } from 'vitest';

import { projectGenerator } from './project';
import { ProjectGeneratorSchema } from './schema';
import * as environmentModule from '../environment/environment';

// Mock the environment generator
vi.mock('../environment/environment', () => ({
  environmentGenerator: vi.fn().mockResolvedValue(() => {
    // Empty callback function for tests
  }),
}));

describe('project generator', () => {
  let tree: Tree;
  const options: ProjectGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    vi.clearAllMocks();
  });

  it('should create project configuration', async () => {
    await projectGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
    expect(config.root).toBe('test');
    expect(config.projectType).toBe('application');
  });

  it('should create common directory structure', async () => {
    await projectGenerator(tree, options);
    expect(tree.exists('test/common/migrations/.gitkeep')).toBeTruthy();
    expect(tree.exists('test/common/seeds/.gitkeep')).toBeTruthy();
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
    expect(tree.exists('apps/test/common/migrations/.gitkeep')).toBeTruthy();
  });

  it('should configure build, start, stop, and supabase targets', async () => {
    await projectGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test');

    // Check build target
    expect(config.targets?.build).toBeDefined();
    expect(config.targets?.build?.executor).toBe('@gridatek/nx-supabase:build');

    // Check start target (uses run-command executor with command: 'start')
    expect(config.targets?.start).toBeDefined();
    expect(config.targets?.start?.executor).toBe('@gridatek/nx-supabase:run-command');
    expect(config.targets?.start?.options?.command).toBe('start');
    expect(config.targets?.start?.dependsOn).toEqual(['build']);

    // Check stop target (uses run-command executor with command: 'stop --no-backup')
    expect(config.targets?.stop).toBeDefined();
    expect(config.targets?.stop?.executor).toBe('@gridatek/nx-supabase:run-command');
    expect(config.targets?.stop?.options?.command).toBe('stop --no-backup');

    // Check generic supabase target
    expect(config.targets?.supabase).toBeDefined();
    expect(config.targets?.supabase?.executor).toBe('@gridatek/nx-supabase:run-command');
  });

  it('should create default local environment', async () => {
    await projectGenerator(tree, options);
    expect(environmentModule.environmentGenerator).toHaveBeenCalledWith(tree, {
      project: 'test',
      name: 'local',
    });
  });

  it('should create multiple environments when specified', async () => {
    const optionsWithEnvs: ProjectGeneratorSchema = {
      name: 'test',
      environments: 'local,staging,production',
    };
    await projectGenerator(tree, optionsWithEnvs);
    expect(environmentModule.environmentGenerator).toHaveBeenCalledTimes(3);
    expect(environmentModule.environmentGenerator).toHaveBeenCalledWith(tree, {
      project: 'test',
      name: 'local',
    });
    expect(environmentModule.environmentGenerator).toHaveBeenCalledWith(tree, {
      project: 'test',
      name: 'staging',
    });
    expect(environmentModule.environmentGenerator).toHaveBeenCalledWith(tree, {
      project: 'test',
      name: 'production',
    });
  });
});
