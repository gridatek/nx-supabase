import { ExecutorContext } from '@nx/devkit';
import { SupabaseExecutorSchema } from './schema';
import executor from './supabase';
import { existsSync } from 'fs';
import { join } from 'path';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    on: jest.fn((event, callback) => {
      if (event === 'exit') {
        callback(0);
      }
    }),
  })),
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('Supabase Executor', () => {
  let context: ExecutorContext;

  beforeEach(() => {
    jest.clearAllMocks();

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
    const options: SupabaseExecutorSchema = {
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
    const options: SupabaseExecutorSchema = {
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
    const options: SupabaseExecutorSchema = {
      command: ['migration', 'new', 'my_table'],
    };

    mockExistsSync.mockReturnValue(true);

    const output = await executor(options, context);
    expect(output.success).toBe(true);
  });

  it('should fail if environment directory does not exist', async () => {
    const options: SupabaseExecutorSchema = {
      command: 'start',
    };

    mockExistsSync.mockReturnValue(false);

    const output = await executor(options, context);
    expect(output.success).toBe(false);
  });
});
