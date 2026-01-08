# Strata SDK (Software Development Kit)

## Overview

The Strata SDK provides tools, libraries, and APIs for developers to build applications using the Strata programming language. It includes language bindings, standard library implementations, and compilation support across multiple target platforms.

## Programming Language Choices

### Core Language Stack

| Component | Language(s) | Rationale |
|-----------|-----------|-----------|
| **Compiler/Interpreter** | TypeScript | Single-file, zero-dependency implementation; compiles to JavaScript for Node.js; enables cross-platform distribution |
| **Standard Library (Interpreter)** | JavaScript | Native integration with Node.js runtime; leverages built-in modules for I/O, math, time operations |
| **C Code Generator** | TypeScript | Embedded in main compiler; generates portable C89/C99 code for native compilation |
| **Package Manager** | TypeScript/JavaScript | CLI tool for dependency resolution, installed via npm |
| **LSP Server** | TypeScript | Language Server Protocol implementation for IDE support (VS Code extension) |

### Target Language Support

The Strata compiler generates code in multiple languages:

| Target | Use Case | Output Type |
|--------|----------|------------|
| **C** | Performance-critical, embedded systems, portable | Native binary via C compiler |
| **C++** | Modern systems, STL integration, games | Native binary via C++ compiler |
| **Go** | Server applications, concurrency, deployment | Native binary or Go source |
| **Rust** | Memory-safe systems, zero-cost abstractions | Native binary or Rust source |
| **Python** | Data science, scripting, rapid development | Python source (.py) |
| **Ruby** | Web development, quick scripting | Ruby source (.rb) |
| **JavaScript** | Web browsers, Node.js, Electron | JavaScript source (.js) |
| **Java** | JVM ecosystem, cross-platform | Java source or bytecode |
| **C#** | .NET ecosystem, Windows applications | C# source or IL bytecode |
| **Bytecode** | Embedded interpreters, minimal overhead | Strata bytecode (.sbc) |

### IDE & Tooling Languages

| Tool | Language | Reason |
|------|----------|--------|
| **VS Code Extension** | TypeScript | Native VS Code API; compiles to JavaScript |
| **Web IDE** | TypeScript + Svelte | Interactive development experience |
| **Language Server** | TypeScript | Leverages compiler infrastructure directly |
| **CLI Tools** | TypeScript/JavaScript | Cross-platform via Node.js |
| **Package Registry Backend** | (Future) Node.js / Python / Go | TBD based on deployment model |

## SDK Components

### 1. Language Bindings

```
strata-sdk/
├── bindings/
│   ├── c/              # C header files for interop
│   ├── cpp/            # C++ wrapper classes
│   ├── python/         # Python ctypes/FFI bindings
│   ├── go/             # Go cgo bindings
│   ├── rust/           # Rust FFI bindings
│   └── java/           # Java JNI bindings
```

### 2. Standard Library Implementations

Implemented in **JavaScript** (interpreter) and **C** (code generation):

- `std::io` - Input/output operations
- `std::math` - Mathematical functions
- `std::text` - String manipulation
- `std::list` - Array/list operations
- `std::map` - Dictionary/map operations
- `std::set` - Set operations
- `std::file` - File system operations
- `std::regex` - Regular expressions
- `std::time` - Date/time functions
- `std::type` - Type introspection

### 3. Build & Runtime Tools

- **strata** CLI (TypeScript/Node.js)
  - `strata init` - Project initialization
  - `strata build` - Compilation
  - `strata run` - Execution
  - `strata add/remove` - Dependency management

- **Compiler** (TypeScript)
  - Lexer, Parser, Type Checker
  - Target-specific code generators
  - Optimization passes

### 4. Package Ecosystem

- **Local cache**: `~/.strata/cache/`
- **Project dependencies**: `.strata/packages/`
- **Lock file**: `strata.lock` (deterministic builds)
- **Manifest**: `strata.toml`

### 5. Development Extensions

- **VS Code Extension** (TypeScript)
  - Syntax highlighting
  - Type checking
  - Code completion
  - Integrated REPL

- **Language Server** (TypeScript)
  - Hover information
  - Jump to definition
  - Diagnostics
  - Refactoring

## Technical Design

### Why TypeScript for Core Tools?

1. **Single Language** - Compiler, LSP, CLI all in one language
2. **Zero Dependencies** - Only Node.js built-ins
3. **Cross-Platform** - Works on Windows, macOS, Linux
4. **Fast Distribution** - npm package, no native compilation needed
5. **Maintainability** - Type-safe, familiar to JavaScript developers

### Why Multiple Code Generation Targets?

1. **Flexibility** - Choose optimal backend for use case
2. **Portability** - Same Strata code works everywhere
3. **Determinism** - Identical output across platforms
4. **Performance** - Native code for speed-critical apps
5. **Integration** - Use with existing ecosystems

### Compilation Flow

```
Source Code (.str)
    ↓
Lexer (TypeScript)
    ↓
Parser (TypeScript)
    ↓
Type Checker (TypeScript)
    ↓
Code Generators (TypeScript)
    ├→ C Code → C Compiler → Binary
    ├→ Go Code → Go Compiler → Binary
    ├→ Rust Code → Rust Compiler → Binary
    ├→ Python Code → Python Runtime
    ├→ JavaScript → Node.js / Browser
    └→ Bytecode → Strata VM

Interpreter (JavaScript/TypeScript)
    ↓
Direct Execution
```

## Distribution & Installation

### npm Package

```bash
npm install -g @strata/compiler
npm install @strata/sdk          # For SDK libraries
```

### VS Code Extension

Available via VS Code Marketplace:
```
strata.strata-language-support
```

### Platform-Specific Tools

- Windows: `.msi` installer or Chocolatey
- macOS: Homebrew formula
- Linux: Apt/Yum packages
- Docker: `strata:latest` image

## Future Extensions

### Planned (v2.0+)

- **WASM Target** - Compile to WebAssembly
- **Mobile Support** - iOS/Android via Kotlin Native, Swift
- **GPU Compilation** - CUDA, OpenCL targets
- **Distributed Packages** - Centralized registry

### Deferred

- Runtime reflection
- Dynamic typing
- Exception handling (use Result types)
- Concurrency APIs (platform-specific)

## Language Choice Justification

### Core Implementation (TypeScript)
- ✅ Compiles to JavaScript (zero runtime dependencies)
- ✅ Strong type system (catch bugs at compile time)
- ✅ Easy to understand and modify
- ✅ Fast iteration and testing
- ✅ Leverages Node.js ecosystem

### Multiple Code Generators
- ✅ No vendor lock-in
- ✅ Optimal performance for each backend
- ✅ Existing developer communities
- ✅ Mature toolchains and ecosystems
- ✅ Integration with existing projects

### Package Manager (Node.js)
- ✅ Familiar to web developers
- ✅ Proven dependency resolution
- ✅ Cross-platform compatibility
- ✅ Simple distribution via npm

## Summary

The Strata SDK uses **TypeScript for all core tooling** (compiler, LSP, CLI) combined with **multiple code generation targets** (C, Go, Rust, Python, JavaScript, etc.). This design balances:

- **Simplicity**: Single implementation language for tools
- **Flexibility**: Many compilation targets for user programs
- **Performance**: Native code generation where needed
- **Portability**: Works across Windows, macOS, Linux
- **Maintainability**: Type-safe, self-contained, zero external dependencies
