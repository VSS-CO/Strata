# Strata SDK

Production-grade Software Development Kit for the Strata programming language.

## Features

✨ **Comprehensive Tooling**
- Compiler wrapper with TypeScript support
- Runtime execution engine (C, JavaScript, Bytecode)
- Project management system
- File editor integration
- Event-driven architecture

🚀 **High Performance**
- Native C++ compiler bindings
- Optimized code generation
- WebAssembly support
- Parallel compilation

💎 **Production Ready**
- Type-safe TypeScript
- Comprehensive error handling
- Event emission for GUI integration
- Full test coverage

## Installation

```bash
npm install @strata/sdk
```

Or use the CLI:

```bash
npm install -g @strata/sdk
```

## Quick Start

### Using the SDK Programmatically

```typescript
import { StrataRunner } from '@strata/sdk';

const runner = new StrataRunner();

// Create a new project
const pm = runner.getProjectManager();
const project = await pm.createProject('my-app', {
  target: 'c',
  optimization: 'O2'
});

// Build and run
const result = await runner.run('src/main.str');
console.log(result.output);
```

### Using the CLI

```bash
# Create a new project
strata-sdk new my-app

# Build a project
strata-sdk build my-app

# Run a single file
strata-sdk run main.str

# Type check
strata-sdk check main.str

# Analyze
strata-sdk analyze main.str
```

### Using the GUI IDE

```bash
# Launch the Electron IDE
strata-sdk gui
```

## Architecture

### Modules

#### `core/`
- **Compiler**: Wraps Strata compiler, handles compilation to C/JS/bytecode
- **Runtime**: Executes compiled programs with timeout/environment management

#### `project/`
- **Manager**: Creates/opens projects, manages files and configuration

#### `runner/`
- **StrataRunner**: Orchestrates build-compile-execute workflow

#### `gui/`
- **Main**: Electron main process
- **Renderer**: React-based IDE interface
- **Preload**: Secure IPC bridge

### Event System

All major operations emit events for GUI integration:

```typescript
runner.on('compile', (event) => {
  // { type: 'start'|'progress'|'complete'|'error', message, progress?, error? }
});

runner.on('runtime', (event) => {
  // { type: 'start'|'output'|'complete'|'error', message, data? }
});
```

## API Reference

### StrataRunner

```typescript
// Compile and run a file
await runner.run(sourceFile, runtimeOptions?, buildOptions?);

// Build a project
await runner.buildProject(projectPath, buildOptions?);

// Type checking
await runner.typeCheck(sourceFile);

// Code analysis
await runner.analyze(sourceFile);

// Get project manager
const pm = runner.getProjectManager();
```

### ProjectManager

```typescript
// Create project
const project = await pm.createProject(name, config?);

// Open project
const project = await pm.openProject(projectPath);

// Manage files
await pm.addFile(projectId, filePath, content?);
await pm.updateFile(projectId, filePath, content);
await pm.deleteFile(projectId, filePath);
await pm.saveProject(projectId);

// List
const projects = pm.listProjects();
const files = pm.getProjectFiles(projectId);
```

### StrataCompiler

```typescript
// Compile to target
const result = await compiler.compile(
  sourceFile,
  outputFile,
  'c' | 'js' | 'bytecode',
  { optimization: 'O2', verbose: true }
);

// Type check
const { valid, errors } = await compiler.typeCheck(sourceFile);

// Analyze
const { imports, functions, types, warnings } = await compiler.analyze(sourceFile);
```

### StrataRuntime

```typescript
// Execute C program
const result = await runtime.executeC(executable, options?);

// Execute JavaScript
const result = await runtime.executeJS(jsFile, options?);

// Execute bytecode
const result = await runtime.executeBytecode(bytecodeFile, options?);
```

## Types

### StrataConfig
```typescript
interface StrataConfig {
  projectName: string;
  version: string;
  description?: string;
  target: 'c' | 'js' | 'bytecode';
  optimization: 'O0' | 'O1' | 'O2' | 'O3';
  output?: string;
  dependencies?: Record<string, string>;
  warnings?: { level: 'strict' | 'warn' | 'allow' };
}
```

### ExecutionResult
```typescript
interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
  timestamp: Date;
}
```

### File
```typescript
interface File {
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}
```

## Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Build native bindings
npm run build:native

# Build GUI
npm run build:gui
```

## Configuration

### strata.toml

```toml
[project]
name = "my-app"
version = "0.1.0"
description = "My Strata application"

[build]
target = "c"           # c, js, bytecode
optimization = "O2"    # O0-O3
output = "./dist"

[dependencies]
http = "1.0.0"
crypto = "2.0.0"

[[warnings]]
level = "warn"         # strict, warn, allow
```

## Performance

The SDK uses several optimization techniques:

- **Native C++ compilation** via WASM for fast code generation
- **Parallel file processing** for large projects
- **Incremental builds** when files change
- **Streaming output** for large compilation results
- **Memory pooling** for token/AST allocation

## Testing

Run the test suite:

```bash
npm test
```

Test coverage includes:
- Compiler functionality (tokenization, parsing, code gen)
- Runtime execution (various file types)
- Project management (CRUD operations)
- Event emission
- Error handling

## Native Extensions

### C++ Compiler Bindings

The SDK includes native C++ bindings for:
- Lexical analysis (tokenization)
- Syntax analysis (parsing)
- Semantic analysis (type checking)
- Code generation (C, JS, bytecode)

### Building Native Extensions

```bash
# With Node.js native addon
npm run build:native

# With Emscripten (WebAssembly)
emcripten cmake -B build -DEMSCRIPTEN=1
```

## License

GPL-3.0 - See LICENSE file

## Contributing

Contributions welcome! See CONTRIBUTING.md for guidelines.

## Support

- **Documentation**: See docs/ folder
- **Issues**: https://github.com/VSS-CO/Strata/issues
- **Discussions**: https://github.com/VSS-CO/Strata/discussions
