#!/usr/bin/env node
/**
 * Strata SDK - CLI Tool
 * Command-line interface for Strata development
 */

import { program } from 'commander';
import { StrataRunner } from './runner/index.js';
import * as fs from 'fs/promises';

const version = '1.0.0'; // SDK version

const runner = new StrataRunner();

program.version(version).description('Strata SDK - Build, compile, and run Strata programs');

/**
 * New project command
 */
program
  .command('new <name>')
  .description('Create a new Strata project')
  .option('-t, --target <type>', 'Build target (c, js, bytecode)', 'c')
  .option('-O, --optimize <level>', 'Optimization level (O0-O3)', 'O2')
  .action(async (name, options) => {
    try {
      const pm = runner.getProjectManager();
      const project = await pm.createProject(name, {
        target: options.target,
        optimization: options.optimize
      });
      console.log(`✓ Project "${name}" created at ${project.path}`);
      console.log('  Run: strata-sdk run <project-path>');
    } catch (err) {
      console.error(`✗ Error: ${err}`);
      process.exit(1);
    }
  });

/**
 * Build command
 */
program
  .command('build <project>')
  .description('Build a Strata project')
  .option('-O, --optimize <level>', 'Optimization level')
  .option('-v, --verbose', 'Verbose output')
  .action(async (project, options) => {
    try {
      console.log(`Building ${project}...`);
      const result = await runner.buildProject(project, {
        optimization: options.optimize,
        verbose: options.verbose
      });

      if (result.success) {
        console.log(`✓ Build successful (${result.duration}ms)`);
        console.log(`Output: ${result.outputFile}`);
      } else {
        console.error(`✗ Build failed:`);
        console.error(result.error);
        process.exit(1);
      }
    } catch (err) {
      console.error(`✗ Error: ${err}`);
      process.exit(1);
    }
  });

/**
 * Run command
 */
program
  .command('run <file>')
  .description('Compile and run a Strata file')
  .option('--args <args>', 'Arguments to pass to program')
  .action(async (file, options) => {
    try {
      console.log(`Running ${file}...`);
      const result = await runner.run(file, {
        args: options.args ? options.args.split(' ') : []
      });

      if (result.output) {
        console.log(result.output);
      }

      if (result.success) {
        console.log(`✓ Execution completed (${result.duration}ms)`);
      } else {
        console.error(`✗ Execution failed:`);
        console.error(result.error);
        process.exit(1);
      }
    } catch (err) {
      console.error(`✗ Error: ${err}`);
      process.exit(1);
    }
  });

/**
 * Typecheck command
 */
program
  .command('check <file>')
  .description('Type-check a Strata file')
  .action(async (file) => {
    try {
      const result = await runner.typeCheck(file);
      if (result.valid) {
        console.log(`✓ Type checking passed`);
      } else {
        console.error(`✗ Type errors found:`);
        result.errors.forEach(err => console.error(`  ${err}`));
        process.exit(1);
      }
    } catch (err) {
      console.error(`✗ Error: ${err}`);
      process.exit(1);
    }
  });

/**
 * Analyze command
 */
program
  .command('analyze <file>')
  .description('Analyze a Strata file')
  .action(async (file) => {
    try {
      const result = await runner.analyze(file);
      console.log('Imports:', result.imports.join(', ') || 'None');
      console.log('Functions:', result.functions.join(', ') || 'None');
      console.log('Types:', result.types.join(', ') || 'None');
      if (result.warnings.length > 0) {
        console.log('Warnings:');
        result.warnings.forEach(w => console.log(`  - ${w}`));
      }
    } catch (err) {
      console.error(`✗ Error: ${err}`);
      process.exit(1);
    }
  });

/**
 * Init command
 */
program
  .command('init')
  .description('Initialize Strata in current directory')
  .action(async () => {
    try {
      const cwd = process.cwd();
      const pm = runner.getProjectManager();
      const projectName = cwd.split('/').pop() || 'untitled';

      // Create strata.toml
      const toml = `[project]
name = "${projectName}"
version = "0.1.0"

[build]
target = "c"
optimization = "O2"
`;
      await fs.writeFile('./strata.toml', toml);

      // Create src/main.str
      await fs.mkdir('./src', { recursive: true });
      const mainStr = `import io from std::io

func main() {
  io.println("Hello, Strata!")
}
`;
      await fs.writeFile('./src/main.str', mainStr);

      console.log(`✓ Initialized Strata project`);
      console.log('Files created:');
      console.log('  - strata.toml');
      console.log('  - src/main.str');
    } catch (err) {
      console.error(`✗ Error: ${err}`);
      process.exit(1);
    }
  });

/**
 * GUI command
 */
program
  .command('gui')
  .description('Launch Strata IDE (Electron)')
  .action(async () => {
    try {
      console.log('Launching Strata IDE...');
      const { spawn } = await import('child_process');
      
      // Try to launch Electron IDE
      const electronPath = process.argv[1].replace('cli.js', 'gui.js');
      
      try {
        const child = spawn('node', [electronPath], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        console.log('✓ IDE launched');
      } catch {
        console.log('Note: Electron GUI requires additional setup.');
        console.log('Try: npm install electron');
        console.log('Then: strata-sdk gui');
      }
    } catch (err) {
      console.error(`✗ Error launching GUI: ${err}`);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
