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
      expect(packageJson.devDependencies['supabase']).toBe('^2.65.6');
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

      // Verify default directories exist
      expect(existsSync(join(projectPath, 'production', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'production', 'seeds'))).toBe(true);

      // Verify local environment was created
      expect(existsSync(join(projectPath, 'local', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'local', 'seeds'))).toBe(true);

      // Verify README exists
      expect(existsSync(join(projectPath, 'README.md'))).toBe(true);

      // Verify .gitignore exists
      expect(existsSync(join(projectPath, '.gitignore'))).toBe(true);

      // Verify .generated directory exists
      expect(existsSync(join(projectPath, '.generated'))).toBe(true);

      // Verify project.json was created (targets are inferred by the plugin at runtime)
      expect(existsSync(join(projectPath, 'project.json'))).toBe(true);

      // Verify that inferred targets are available using nx show project
      const showProjectOutput = execSync(
        `npx nx show project ${projectName} --json`,
        {
          cwd: projectDirectory,
          encoding: 'utf-8',
          env: process.env,
        }
      );
      const projectConfig = JSON.parse(showProjectOutput);
      expect(projectConfig.targets).toBeDefined();
      expect(projectConfig.targets.build).toBeDefined();
      expect(projectConfig.targets.start).toBeDefined();
      expect(projectConfig.targets.stop).toBeDefined();
      expect(projectConfig.targets['run-command']).toBeDefined();
    });

    it('should create a project with additional environments', () => {
      const projectName = 'multi-env-project';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --environments=staging`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Verify production and local are always created
      expect(existsSync(join(projectPath, 'production', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'production', 'seeds'))).toBe(true);
      expect(existsSync(join(projectPath, 'local', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'local', 'seeds'))).toBe(true);

      // Verify additional environment (staging) was created
      expect(existsSync(join(projectPath, 'staging', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'staging', 'seeds'))).toBe(true);
    });

    it('should create project in custom directory', () => {
      const projectName = 'custom-dir-project';
      const directory = 'apps/custom-dir-project';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --directory=${directory}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, directory);
      expect(existsSync(projectPath)).toBe(true);
      expect(existsSync(join(projectPath, 'production', 'migrations'))).toBe(true);
    });

    it('should create project without project.json when skipProjectJson is true', () => {
      const projectName = 'no-project-json';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --skipProjectJson`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Verify project structure was created
      expect(existsSync(projectPath)).toBe(true);
      expect(existsSync(join(projectPath, 'production', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'production', 'config.toml'))).toBe(true);
      expect(existsSync(join(projectPath, 'local', 'migrations'))).toBe(true);

      // Verify project.json was NOT created
      expect(existsSync(join(projectPath, 'project.json'))).toBe(false);

      // Verify the project is still detected by running build (via inferred tasks plugin)
      execSync(
        `npx nx run ${projectName}:build`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Verify build worked and generated files
      expect(existsSync(join(projectPath, '.generated', 'local'))).toBe(true);
      // Production should NOT be in .generated - it uses production/ directly
      expect(existsSync(join(projectPath, '.generated', 'production'))).toBe(false);
      expect(existsSync(join(projectPath, 'production', 'config.toml'))).toBe(true);

      // Verify other inferred targets are also available (start, stop, run-command)
      // Test that we can run status command (non-Docker command that works in any environment)
      execSync(
        `npx nx run ${projectName}:run-command --command="supabase --version"`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // The above proves that:
      // 1. Project is detected without project.json
      // 2. Build target works
      // 3. Run-command target works
      // Therefore start and stop targets are also available via plugin inference
    });
  });

  describe('build executor', () => {
    it('should build default and environment-specific files', () => {
      const projectName = 'build-test-project';

      // Create a project (production and local are created by default)
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName}`,
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

      // Verify .generated directories were created for non-production environments
      expect(existsSync(join(projectPath, '.generated', 'local'))).toBe(true);
      // Production should NOT be in .generated - it uses production/ directly
      expect(existsSync(join(projectPath, '.generated', 'production'))).toBe(false);

      // Verify config.toml files exist
      expect(existsSync(join(projectPath, '.generated', 'local', 'config.toml'))).toBe(true);
      expect(existsSync(join(projectPath, 'production', 'config.toml'))).toBe(true);
    });
  });

  // Only run start/stop tests in CI environment
  (process.env.CI ? describe : describe.skip)('start and stop executors', () => {
    it('should start and stop Supabase using convenient shortcuts', async () => {
      const projectName = 'start-stop-test-project';

      // Create a project (production and local are created by default)
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Start Supabase in background (detached process)
      // The start target automatically runs build first
      const startProcess = spawn(
        'npx',
        ['nx', 'run', `${projectName}:start`],
        {
          cwd: projectDirectory,
          stdio: 'ignore', // Detach from stdio
          shell: true,
          detached: true,
          env: process.env,
        }
      );

      // Detach the process so it runs independently
      startProcess.unref();

      try {
        // Wait for Supabase to be ready (poll status)
        // In CI, Docker image pulls can take several minutes
        let isReady = false;
        const maxAttempts = 60; // 60 attempts * 5 seconds = 5 minutes max
        const pollInterval = 5000; // 5 seconds

        console.log(`Waiting for Supabase to start (max ${maxAttempts * pollInterval / 1000} seconds)...`);

        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));

          try {
            // Check if Supabase is running using status command
            execSync(
              `npx nx run ${projectName}:run-command --command="supabase status"`,
              {
                cwd: projectDirectory,
                stdio: 'ignore',
                env: process.env,
              }
            );
            console.log(`Supabase started successfully after ${(i + 1) * pollInterval / 1000} seconds`);
            isReady = true;
            break;
          } catch (error) {
            // Status check failed, Supabase not ready yet
            if ((i + 1) % 6 === 0) {
              // Log progress every 30 seconds
              console.log(`Still waiting... (${(i + 1) * pollInterval / 1000}s elapsed)`);
            }
            continue;
          }
        }

        if (!isReady) {
          throw new Error(`Supabase failed to start within ${maxAttempts * pollInterval / 1000} seconds`);
        }

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

        // Verify Supabase stopped (status should fail)
        let hasStopped = false;
        try {
          execSync(
            `npx nx run ${projectName}:run-command --command="supabase status"`,
            {
              cwd: projectDirectory,
              stdio: 'ignore',
              env: process.env,
            }
          );
        } catch (error) {
          // Status check failed, meaning Supabase is stopped
          hasStopped = true;
        }

        expect(hasStopped).toBe(true);
      } finally {
        // Cleanup: ensure Supabase is stopped even if test fails
        try {
          execSync(
            `npx nx run ${projectName}:stop`,
            {
              cwd: projectDirectory,
              stdio: 'ignore',
              env: process.env,
            }
          );
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    }, 360000); // 6 minute timeout for this test (5 min for start + 1 min buffer)

    it('should start and stop project without project.json via inferred tasks', async () => {
      const projectName = 'no-project-json-start-stop';

      // Create a project without project.json (production and local are created by default)
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --skipProjectJson`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Verify project.json was NOT created
      expect(existsSync(join(projectPath, 'project.json'))).toBe(false);

      // Start Supabase in background (detached process)
      // The start target should be available via inferred tasks plugin
      const startProcess = spawn(
        'npx',
        ['nx', 'run', `${projectName}:start`],
        {
          cwd: projectDirectory,
          stdio: 'ignore',
          shell: true,
          detached: true,
          env: process.env,
        }
      );

      startProcess.unref();

      try {
        // Wait for Supabase to be ready
        let isReady = false;
        const maxAttempts = 60;
        const pollInterval = 5000;

        console.log(`Waiting for Supabase to start (project without project.json)...`);

        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));

          try {
            execSync(
              `npx nx run ${projectName}:run-command --command="supabase status"`,
              {
                cwd: projectDirectory,
                stdio: 'ignore',
                env: process.env,
              }
            );
            console.log(`Supabase started successfully (without project.json) after ${(i + 1) * pollInterval / 1000} seconds`);
            isReady = true;
            break;
          } catch (error) {
            if (i % 6 === 5) {
              console.log(`Still waiting... (${(i + 1) * pollInterval / 1000}s elapsed)`);
            }
            continue;
          }
        }

        if (!isReady) {
          throw new Error(`Supabase failed to start within ${maxAttempts * pollInterval / 1000} seconds`);
        }

        // Verify .generated directory was created
        expect(existsSync(join(projectPath, '.generated', 'local', 'config.toml'))).toBe(true);

        // Stop Supabase using the inferred stop target
        execSync(
          `npx nx run ${projectName}:stop`,
          {
            cwd: projectDirectory,
            stdio: 'inherit',
            env: process.env,
          }
        );

        // Verify Supabase stopped
        let hasStopped = false;
        try {
          execSync(
            `npx nx run ${projectName}:run-command --command="supabase status"`,
            {
              cwd: projectDirectory,
              stdio: 'ignore',
              env: process.env,
            }
          );
        } catch (error) {
          hasStopped = true;
        }

        expect(hasStopped).toBe(true);
      } finally {
        // Cleanup
        try {
          execSync(
            `npx nx run ${projectName}:stop`,
            {
              cwd: projectDirectory,
              stdio: 'ignore',
              env: process.env,
            }
          );
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    }, 360000); // 6 minute timeout

    it('should reset database successfully', async () => {
      const projectName = 'db-reset-test-project';

      // Create a project
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Start Supabase in background
      const startProcess = spawn(
        'npx',
        ['nx', 'run', `${projectName}:start`],
        {
          cwd: projectDirectory,
          stdio: 'ignore',
          shell: true,
          detached: true,
          env: process.env,
        }
      );

      startProcess.unref();

      try {
        // Wait for Supabase to be ready
        let isReady = false;
        const maxAttempts = 60;
        const pollInterval = 5000;

        console.log(`Waiting for Supabase to start for db reset test...`);

        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));

          try {
            execSync(
              `npx nx run ${projectName}:run-command --command="supabase status"`,
              {
                cwd: projectDirectory,
                stdio: 'ignore',
                env: process.env,
              }
            );
            console.log(`Supabase started successfully for db reset test after ${(i + 1) * pollInterval / 1000} seconds`);
            isReady = true;
            break;
          } catch (error) {
            if ((i + 1) % 6 === 0) {
              console.log(`Still waiting... (${(i + 1) * pollInterval / 1000}s elapsed)`);
            }
            continue;
          }
        }

        if (!isReady) {
          throw new Error(`Supabase failed to start within ${maxAttempts * pollInterval / 1000} seconds`);
        }

        // Execute SQL to create a test table
        console.log('Creating test table...');
        execSync(
          `echo "CREATE TABLE test_reset_table (id serial PRIMARY KEY, name text);" | docker exec -i supabase_db_${projectName} psql -U postgres -d postgres`,
          {
            cwd: projectDirectory,
            stdio: 'inherit',
            env: process.env,
            shell: true,
          }
        );

        // Verify table exists before reset
        console.log('Verifying table exists before reset...');
        const tableCheckBefore = execSync(
          `echo "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_reset_table');" | docker exec -i supabase_db_${projectName} psql -U postgres -d postgres -t`,
          {
            cwd: projectDirectory,
            encoding: 'utf-8',
            env: process.env,
            shell: true,
          }
        );
        expect(tableCheckBefore.trim()).toBe('t'); // PostgreSQL returns 't' for true

        // Test db reset command
        console.log('Testing db reset...');
        execSync(
          `npx nx run ${projectName}:run-command --command="supabase db reset"`,
          {
            cwd: projectDirectory,
            stdio: 'inherit',
            env: process.env,
          }
        );

        // Verify Supabase is still running after reset
        execSync(
          `npx nx run ${projectName}:run-command --command="supabase status"`,
          {
            cwd: projectDirectory,
            stdio: 'inherit',
            env: process.env,
          }
        );

        // Verify table no longer exists after reset
        console.log('Verifying table was removed after reset...');
        const tableCheckAfter = execSync(
          `echo "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_reset_table');" | docker exec -i supabase_db_${projectName} psql -U postgres -d postgres -t`,
          {
            cwd: projectDirectory,
            encoding: 'utf-8',
            env: process.env,
            shell: true,
          }
        );
        expect(tableCheckAfter.trim()).toBe('f'); // PostgreSQL returns 'f' for false

        console.log('Database reset successful - table was removed!');
      } finally {
        // Cleanup: ensure Supabase is stopped
        try {
          execSync(
            `npx nx run ${projectName}:stop`,
            {
              cwd: projectDirectory,
              stdio: 'ignore',
              env: process.env,
            }
          );
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    }, 360000); // 6 minute timeout
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
