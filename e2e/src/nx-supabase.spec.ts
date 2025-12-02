import { execSync, spawn } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';

describe('@gridatek/nx-supabase', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();

    // The plugin has been built and published to a local registry in the jest globalSetup
    // Use nx add to install the plugin and run the init generator (tests the real user flow)
    execSync(`npx nx add @gridatek/nx-supabase@e2e`, {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });
  });

  afterAll(() => {
    if (projectDirectory) {
      // Cleanup the test project
      rmSync(projectDirectory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('should be installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync('npm ls @gridatek/nx-supabase', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });

  describe('init generator (via nx add)', () => {
    it('should have added supabase CLI to devDependencies', () => {
      // The init generator should have already run via nx add in beforeAll
      // Verify package.json was updated
      const packageJsonPath = join(projectDirectory, 'package.json');
      expect(existsSync(packageJsonPath)).toBe(true);

      const packageJson = require(packageJsonPath);
      expect(packageJson.devDependencies['supabase']).toBeDefined();
      expect(packageJson.devDependencies['supabase']).toBe('^2.0.0');
    });
  });

  describe('project generator', () => {
    it('should create a Supabase project with default local environment', () => {
      const projectName = 'my-supabase';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Verify project structure was created
      const projectPath = join(projectDirectory, projectName);
      expect(existsSync(projectPath)).toBe(true);

      // Verify common directories exist
      expect(existsSync(join(projectPath, 'common', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'common', 'seeds'))).toBe(true);

      // Verify local environment was created
      expect(existsSync(join(projectPath, 'local', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'local', 'seeds'))).toBe(true);

      // Verify README exists
      expect(existsSync(join(projectPath, 'README.md'))).toBe(true);

      // Verify .gitignore exists
      expect(existsSync(join(projectPath, '.gitignore'))).toBe(true);

      // Verify .generated directory exists
      expect(existsSync(join(projectPath, '.generated'))).toBe(true);
    });

    it('should create a project with multiple environments', () => {
      const projectName = 'multi-env-project';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --environments=local,staging,production`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Verify all environments were created
      ['local', 'staging', 'production'].forEach(env => {
        expect(existsSync(join(projectPath, env, 'migrations'))).toBe(true);
        expect(existsSync(join(projectPath, env, 'seeds'))).toBe(true);
      });
    });

    it('should create project in custom directory', () => {
      const projectName = 'custom-dir-project';
      const directory = 'apps';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --directory=${directory}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, directory, projectName);
      expect(existsSync(projectPath)).toBe(true);
      expect(existsSync(join(projectPath, 'common', 'migrations'))).toBe(true);
    });
  });

  describe('environment generator', () => {
    it('should create a new environment for existing project', () => {
      const projectName = 'existing-project';
      const envName = 'development';

      // First create a project
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Then create a new environment
      execSync(
        `npx nx g @gridatek/nx-supabase:environment ${envName} --project=${projectName}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const envPath = join(projectDirectory, projectName, envName);

      // Verify environment directories exist
      expect(existsSync(join(envPath, 'migrations'))).toBe(true);
      expect(existsSync(join(envPath, 'seeds'))).toBe(true);
    });
  });

  describe('build executor', () => {
    it('should build common and environment-specific files', () => {
      const projectName = 'build-test-project';

      // Create a project with multiple environments
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --environments=local,production`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Run the build executor
      execSync(
        `npx nx run ${projectName}:build`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Verify .generated directories were created for each environment
      expect(existsSync(join(projectPath, '.generated', 'local'))).toBe(true);
      expect(existsSync(join(projectPath, '.generated', 'production'))).toBe(true);

      // Verify config.toml files were built (these are the actual files that get created)
      expect(existsSync(join(projectPath, '.generated', 'local', 'config.toml'))).toBe(true);
      expect(existsSync(join(projectPath, '.generated', 'production', 'config.toml'))).toBe(true);
    });
  });

  // Only run start/stop tests in CI environment
  (process.env.CI ? describe : describe.skip)('start and stop executors', () => {
    it('should start and stop Supabase using convenient shortcuts', () => {
      const projectName = 'start-stop-test-project';

      // Create a project with local environment
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --environments=local`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Verify .generated directory will be created by start target (depends on build)
      // Start Supabase in background (use timeout to prevent hanging)
      // The start target automatically runs build first
      const startProcess = spawn(
        'npx',
        ['nx', 'run', `${projectName}:start`],
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          shell: true,
          env: process.env,
        }
      );

      // Wait for Supabase to start (give it 60 seconds)
      const startTimeout = setTimeout(() => {
        startProcess.kill();
      }, 60000);

      return new Promise<void>((resolve, reject) => {
        startProcess.on('exit', (code) => {
          clearTimeout(startTimeout);

          if (code === 0) {
            // Verify .generated directory was created
            expect(existsSync(join(projectPath, '.generated', 'local', 'config.toml'))).toBe(true);

            // Successfully started, now stop it using the convenient shortcut
            execSync(
              `npx nx run ${projectName}:stop`,
              {
                cwd: projectDirectory,
                stdio: 'inherit',
                env: process.env,
              }
            );
            resolve();
          } else {
            reject(new Error(`Start failed with code ${code}`));
          }
        });

        startProcess.on('error', (error) => {
          clearTimeout(startTimeout);
          reject(error);
        });
      });
    }, 120000); // 2 minute timeout for this test
  });
});

/**
 * Creates a test project with create-nx-workspace and installs the plugin
 * @returns The directory where the test project was created
 */
function createTestProject() {
  const projectName = 'test-project';
  const projectDirectory = join(process.cwd(), 'tmp', projectName);

  // Ensure projectDirectory is empty
  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(dirname(projectDirectory), {
    recursive: true,
  });

  execSync(
    `npx create-nx-workspace@latest ${projectName} --preset apps --nxCloud=skip --no-interactive`,
    {
      cwd: dirname(projectDirectory),
      stdio: 'inherit',
      env: process.env,
    }
  );
  console.log(`Created test project in "${projectDirectory}"`);

  return projectDirectory;
}
