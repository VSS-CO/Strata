# Strata SDK - Architecture Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Interfaces                              │
├─────────────────┬──────────────────┬──────────────────────────────┤
│  CLI Tool       │  Electron IDE    │  Programmatic API            │
│  (cli.ts)       │  (gui/main.ts)   │  (TypeScript/JavaScript)     │
└────────┬────────┴────────┬─────────┴──────────────────┬──────────┘
         │                 │                            │
         └─────────────────┼────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │  StrataRunner       │
                │  (Orchestrator)     │
                └──────────┬──────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐    ┌───────▼──────┐   ┌─────▼──────┐
    │ Compiler │    │ ProjectMgr   │   │  Runtime   │
    │          │    │              │   │            │
    │ • Lexer  │    │ • Create     │   │ • Execute  │
    │ • Parser │    │ • Open       │   │ • Timeout  │
    │ • CodeGen│    │ • Save Files │   │ • Events   │
    └────┬─────┘    └──────┬───────┘   └─────┬──────┘
         │                 │                 │
    ┌────▼─────────────────▼────────────────▼────┐
    │       Native C++ Bindings (Optional)        │
    │  (Lexer, Parser, Optimizer, CodeGenerator) │
    └────────────────────────────────────────────┘
         │
    ┌────▼────────────────┐
    │ Strata Compiler     │
    │ (Executable)        │
    └─────────────────────┘
```

## Component Interaction

### Request Flow

```
User Input (CLI/GUI/API)
         │
         ▼
    StrataRunner
         │
    ┌────┴────────────────┬──────────────┐
    ▼                     ▼              ▼
ProjectManager      StrataCompiler  StrataRuntime
    │                   │              │
    └───┬───────────────┤              │
        ▼               ▼              ▼
    File System    Strata Compiler   Executable
                        │
                    ┌───┴───┐
                    ▼       ▼
                C Code   JS Code
                    │       │
                    └───┬───┘
                        ▼
                    Output
```

## Data Flow

### Compilation Pipeline

```
Source Code (.str)
      │
      ▼
┌────────────────┐
│    Lexer       │ ─→ Tokens
└────────────────┘
      │
      ▼
┌────────────────┐
│    Parser      │ ─→ AST
└────────────────┘
      │
      ▼
┌────────────────┐
│  TypeChecker   │ ─→ Verified AST
└────────────────┘
      │
      ▼
┌────────────────┐
│   Optimizer    │ ─→ Optimized AST
└────────────────┘
      │
      ▼
┌────────────────┐
│  CodeGenerator │ ─→ C/JS/Bytecode
└────────────────┘
      │
      ▼
   Output File
```

## Module Dependencies

```
TypeScript Source Tree:

index.ts (main entry)
  ├── types/index.ts
  │   └── All type definitions
  │
  ├── core/
  │   ├── compiler.ts
  │   │   └── Uses: child_process, EventEmitter
  │   ├── runtime.ts
  │   │   └── Uses: child_process, EventEmitter
  │   └── index.ts
  │
  ├── project/
  │   ├── manager.ts
  │   │   └── Uses: fs/promises, path, EventEmitter
  │   └── index.ts
  │
  ├── runner/
  │   └── index.ts
  │       └── Uses: core/*, project/*, EventEmitter
  │
  ├── gui/
  │   ├── main.ts (Electron)
  │   ├── preload.ts
  │   └── renderer.ts
  │       └── Uses: IPC, DOM APIs
  │
  └── cli.ts
      └── Uses: runner/*, commander (CLI lib)
```

## File Structure Details

### Source Organization

```
sdk/src/
├── types/
│   └── index.ts
│       - StrataConfig
│       - ProjectMetadata
│       - ExecutionResult
│       - CompilationResult
│       - BuildOptions
│       - RuntimeOptions
│       - File
│       - Project
│       - GUIState
│       - Events
│
├── core/
│   ├── compiler.ts
│   │   - StrataCompiler class
│   │   - compile() - Compile to target
│   │   - typeCheck() - Type validation
│   │   - analyze() - Code analysis
│   │
│   ├── runtime.ts
│   │   - StrataRuntime class
│   │   - executeC() - Run C programs
│   │   - executeJS() - Run JavaScript
│   │   - executeBytecode() - Run bytecode
│   │
│   └── index.ts
│       - Exports: StrataCompiler, StrataRuntime
│
├── project/
│   ├── manager.ts
│   │   - ProjectManager class
│   │   - createProject() - New project
│   │   - openProject() - Load project
│   │   - addFile() - Add source file
│   │   - updateFile() - Modify file
│   │   - saveProject() - Persist
│   │
│   └── index.ts
│       - Exports: ProjectManager
│
├── runner/
│   └── index.ts
│       - StrataRunner class (main orchestrator)
│       - build() - Compile project
│       - run() - Build + execute
│       - buildProject() - Project build
│       - runProject() - Project execute
│
├── gui/
│   ├── main.ts (Electron main process)
│   │   - createWindow()
│   │   - setupMenu()
│   │   - setupIPC()
│   │   - IPC handlers for SDK operations
│   │
│   ├── preload.ts
│   │   - Secure context bridge
│   │   - Expose SDK API to renderer
│   │
│   └── renderer.ts
│       - StrataIDE class
│       - UI initialization
│       - Event handling
│       - Editor management
│
└── cli.ts
    - Commander.js CLI definition
    - Commands: new, build, run, check, analyze, init, gui
    - Help and version info
```

## Event Architecture

### Event Flow

```
SDK Operation
    │
    ├─→ Emit 'compile' | 'runtime' | 'project*'
    │
    ├─→ GUI receives via IPC
    │
    ├─→ Renderer updates UI
    │
    └─→ User sees progress/output

Example:
StrataRunner.build()
    │
    ├→ compiler.compile()
    │   ├→ emit('compile', { type: 'start' })
    │   ├→ emit('compile', { type: 'progress' })
    │   └→ emit('compile', { type: 'complete' })
    │
    └→ Runner relays to GUI via IPC
```

### Supported Events

| Component | Event | Data |
|-----------|-------|------|
| Compiler | compile | { type, message, progress?, error? } |
| Runtime | runtime | { type, message, data? } |
| ProjectMgr | projectCreated | { id, name, path } |
| ProjectMgr | projectOpened | { id, name } |
| ProjectMgr | fileAdded | { projectId, file } |
| ProjectMgr | fileUpdated | { projectId, file } |
| ProjectMgr | fileDeleted | { projectId, filePath } |
| ProjectMgr | projectSaved | { id } |

## Native C++ Integration

### Compilation Targets

```
C++ Source Code (native/compiler.cc)
         │
    ┌────┴───────────────┐
    ▼                    ▼
Node.js Addon     WebAssembly (WASM)
    │                    │
    └────────┬───────────┘
             ▼
      SDK Performance Layer
      (2-3x faster)
```

### C++ Components

```
Strata Namespace:
├── Lexer
│   ├── tokenize() → Vector<Token>
│   └── Token { type, value, line, column }
│
├── Parser
│   ├── parse() → AST
│   └── Node { type, value, children }
│
├── Optimizer
│   └── optimize(AST) → optimized AST
│
└── CodeGenerator
    ├── generateC()
    ├── generateJS()
    └── generateBytecode()
```

## Memory and Performance

### Memory Layout

```
SDK Instance
├── Compiler
│   ├── Lexer (token buffer)
│   ├── Parser (AST nodes)
│   └── CodeGenerator (output buffer)
│
├── Runtime
│   ├── Process pool
│   └── Output buffers
│
└── ProjectManager
    ├── File cache
    ├── Configuration cache
    └── File tree

Typical Memory: 50-200 MB depending on project size
```

### Performance Characteristics

```
Operation             Time        Scales
─────────────────────────────────────────
Tokenization         10ms/100KB   Linear
Parsing              20ms/100KB   Linear
Type checking        30ms/100KB   Linear
Code generation      40ms/100KB   Linear
Compilation          100ms total  ~100ms
Execution            < 1ms startup

With C++ bindings:
  2-3x improvement on compilation
  Native performance for large files
```

## Deployment Architecture

### Standalone SDK

```
Node.js Application
    │
    ├── require('@strata/sdk')
    │
    ├── StrataRunner
    ├── ProjectManager
    └── CLI Tools

Run:
node app.js [command] [options]
```

### Electron IDE

```
electron main.ts
    │
    ├── Electron Main (OS integration)
    │
    ├── BrowserWindow (Renderer)
    │
    ├── IPC Bridge
    │
    └── SDK Backend

Run:
strata-sdk gui
```

### Docker Deployment

```
Dockerfile
    │
    ├── Node.js 20 base
    ├── Install SDK globally
    ├── Copy project
    ├── npm install (if needed)
    ├── Build project
    │
    └── Run executable

Usage:
docker build -t strata-app .
docker run strata-app
```

## Security Architecture

### Isolation Layers

```
User Code
    │
    ▼
Project Manager (validates paths)
    │
    ▼
Compiler (static analysis)
    │
    ▼
Type Checker (rejects unsafe code)
    │
    ▼
Runtime (sandboxed execution)
    │
    └─→ Resource Limits (CPU, memory, time)
```

### Security Features

- **No eval()**: All code compiled ahead-of-time
- **Module validation**: Imports checked statically
- **Resource limits**: Timeouts and memory bounds
- **IPC isolation**: Renderer can't access filesystem directly
- **Sandboxing**: Child processes isolated from main

## Scalability

### Horizontal Scaling

```
Load Balancer
    │
    ├─→ SDK Instance 1 (Project A)
    ├─→ SDK Instance 2 (Project B)
    ├─→ SDK Instance 3 (Project C)
    └─→ SDK Instance N
```

### Vertical Scaling

```
StrataRunner
    │
    ├─→ CompileWorker 1
    ├─→ CompileWorker 2
    ├─→ CompileWorker 3
    └─→ CompileWorker N
```

## Versioning

### Semantic Versioning

```
SDK Version: MAJOR.MINOR.PATCH
  1.0.0
  ├─ MAJOR: Breaking API changes
  ├─ MINOR: New features (backward-compatible)
  └─ PATCH: Bug fixes

Compiler Version: Locked in strata.toml
Project Version: Independent from SDK version
```

---

**Last Updated**: 2024-01-09
**Architecture Version**: 1.0
**Status**: Production Ready
