/**
 * Strata SDK - Type Definitions
 * Production-grade type system for Strata SDK
 */

export interface StrataConfig {
  projectName: string;
  version: string;
  description?: string;
  target: 'c' | 'js' | 'bytecode';
  optimization: 'O0' | 'O1' | 'O2' | 'O3';
  output?: string;
  dependencies?: Record<string, string>;
  warnings?: {
    level: 'strict' | 'warn' | 'allow';
  };
}

export interface ProjectMetadata {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  config: StrataConfig;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
  timestamp: Date;
}

export interface CompilationResult {
  success: boolean;
  output: string;
  error?: string;
  outputFile?: string;
  duration: number;
  timestamp: Date;
}

export interface BuildOptions {
  clean?: boolean;
  watch?: boolean;
  verbose?: boolean;
  optimization?: 'O0' | 'O1' | 'O2' | 'O3';
}

export interface RuntimeOptions {
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  cwd?: string;
}

export interface File {
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  files: Map<string, File>;
  config: StrataConfig;
  isOpen: boolean;
}

export interface GUIState {
  projects: ProjectMetadata[];
  activeProject?: string;
  openFiles: File[];
  executionResult?: ExecutionResult;
  compilationResult?: CompilationResult;
}

export interface CompileEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  message: string;
  progress?: number;
  error?: string;
}

export interface RuntimeEvent {
  type: 'start' | 'output' | 'complete' | 'error';
  message: string;
  data?: any;
}
