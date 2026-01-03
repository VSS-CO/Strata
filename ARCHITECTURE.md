# Strata Architecture & Module System Specification

## Overview

This document specifies Strata's core architecture across:
1. **Module & Import System** - How code is organized and imported
2. **Standard Library Boundary** - What's built-in vs external
3. **Deterministic Builds** - How reproducibility is guaranteed
4. **Package Manager** - Dependency resolution and management

## Key Design Decisions

### Module System: File-Based, Explicit

Each `.str` file is a module with an explicit public namespace. All imports are explicit with clear syntax:

```strata
import io from std::io           // Standard library
import util from ./util          // Relative import
import http from http::client    // Package import
```

**Why explicit?** Avoids magic, makes dependencies visible, enables optimization.

### Standard Library: Reserved `std::` Namespace

The `std::` namespace is reserved and immutable. Standard library modules:
- `std::io` - Input/output, print, read, file operations
- `std::math` - Math functions
- `std::text` - String operations
- `std::util` - Misc utilities (expansion point)
- `std::time` - Time/date operations (future)

User code cannot shadow stdlib. Import resolution checks stdlib first.

### Deterministic Builds: Locked Dependencies

Reproducible builds require:
1. **strata.toml** - Project manifest (intent)
2. **strata.lock** - Exact locked versions (reality)
3. **Compiler version** - Pinned to single version
4. **Stdlib version** - Locked to compiler version

Same source + same lock file = identical binary across machines.

### Package Manager: Minimal and Explicit

The package manager (`strata` CLI) is:
- **Deterministic** - No randomness, same input → same output
- **Explicit** - All dependencies declared in strata.toml
- **Offline-capable** - Works with local cache, no network by default
- **No scripts** - Packages cannot execute code during install
- **Simple** - Avoids npm-style complexity

## Directory Structure

```
my-app/
├── strata.toml              # Project manifest
├── strata.lock              # Dependency lock file
├── .gitignore               # Excludes .strata/ and dist/
├── src/
│  ├── main.str
│  ├── util.str
│  └── _internal.str
├── .strata/                 # Generated (gitignored)
│  ├── packages/
│  │  ├── http/
│  │  │  ├── client.str
│  │  │  └── server.str
│  │  └── crypto/
│  │     └── aes.str
│  └── cache/
└── dist/
   └── my-app               # Compiled output
```

## strata.toml Format

```toml
[project]
name = "my-app"
version = "1.0.0"
strata = "1.5.2"            # Exact compiler version (required)

[build]
target = "c"                # or "js", "rust", "go", etc.
optimization = "O2"         # or "O0", "O1", "O3"
output = "./dist/my-app"

[dependencies]
http = "1.2.0"              # Exact version
crypto = ">=2.0.0,<3.0.0"   # Version range (resolved at lock-time)
utils = { path = "./vendor/utils" }  # Local path (dev)
git-lib = "git+https://github.com/org/lib#v1.2.0"  # Git ref

[warnings]
level = "strict"            # or "warn", "allow"
```

## strata.lock Format

```toml
[metadata]
strata = "1.5.2"            # Compiler version that created lock
generated = 2024-01-15T10:30:00Z

[[packages]]
name = "http"
requested = "1.2.0"
resolved = "1.2.0"
source = "registry"         # or "git", "path"
hash = "sha256:abc123..."   # Content verification

[[packages]]
name = "crypto"
requested = ">=2.0.0,<3.0.0"
resolved = "2.5.1"
source = "registry"
hash = "sha256:def456..."

[[packages]]
name = "utils"
requested = "path:./vendor/utils"
resolved = "./vendor/utils"
source = "path"
```

## Package Manager Commands

```bash
strata init                        # Create new project
strata build                       # Compile using strata.lock
strata run [args...]               # Compile and execute
strata add <pkg> [version]         # Add dependency
strata remove <pkg>                # Remove dependency
strata update [pkg]                # Update to latest allowed version
strata lock                        # Regenerate strata.lock
strata verify                      # Verify package hashes
strata doctor                      # Diagnose environment
strata publish                     # (Future) publish package
```

## Import Examples

### Standard Library Import

```strata
import io from std::io
import math from std::math

func main() => int {
  io.print("Hello")
  let x: float = math.sqrt(16.0)
  return 0
}
```

### Relative Import

```strata
import util from ./util        # src/util.str
import auth from ../auth       # auth.str in parent
import config from ./config/app # config/app.str
```

### Package Import

```strata
import http from http::client
import crypto from crypto::aes
import db from postgres::connection
```

Packages must be declared in strata.toml and resolved via strata.lock.

## Determinism Guarantees

Two builds are identical if:
- ✅ Same source code
- ✅ Same strata.toml and strata.lock
- ✅ Same compiler version
- ✅ Same target platform (linux-x64, macos-arm64, etc.)
- ✅ Same optimization flags

Two builds may differ if:
- ❌ Different compiler version
- ❌ Different strata.lock (different package versions)
- ❌ Different platform (bytecode/IR may vary by arch)
- ❌ Different optimization flags

## Multi-Target Compilation

The same Strata code compiles to:

| Target | Output | Use Case |
|--------|--------|----------|
| `c` | Native binary (via C) | Fast, portable, embeddable |
| `cpp` | Native binary (via C++) | Modern C++, STL integration |
| `rust` | Native binary | Memory-safe, zero-cost |
| `go` | Native binary | Concurrency, deployable |
| `java` | JVM bytecode | JVM ecosystem, portable |
| `kotlin` | JVM bytecode | Kotlin ecosystem, concise |
| `csharp` | .NET bytecode | .NET ecosystem, Windows |
| `python` | Python code | Scripting, data science |
| `ruby` | Ruby code | Web dev, quick scripting |
| `js` | JavaScript | Web, Node.js |
| `lua` | Lua | Embedded, games |
| `bytecode` | Strata bytecode | Interpreter, minimal |

Each target compiles deterministically with identical intermediate representation.

## Security Model

### No Code Execution During Install

Packages never execute code during dependency resolution. This prevents:
- Supply chain attacks
- Malware injection
- Build environment pollution

Packages must be pre-built and fully portable.

### Hash Verification

All packages verified against strata.lock hash (SHA256):
- Detects tampering
- Detects corrupted downloads
- Enables cache validation

### Module Isolation

Each package in isolated namespace. Package B cannot:
- Modify Package A's code
- Shadow stdlib
- Access private (_*) modules from other packages

### Transitive Trust Disabled (v1.0)

No transitive dependencies in v1.0. Each package is self-contained.
- Simpler resolver
- No dependency hell
- Can upgrade to transitive dependencies later

## Future Extensions

### Planned (v2.0)

- User-defined types and structs
- Pattern matching (match expressions)
- Union types and optional types
- Transitive dependencies with flattening
- Interfaces and traits
- Error handling patterns (Result types)

### Deferred (by design)

- Runtime reflection (compile-time types only)
- Dynamic typing (static preferred)
- Memory management APIs (automatic only)
- Concurrency primitives (platform-specific later)
- Exception handling (error patterns instead)

## Implementation Across Targets

Each compilation target (`c`, `rust`, `go`, `python`, etc.) preserves:
- Identical type semantics
- Identical module resolution
- Identical import behavior
- Identical determinism guarantees

Target-specific notes are in each implementation file:
- `implementations/c/main.c` - C compilation details
- `implementations/rust/src/main.rs` - Rust-specific considerations
- `implementations/go/main.go` - Go module system integration
- `implementations/python/main.py` - Python packaging
- (etc. for other targets)

## References

- **Main Implementation**: `index.ts` (TypeScript compiler)
- **Agent Guidelines**: `AGENTS.md`
- **Project Configuration**: `strata.toml` (user project)
- **Lock File**: `strata.lock` (committed to git)
- **Standard Library**: `stdlib/` (shipped with compiler)
