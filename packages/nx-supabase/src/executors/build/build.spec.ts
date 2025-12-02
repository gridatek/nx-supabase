import { ExecutorContext } from '@nx/devkit';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { BuildExecutorSchema } from './schema';
import executor from './build';

const options: BuildExecutorSchema = {};

describe('Build Executor', () => {
  let testRoot: string;
  let context: ExecutorContext;

  beforeEach(() => {
    // Create a temporary test directory
    testRoot = join(process.cwd(), 'tmp', 'build-executor-test');

    // Clean up if exists
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }

    // Create test project structure
    const projectRoot = join(testRoot, 'test-project');
    mkdirSync(join(projectRoot, 'default', 'migrations'), { recursive: true });
    mkdirSync(join(projectRoot, 'default', 'seeds'), { recursive: true });
    mkdirSync(join(projectRoot, 'local', 'migrations'), { recursive: true });
    mkdirSync(join(projectRoot, 'local', 'seeds'), { recursive: true });
    mkdirSync(join(projectRoot, 'production', 'migrations'), { recursive: true });

    // Create default files
    writeFileSync(join(projectRoot, 'default', 'config.toml'), 'default config');
    writeFileSync(join(projectRoot, 'default', 'migrations', '001_init.sql'), 'default migration');
    writeFileSync(join(projectRoot, 'default', 'seeds', 'data.sql'), 'default seed');

    // Create environment-specific files
    writeFileSync(join(projectRoot, 'local', 'config.toml'), 'local config');
    writeFileSync(join(projectRoot, 'local', 'migrations', '002_local.sql'), 'local migration');

    writeFileSync(join(projectRoot, 'production', 'config.toml'), 'production config');
    writeFileSync(join(projectRoot, 'production', 'migrations', '002_prod.sql'), 'prod migration');

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
            root: 'test-project',
          },
        },
        version: 2,
      },
      nxJsonConfiguration: {},
    };
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('should build all environments successfully', async () => {
    const output = await executor(options, context);
    expect(output.success).toBe(true);

    const projectRoot = join(testRoot, 'test-project');

    // Check that .generated directories were created
    expect(existsSync(join(projectRoot, '.generated', 'local'))).toBe(true);
    expect(existsSync(join(projectRoot, '.generated', 'production'))).toBe(true);
  });

  it('should merge default files with environment files', async () => {
    const output = await executor(options, context);
    expect(output.success).toBe(true);

    const projectRoot = join(testRoot, 'test-project');

    // Check local environment has both default and local files
    const localConfig = readFileSync(join(projectRoot, '.generated', 'local', 'config.toml'), 'utf-8');
    expect(localConfig).toBe('local config'); // Environment-specific overrides default

    const defaultMigration = readFileSync(join(projectRoot, '.generated', 'local', 'migrations', '001_init.sql'), 'utf-8');
    expect(defaultMigration).toBe('default migration');

    const localMigration = readFileSync(join(projectRoot, '.generated', 'local', 'migrations', '002_local.sql'), 'utf-8');
    expect(localMigration).toBe('local migration');

    const defaultSeed = readFileSync(join(projectRoot, '.generated', 'local', 'seeds', 'data.sql'), 'utf-8');
    expect(defaultSeed).toBe('default seed');
  });

  it('should handle production environment correctly', async () => {
    const output = await executor(options, context);
    expect(output.success).toBe(true);

    const projectRoot = join(testRoot, 'test-project');

    // Check production environment
    const prodConfig = readFileSync(join(projectRoot, '.generated', 'production', 'config.toml'), 'utf-8');
    expect(prodConfig).toBe('production config');

    const prodMigration = readFileSync(join(projectRoot, '.generated', 'production', 'migrations', '002_prod.sql'), 'utf-8');
    expect(prodMigration).toBe('prod migration');

    // Default files should also be present
    expect(existsSync(join(projectRoot, '.generated', 'production', 'migrations', '001_init.sql'))).toBe(true);
  });

  it('should skip .gitkeep files', async () => {
    const projectRoot = join(testRoot, 'test-project');
    writeFileSync(join(projectRoot, 'default', 'migrations', '.gitkeep'), '');
    writeFileSync(join(projectRoot, 'local', 'migrations', '.gitkeep'), '');

    const output = await executor(options, context);
    expect(output.success).toBe(true);

    // .gitkeep files should not be copied
    expect(existsSync(join(projectRoot, '.generated', 'local', 'migrations', '.gitkeep'))).toBe(false);
  });

  it('should clean existing .generated directories before building', async () => {
    const projectRoot = join(testRoot, 'test-project');

    // Create old file in .generated
    mkdirSync(join(projectRoot, '.generated', 'local'), { recursive: true });
    writeFileSync(join(projectRoot, '.generated', 'local', 'old-file.txt'), 'old content');

    const output = await executor(options, context);
    expect(output.success).toBe(true);

    // Old file should be removed
    expect(existsSync(join(projectRoot, '.generated', 'local', 'old-file.txt'))).toBe(false);

    // New files should exist
    expect(existsSync(join(projectRoot, '.generated', 'local', 'config.toml'))).toBe(true);
  });

  it('should fail if default directory does not exist', async () => {
    const projectRoot = join(testRoot, 'test-project');
    rmSync(join(projectRoot, 'default'), { recursive: true, force: true });

    const output = await executor(options, context);
    expect(output.success).toBe(false);
  });

  it('should succeed with warning if no environments exist', async () => {
    const projectRoot = join(testRoot, 'test-project');

    // Remove all environment directories
    rmSync(join(projectRoot, 'local'), { recursive: true, force: true });
    rmSync(join(projectRoot, 'production'), { recursive: true, force: true });

    const output = await executor(options, context);
    expect(output.success).toBe(true);
  });
});
