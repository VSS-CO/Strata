/**
 * Strata SDK - Core Compiler Interface
 * Wraps the Strata compiler (JavaScript version)
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import type { CompileEvent, CompilationResult, BuildOptions } from '../types/index.js';

export class StrataCompiler extends EventEmitter {
  private compilerPath: string;
  private verbose: boolean = false;

  constructor(compilerPath: string = 'strata') {
    super();
    this.compilerPath = compilerPath;
  }

  /**
   * Compile Strata source file to target (C, JS, or bytecode)
   */
  async compile(
    sourceFile: string,
    outputFile: string,
    target: 'c' | 'js' | 'bytecode' = 'c',
    options: BuildOptions = {}
  ): Promise<CompilationResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const args = [sourceFile, '-o', outputFile, '-t', target];

      if (options.optimization) {
        args.push('-O', options.optimization);
      }

      if (options.verbose) {
        args.push('-v');
        this.verbose = true;
      }

      this.emit('compile', {
        type: 'start',
        message: `Compiling ${sourceFile} → ${outputFile} (target: ${target})`
      } as CompileEvent);

      const compiler = spawn(this.compilerPath, args);
      let output = '';
      let error = '';

      compiler.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        if (this.verbose) {
          this.emit('compile', {
            type: 'progress',
            message: chunk,
            progress: 50
          } as CompileEvent);
        }
      });

      compiler.stderr?.on('data', (data) => {
        error += data.toString();
      });

      compiler.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result: CompilationResult = {
          success: code === 0,
          output,
          error: error || undefined,
          outputFile: code === 0 ? outputFile : undefined,
          duration,
          timestamp: new Date()
        };

        if (result.success) {
          this.emit('compile', {
            type: 'complete',
            message: `Compilation successful in ${duration}ms`
          } as CompileEvent);
        } else {
          this.emit('compile', {
            type: 'error',
            message: 'Compilation failed',
            error: error
          } as CompileEvent);
        }

        resolve(result);
      });
    });
  }

  /**
   * Type-check source file without compilation
   */
  async typeCheck(sourceFile: string): Promise<{ valid: boolean; errors: string[] }> {
    return new Promise((resolve) => {
      const args = [sourceFile, '--typecheck'];
      const proc = spawn(this.compilerPath, args);
      let errors = '';

      proc.stderr?.on('data', (data) => {
        errors += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          valid: code === 0,
          errors: errors ? errors.split('\n').filter(Boolean) : []
        });
      });
    });
  }

  /**
   * Analyze source file for diagnostics
   */
  async analyze(sourceFile: string): Promise<{
    imports: string[];
    functions: string[];
    types: string[];
    warnings: string[];
  }> {
    return new Promise((resolve) => {
      const args = [sourceFile, '--analyze'];
      const proc = spawn(this.compilerPath, args);
      let output = '';

      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', () => {
        try {
          const data = JSON.parse(output);
          resolve({
            imports: data.imports || [],
            functions: data.functions || [],
            types: data.types || [],
            warnings: data.warnings || []
          });
        } catch {
          resolve({
            imports: [],
            functions: [],
            types: [],
            warnings: ['Failed to analyze file']
          });
        }
      });
    });
  }
}
