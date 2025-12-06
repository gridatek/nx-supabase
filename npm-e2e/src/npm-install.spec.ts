import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';

describe('@gridatek/nx-supabase npm installation', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();

    // Install the plugin from npm using nx add
    // This tests the real user flow of installing from npm
    execSync(`npx nx add @gridatek/nx-supabase`, {
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

  it('should be installed from npm', () => {
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
    it('should create a Supabase project with default configuration', () => {
      const projectName = 'test-supabase-project';

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
      const projectName = 'multi-env-npm-project';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --environments=staging,development`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Verify production and local are always created
      expect(existsSync(join(projectPath, 'production', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'local', 'migrations'))).toBe(true);

      // Verify additional environments were created
      expect(existsSync(join(projectPath, 'staging', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'development', 'migrations'))).toBe(true);
    });

    it('should create project in custom directory', () => {
      const projectName = 'custom-dir-project';
      const directory = 'apps/backend/custom-dir-project';

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
      expect(existsSync(join(projectPath, 'local', 'migrations'))).toBe(true);
      expect(existsSync(join(projectPath, 'project.json'))).toBe(true);
    });

    it('should create project without project.json when skipProjectJson is true', () => {
      const projectName = 'no-project-json-npm';

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
      expect(existsSync(join(projectPath, 'local', 'migrations'))).toBe(true);

      // Verify project.json was NOT created
      expect(existsSync(join(projectPath, 'project.json'))).toBe(false);
    });

    it('should create multiple projects in the same workspace', () => {
      const projectName1 = 'database-api';
      const projectName2 = 'database-web';

      // Create first project
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName1}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Create second project
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName2}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Verify both projects exist
      const projectPath1 = join(projectDirectory, projectName1);
      const projectPath2 = join(projectDirectory, projectName2);

      expect(existsSync(projectPath1)).toBe(true);
      expect(existsSync(projectPath2)).toBe(true);

      // Verify both have their own config
      expect(existsSync(join(projectPath1, 'production', 'config.toml'))).toBe(true);
      expect(existsSync(join(projectPath2, 'production', 'config.toml'))).toBe(true);
    });
  });

  describe('build executor', () => {
    it('should build configuration files for all environments', () => {
      const projectName = 'build-npm-test';

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

    it('should build project with inferred tasks (without project.json)', () => {
      const projectName = 'inferred-build-test';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --skipProjectJson`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Run the build executor (should work via inferred tasks plugin)
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
      expect(existsSync(join(projectPath, '.generated', 'local', 'config.toml'))).toBe(true);
      expect(existsSync(join(projectPath, 'production', 'config.toml'))).toBe(true);
    });
  });

  describe('run-command executor', () => {
    it('should execute supabase commands', () => {
      const projectName = 'run-command-test';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Build the project first to generate config files
      execSync(
        `npx nx run ${projectName}:build`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Run supabase --version command
      const output = execSync(
        `npx nx run ${projectName}:run-command --command="supabase --version"`,
        {
          cwd: projectDirectory,
          encoding: 'utf-8',
          env: process.env,
        }
      );

      // Verify command executed and returned version
      expect(output).toContain('supabase');
    });

    it('should work with inferred tasks', () => {
      const projectName = 'run-command-inferred';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName} --skipProjectJson`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Build the project first to generate config files
      execSync(
        `npx nx run ${projectName}:build`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Run supabase --version command via inferred task
      const output = execSync(
        `npx nx run ${projectName}:run-command --command="supabase --version"`,
        {
          cwd: projectDirectory,
          encoding: 'utf-8',
          env: process.env,
        }
      );

      expect(output).toContain('supabase');
    });
  });

  describe('Nx integration', () => {
    it('should be detectable by nx show project command', () => {
      const projectName = 'nx-show-test';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Run nx show project command
      const output = execSync(
        `npx nx show project ${projectName} --json`,
        {
          cwd: projectDirectory,
          encoding: 'utf-8',
          env: process.env,
        }
      );

      const projectInfo = JSON.parse(output);
      expect(projectInfo.name).toBe(projectName);
      expect(projectInfo.targets).toBeDefined();
      expect(projectInfo.targets.build).toBeDefined();
    });

    it('should work with nx run-many', () => {
      const projectName1 = 'run-many-test-1';
      const projectName2 = 'run-many-test-2';

      // Create two projects
      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName1}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName2}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Run build on both projects
      execSync(
        `npx nx run-many -t build --projects=${projectName1},${projectName2}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Verify both were built
      const projectPath1 = join(projectDirectory, projectName1);
      const projectPath2 = join(projectDirectory, projectName2);

      expect(existsSync(join(projectPath1, '.generated', 'local', 'config.toml'))).toBe(true);
      expect(existsSync(join(projectPath2, '.generated', 'local', 'config.toml'))).toBe(true);
    });
  });

  describe('generated files validation', () => {
    it('should generate valid config.toml files', () => {
      const projectName = 'config-validation';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);

      // Run build
      execSync(
        `npx nx run ${projectName}:build`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      // Verify config.toml contains expected sections
      const localConfig = readFileSync(
        join(projectPath, '.generated', 'local', 'config.toml'),
        'utf-8'
      );

      expect(localConfig).toContain('[api]');
      expect(localConfig).toContain('[db]');
      expect(localConfig).toContain('[studio]');
    });

    it('should generate proper .gitignore content', () => {
      const projectName = 'gitignore-test';

      execSync(
        `npx nx g @gridatek/nx-supabase:project ${projectName}`,
        {
          cwd: projectDirectory,
          stdio: 'inherit',
          env: process.env,
        }
      );

      const projectPath = join(projectDirectory, projectName);
      const gitignore = readFileSync(
        join(projectPath, '.gitignore'),
        'utf-8'
      );

      // Verify .generated is ignored
      expect(gitignore).toContain('.generated');
    });
  });
});

/**
 * Creates a test project with create-nx-workspace
 * @returns The directory where the test project was created
 */
function createTestProject() {
  const projectName = 'npm-test-project';
  const projectDirectory = join(process.cwd(), 'tmp', 'npm-e2e', projectName);

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
