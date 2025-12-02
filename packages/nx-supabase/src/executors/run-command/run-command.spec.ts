import { ExecutorContext } from '@nx/devkit';
import { RunCommandExecutorSchema } from './schema';
import executor from './run-command';
import { join } from 'path';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as child_process from 'child_process';

// Mock fs module
vi.mock('fs');

// Mock child_process
vi.mock('child_process');

describe('Supabase Executor', () => {
  let context: ExecutorContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock existsSync
    vi.mocked(fs.existsSync).mockReturnValue(true);

    // Mock spawn
    vi.mocked(child_process.spawn).mockReturnValue({
      on: vi.fn((event: string, callback: (code: number) => void) => {
        if (event === 'exit') {
          callback(0);
        }
      }),
    } as any);

    context = {
      root: '/workspace',
      cwd: '/workspace',
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

  it('should use local as default environment', async () => {
    const options: RunCommandExecutorSchema = {
      command: 'supabase start',
    };

    const output = await executor(options, context);

    // Should check for .generated/local directory (default env)
    expect(fs.existsSync).toHaveBeenCalledWith(
      join('/workspace', 'apps/test-project', '.generated', 'local')
    );
    expect(output.success).toBe(true);
  });

  it('should use specified environment', async () => {
    const options: RunCommandExecutorSchema = {
      env: 'production',
      command: 'supabase start',
    };

    const output = await executor(options, context);

    // Should check for .generated/production directory
    expect(fs.existsSync).toHaveBeenCalledWith(
      join('/workspace', 'apps/test-project', '.generated', 'production')
    );
    expect(output.success).toBe(true);
  });

  it('should handle array commands', async () => {
    const options: RunCommandExecutorSchema = {
      command: ['supabase', 'migration', 'new', 'my_table'],
    };

    const output = await executor(options, context);
    expect(output.success).toBe(true);
  });

  it('should fail if environment directory does not exist', async () => {
    const options: RunCommandExecutorSchema = {
      command: 'supabase start',
    };

    vi.mocked(fs.existsSync).mockReturnValue(false);

    const output = await executor(options, context);
    expect(output.success).toBe(false);
  });
});
