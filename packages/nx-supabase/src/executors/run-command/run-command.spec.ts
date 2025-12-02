import { ExecutorContext } from '@nx/devkit';
import { RunCommandExecutorSchema } from './schema';
import executor from './run-command';
import { existsSync } from 'fs';
import { join } from 'path';
import { vi } from 'vitest';

// Mock fs module
vi.mock('fs', () => ({
  default: {},
  existsSync: vi.fn(),
}));

// Mock child_process
vi.mock('child_process', () => ({
  default: {},
  spawn: vi.fn(() => ({
    on: vi.fn((event, callback) => {
      if (event === 'exit') {
        callback(0);
      }
    }),
  })),
}));

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;

describe('Supabase Executor', () => {
  let context: ExecutorContext;

  beforeEach(() => {
    vi.clearAllMocks();

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
      command: 'start',
    };

    mockExistsSync.mockReturnValue(true);

    const output = await executor(options, context);

    // Should check for .generated/local directory (default env)
    expect(mockExistsSync).toHaveBeenCalledWith(
      join('/workspace', 'apps/test-project', '.generated', 'local')
    );
    expect(output.success).toBe(true);
  });

  it('should use specified environment', async () => {
    const options: RunCommandExecutorSchema = {
      env: 'production',
      command: 'start',
    };

    mockExistsSync.mockReturnValue(true);

    const output = await executor(options, context);

    // Should check for .generated/production directory
    expect(mockExistsSync).toHaveBeenCalledWith(
      join('/workspace', 'apps/test-project', '.generated', 'production')
    );
    expect(output.success).toBe(true);
  });

  it('should handle array commands', async () => {
    const options: RunCommandExecutorSchema = {
      command: ['migration', 'new', 'my_table'],
    };

    mockExistsSync.mockReturnValue(true);

    const output = await executor(options, context);
    expect(output.success).toBe(true);
  });

  it('should fail if environment directory does not exist', async () => {
    const options: RunCommandExecutorSchema = {
      command: 'start',
    };

    mockExistsSync.mockReturnValue(false);

    const output = await executor(options, context);
    expect(output.success).toBe(false);
  });
});
