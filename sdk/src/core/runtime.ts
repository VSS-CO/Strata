/**
 * Strata SDK - Runtime Execution Engine
 * Executes compiled Strata programs
 */

import { spawn, execFile } from 'child_process';
import { EventEmitter } from 'events';
import type { ExecutionResult, RuntimeOptions, RuntimeEvent } from '../types/index.js';

export class StrataRuntime extends EventEmitter {
  private timeout: number = 30000; // 30 seconds default

  /**
   * Execute compiled C output (requires gcc/clang)
   */
  async executeC(executable: string, options: RuntimeOptions = {}): Promise<ExecutionResult> {
    return this.executeProgram(executable, [], options);
  }

  /**
   * Execute JavaScript output with Node.js
   */
  async executeJS(jsFile: string, options: RuntimeOptions = {}): Promise<ExecutionResult> {
    return this.executeProgram('node', [jsFile], options);
  }

  /**
   * Execute Strata bytecode
   */
  async executeBytecode(bytecodeFile: string, options: RuntimeOptions = {}): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      // Use built-in bytecode VM
      const proc = spawn('strata-vm', [bytecodeFile], {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        timeout: options.timeout || this.timeout
      });

      let output = '';
      let error = '';

      proc.stdout?.on('data', (data) => {
        output += data.toString();
        this.emit('runtime', {
          type: 'output',
          message: data.toString(),
          data: { output }
        } as RuntimeEvent);
      });

      proc.stderr?.on('data', (data) => {
        error += data.toString();
        this.emit('runtime', {
          type: 'error',
          message: data.toString()
        } as RuntimeEvent);
      });

      proc.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result: ExecutionResult = {
          success: code === 0,
          output,
          error: error || undefined,
          exitCode: code || 1,
          duration,
          timestamp: new Date()
        };

        this.emit('runtime', {
          type: 'complete',
          message: `Execution completed with exit code ${code}`
        } as RuntimeEvent);

        resolve(result);
      });

      proc.on('error', (err) => {
        const duration = Date.now() - startTime;
        resolve({
          success: false,
          output,
          error: err.message,
          exitCode: 1,
          duration,
          timestamp: new Date()
        });
      });
    });
  }

  /**
   * Execute generic program
   */
  private executeProgram(
    command: string,
    args: string[] = [],
    options: RuntimeOptions = {}
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = options.timeout || this.timeout;

      this.emit('runtime', {
        type: 'start',
        message: `Executing: ${command} ${args.join(' ')}`
      } as RuntimeEvent);

      const proc = spawn(command, [...args, ...(options.args || [])], {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        timeout
      });

      let output = '';
      let error = '';

      proc.stdout?.on('data', (data) => {
        output += data.toString();
        this.emit('runtime', {
          type: 'output',
          message: data.toString()
        } as RuntimeEvent);
      });

      proc.stderr?.on('data', (data) => {
        error += data.toString();
      });

      const timeoutHandle = setTimeout(() => {
        proc.kill();
      }, timeout);

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;
        const result: ExecutionResult = {
          success: code === 0,
          output,
          error: error || undefined,
          exitCode: code || 1,
          duration,
          timestamp: new Date()
        };

        this.emit('runtime', {
          type: 'complete',
          message: `Program exited with code ${code}`
        } as RuntimeEvent);

        resolve(result);
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;
        resolve({
          success: false,
          output,
          error: err.message,
          exitCode: 1,
          duration,
          timestamp: new Date()
        });
      });
    });
  }

  /**
   * Set global timeout for executions
   */
  setTimeout(ms: number): void {
    this.timeout = ms;
  }
}
