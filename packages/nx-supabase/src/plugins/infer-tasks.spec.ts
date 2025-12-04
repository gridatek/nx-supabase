import { CreateNodesContextV2 } from '@nx/devkit';
import { createNodesV2 } from './infer-tasks';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Supabase Plugin - Inferred Tasks', () => {
  let tempDir: string;
  let context: CreateNodesContextV2;

  beforeEach(() => {
    tempDir = join(process.cwd(), 'tmp', 'infer-tasks-test');

    // Clean up if exists
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }

    mkdirSync(tempDir, { recursive: true });

    context = {
      workspaceRoot: tempDir,
      nxJsonConfiguration: {},
    };
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should use correct glob pattern for detection', () => {
    const [pattern] = createNodesV2;
    expect(pattern).toBe('**/production/config.toml');
  });

  it('should create inferred tasks for Supabase project with config.toml', async () => {
    // Create test Supabase project structure
    const projectRoot = 'my-supabase';
    const productionDir = join(tempDir, projectRoot, 'production');
    const localDir = join(tempDir, projectRoot, 'local');

    mkdirSync(join(productionDir, 'migrations'), { recursive: true });
    mkdirSync(join(productionDir, 'seeds'), { recursive: true });
    mkdirSync(join(localDir, 'migrations'), { recursive: true });
    mkdirSync(join(localDir, 'seeds'), { recursive: true });

    // Create the config.toml file (required for detection)
    writeFileSync(join(productionDir, 'config.toml'), 'project_id = "test-project-id"');

    const [, handler] = createNodesV2;
    const results = await handler(
      [join(projectRoot, 'production', 'config.toml')],
      undefined,
      context
    );

    // Verify project was detected
    expect(results).toHaveLength(1);
    const [, result] = results[0];
    expect(result.projects).toBeDefined();
    expect(result.projects).toHaveProperty(projectRoot);

    if (!result.projects) {
      throw new Error('Projects should be defined');
    }
    const project = result.projects[projectRoot];

    // Verify project name is extracted from config.toml project_id
    expect(project.name).toBe('test-project-id');

    // Verify all targets were created
    expect(project.targets).toHaveProperty('build');
    expect(project.targets).toHaveProperty('start');
    expect(project.targets).toHaveProperty('stop');
    expect(project.targets).toHaveProperty('run-command');

    // Verify build target configuration
    expect(project.targets?.build?.executor).toBe('@gridatek/nx-supabase:build');
    expect(project.targets?.build?.cache).toBe(true);
    expect(project.targets?.build?.inputs).toContain('{projectRoot}/production/**/*');
    expect(project.targets?.build?.inputs).toContain('{projectRoot}/local/**/*');
    expect(project.targets?.build?.outputs).toEqual(['{projectRoot}/.generated']);

    // Verify start target configuration
    expect(project.targets?.start?.executor).toBe('@gridatek/nx-supabase:run-command');
    expect(project.targets?.start?.options?.command).toBe('supabase start');
    expect(project.targets?.start?.dependsOn).toEqual(['build']);

    // Verify stop target configuration
    expect(project.targets?.stop?.executor).toBe('@gridatek/nx-supabase:run-command');
    expect(project.targets?.stop?.options?.command).toBe('supabase stop --no-backup');

    // Verify run-command target configuration
    expect(project.targets?.['run-command']?.executor).toBe('@gridatek/nx-supabase:run-command');
  });

  it('should not create project if config.toml does not exist', async () => {
    // Create project structure without config.toml
    const projectRoot = 'invalid-project';
    const productionDir = join(tempDir, projectRoot, 'production');

    mkdirSync(join(productionDir, 'migrations'), { recursive: true });

    const [, handler] = createNodesV2;
    const results = await handler(
      [join(projectRoot, 'production', 'config.toml')],
      undefined,
      context
    );

    // Should not detect the project
    expect(results).toHaveLength(0);
  });

  it('should support custom target names from options', async () => {
    // Create test project
    const projectRoot = 'custom-targets';
    const productionDir = join(tempDir, projectRoot, 'production');

    mkdirSync(join(productionDir, 'migrations'), { recursive: true });
    writeFileSync(join(productionDir, 'config.toml'), 'project_id = "custom-targets-project"');

    const customOptions = {
      buildTargetName: 'custom-build',
      startTargetName: 'custom-start',
      stopTargetName: 'custom-stop',
      runCommandTargetName: 'custom-run',
    };

    const [, handler] = createNodesV2;
    const results = await handler(
      [join(projectRoot, 'production', 'config.toml')],
      customOptions,
      context
    );

    const [, result] = results[0];
    expect(result.projects).toBeDefined();

    if (!result.projects) {
      throw new Error('Projects should be defined');
    }
    const project = result.projects[projectRoot];

    // Verify custom target names are used
    expect(project.targets).toHaveProperty('custom-build');
    expect(project.targets).toHaveProperty('custom-start');
    expect(project.targets).toHaveProperty('custom-stop');
    expect(project.targets).toHaveProperty('custom-run');
  });

  it('should detect multiple environment directories', async () => {
    // Create project with multiple environments
    const projectRoot = 'multi-env';
    const productionDir = join(tempDir, projectRoot, 'production');

    mkdirSync(join(productionDir, 'migrations'), { recursive: true });
    writeFileSync(join(productionDir, 'config.toml'), 'project_id = "multi-env-project"');

    // Create multiple environment directories
    mkdirSync(join(tempDir, projectRoot, 'local'), { recursive: true });
    mkdirSync(join(tempDir, projectRoot, 'staging'), { recursive: true });

    const [, handler] = createNodesV2;
    const results = await handler(
      [join(projectRoot, 'production', 'config.toml')],
      undefined,
      context
    );

    const [, result] = results[0];
    expect(result.projects).toBeDefined();

    if (!result.projects) {
      throw new Error('Projects should be defined');
    }
    const project = result.projects[projectRoot];

    // Verify all environments are included in inputs (production, local, staging)
    expect(project.targets?.build?.inputs).toContain('{projectRoot}/production/**/*');
    expect(project.targets?.build?.inputs).toContain('{projectRoot}/local/**/*');
    expect(project.targets?.build?.inputs).toContain('{projectRoot}/staging/**/*');
  });

  it('should ignore .generated and hidden directories', async () => {
    // Create project with directories that should be ignored
    const projectRoot = 'ignore-test';
    const productionDir = join(tempDir, projectRoot, 'production');

    mkdirSync(join(productionDir, 'migrations'), { recursive: true });
    writeFileSync(join(productionDir, 'config.toml'), 'project_id = "ignore-test-project"');

    // Create directories that should be ignored
    mkdirSync(join(tempDir, projectRoot, '.generated'), { recursive: true });
    mkdirSync(join(tempDir, projectRoot, '.git'), { recursive: true });
    mkdirSync(join(tempDir, projectRoot, 'local'), { recursive: true });

    const [, handler] = createNodesV2;
    const results = await handler(
      [join(projectRoot, 'production', 'config.toml')],
      undefined,
      context
    );

    const [, result] = results[0];
    expect(result.projects).toBeDefined();

    if (!result.projects) {
      throw new Error('Projects should be defined');
    }
    const project = result.projects[projectRoot];

    // Verify production and local are included, but not .generated or .git
    expect(project.targets?.build?.inputs).toContain('{projectRoot}/production/**/*');
    expect(project.targets?.build?.inputs).toContain('{projectRoot}/local/**/*');
    expect(project.targets?.build?.inputs).not.toContain('{projectRoot}/.generated/**/*');
    expect(project.targets?.build?.inputs).not.toContain('{projectRoot}/.git/**/*');
  });
});
