import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';

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
      expect(packageJson.devDependencies['supabase']).toBe('^2.0.0');
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
