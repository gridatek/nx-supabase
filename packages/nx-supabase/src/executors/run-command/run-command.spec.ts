import { ExecutorContext } from '@nx/devkit';
import { RunCommandExecutorSchema } from './schema';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { vi, beforeEach, describe, it, expect, afterEach } from 'vitest';

// Mock child_process.spawn to avoid actually running commands
const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
}));

vi.mock('child_process', () => {
  return {
    spawn: mockSpawn,
  };
});

import executor from './run-command';

describe('Supabase Executor', () => {
  let testRoot: string;
  let context: ExecutorContext;

  beforeEach(() => {
    // Create a temporary test directory
    testRoot = join(process.cwd(), 'tmp', 'run-command-executor-test');

    // Clean up if exists
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }

    // Setup default spawn mock
    mockSpawn.mockReturnValue({
      on: vi.fn((event: string, callback: (code: number) => void) => {
        if (event === 'exit') {
          setTimeout(() => callback(0), 0);
        }
      }),
    });

    context = {
      root: testRoot,
      cwd: testRoot,
      isVerbose: false,
      projectName: 'test-project',
      projectGraph: {
        nodes: {},
        dependencies: {},
      },
      projectsConfigurations: {
        projects: {
          'test-project': {
            root: 'apps/test-project',
          },
        },
        version: 2,
      },
      nxJsonConfiguration: {},
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('should use local as default environment', async () => {
    // Create test structure
    const projectRoot = join(testRoot, 'apps/test-project');
    const localDir = join(projectRoot, '.generated', 'local');
    mkdirSync(localDir, { recursive: true });
    writeFileSync(join(localDir, 'config.toml'), 'test config');

    const options: RunCommandExecutorSchema = {
      command: 'supabase start',
    };

    const output = await executor(options, context);

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['supabase', 'start'],
      expect.objectContaining({
        cwd: localDir,
      })
    );
    expect(output.success).toBe(true);
  });

  it('should use specified environment', async () => {
    // Create test structure
    const projectRoot = join(testRoot, 'apps/test-project');
    const prodDir = join(projectRoot, '.generated', 'production');
    mkdirSync(prodDir, { recursive: true });
    writeFileSync(join(prodDir, 'config.toml'), 'test config');

    const options: RunCommandExecutorSchema = {
      env: 'production',
      command: 'supabase start',
    };

    const output = await executor(options, context);

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['supabase', 'start'],
      expect.objectContaining({
        cwd: prodDir,
      })
    );
    expect(output.success).toBe(true);
  });

  it('should handle array commands', async () => {
    // Create test structure
    const projectRoot = join(testRoot, 'apps/test-project');
    const localDir = join(projectRoot, '.generated', 'local');
    mkdirSync(localDir, { recursive: true });
    writeFileSync(join(localDir, 'config.toml'), 'test config');

    const options: RunCommandExecutorSchema = {
      command: ['supabase', 'migration', 'new', 'my_table'],
    };

    const output = await executor(options, context);

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      ['supabase', 'migration', 'new', 'my_table'],
      expect.objectContaining({
        cwd: localDir,
      })
    );
    expect(output.success).toBe(true);
  });

  it('should fail if environment directory does not exist', async () => {
    const options: RunCommandExecutorSchema = {
      command: 'supabase start',
    };

    const output = await executor(options, context);
    expect(output.success).toBe(false);
  });
});
