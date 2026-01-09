/**
 * Strata SDK - Main Entry Point
 * Production-grade SDK for Strata programming language
 *
 * Features:
 * - Compile Strata source to C, JavaScript, or bytecode
 * - Execute compiled programs with runtime management
 * - Project management and configuration
 * - Type checking and code analysis
 * - Event-driven architecture for GUI integration
 */

export * from './types/index.js';
export { StrataCompiler, StrataRuntime } from './core/index.js';
export { ProjectManager } from './project/index.js';
export { StrataRunner } from './runner/index.js';

// Version
export const SDK_VERSION = '1.0.0';
export const SDK_NAME = '@strata/sdk';

/**
 * Create a new SDK instance
 */
export async function createSDK(baseDir?: string) {
  const { StrataRunner } = await import('./runner/index.js');
  return new StrataRunner(baseDir);
}
