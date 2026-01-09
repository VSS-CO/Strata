/**
 * Strata SDK - Build & Run Orchestrator
 * Manages the complete build-compile-execute workflow
 */

import { EventEmitter } from 'events';
import { StrataCompiler } from '../core/compiler.js';
import { StrataRuntime } from '../core/runtime.js';
import { ProjectManager } from '../project/manager.js';
import type {
  BuildOptions,
  RuntimeOptions,
  ExecutionResult,
  CompilationResult
} from '../types/index.js';
import * as path from 'path';

export class StrataRunner extends EventEmitter {
  private compiler: StrataCompiler;
  private runtime: StrataRuntime;
  private projectManager: ProjectManager;

  constructor(baseDir?: string) {
    super();
    this.compiler = new StrataCompiler('strata');
    this.runtime = new StrataRuntime();
    this.projectManager = new ProjectManager(baseDir);

    // Relay events
    this.compiler.on('compile', (event) => this.emit('compile', event));
    this.runtime.on('runtime', (event) => this.emit('runtime', event));
    this.projectManager.on('projectCreated', (event) => this.emit('projectCreated', event));
    this.projectManager.on('projectOpened', (event) => this.emit('projectOpened', event));
  }

  /**
   * Build a Strata source file
   */
  async build(
    sourceFile: string,
    options: BuildOptions = {}
  ): Promise<CompilationResult> {
    const outputFile = options.watch ? sourceFile.replace('.str', '.js') : sourceFile.replace('.str', '.c');
    const target = options.watch ? 'js' : 'c';

    return this.compiler.compile(sourceFile, outputFile, target as 'c' | 'js', options);
  }

  /**
   * Build and run a Strata file
   */
  async run(
    sourceFile: string,
    runtimeOptions: RuntimeOptions = {},
    buildOptions: BuildOptions = {}
  ): Promise<ExecutionResult> {
    // Step 1: Compile to JavaScript
    const jsFile = sourceFile.replace('.str', '.js');
    const compileResult = await this.compiler.compile(sourceFile, jsFile, 'js', buildOptions);

    if (!compileResult.success) {
      return {
        success: false,
        output: compileResult.output,
        error: compileResult.error,
        exitCode: 1,
        duration: compileResult.duration,
        timestamp: new Date()
      };
    }

    // Step 2: Execute JavaScript
    return this.runtime.executeJS(jsFile, runtimeOptions);
  }

  /**
   * Build project from strata.toml
   */
  async buildProject(
    projectPath: string,
    options: BuildOptions = {}
  ): Promise<CompilationResult> {
    const project = await this.projectManager.openProject(projectPath);
    const mainFile = path.join(projectPath, 'src', 'main.str');

    return this.compiler.compile(
      mainFile,
      path.join(projectPath, 'dist', 'main'),
      project.config.target,
      options
    );
  }

  /**
   * Run compiled project
   */
  async runProject(
    projectPath: string,
    runtimeOptions: RuntimeOptions = {}
  ): Promise<ExecutionResult> {
    const project = await this.projectManager.openProject(projectPath);
    const executable = path.join(projectPath, 'dist', 'main');

    if (project.config.target === 'c') {
      return this.runtime.executeC(executable, runtimeOptions);
    } else {
      return this.runtime.executeJS(executable + '.js', runtimeOptions);
    }
  }

  /**
   * Type-check a file
   */
  async typeCheck(sourceFile: string) {
    return this.compiler.typeCheck(sourceFile);
  }

  /**
   * Analyze a file
   */
  async analyze(sourceFile: string) {
    return this.compiler.analyze(sourceFile);
  }

  /**
   * Access project manager
   */
  getProjectManager(): ProjectManager {
    return this.projectManager;
  }
}
