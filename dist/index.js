// ============================================================================
// STRATA ARCHITECTURE & MODULE SYSTEM SPECIFICATION
// ============================================================================
//
// This file documents the core architecture design for Strata, including:
// - Module & Import System
// - Standard Library Boundary
// - Deterministic Builds
// - Package Manager Integration
//
// ============================================================================
// 1. MODULE & IMPORT SYSTEM
// ============================================================================
//
// DESIGN PRINCIPLES:
// - Explicit over implicit: all imports must be explicit, no implicit exports
// - File-based modules: each .str file is a module with a single public namespace
// - Deterministic resolution: no magic path resolution or environment variables
// - Portable: works identically on Windows, macOS, Linux
// - Compiler-agnostic: same import semantics for interpreter and C/JS generators
//
// IMPORT SYNTAX:
//
//   import <name> from <module_path>
//   import <name> from <"relative_path">
//   import <name> from <"absolute_path">
//
// Examples:
//
//   import io from std::io           // Standard library (always available)
//   import math from std::math       // Standard library math
//   import util from ./util          // Relative path (sibling)
//   import config from ../config     // Parent directory
//   import http from myapp::http     // Package: myapp/modules/http.str
//
// MODULE PATH RESOLUTION:
//
// 1. STANDARD LIBRARY (std::*)
//    - Always available, shipped with Strata compiler
//    - Location: <compiler_root>/stdlib/
//    - Files: std::io → stdlib/io.str, std::math → stdlib/math.str
//    - Immutable, pinned to compiler version
//    - Cannot be overridden by user code
//
// 2. ABSOLUTE PATHS (<"path">)
//    - Explicit file-system paths relative to project root
//    - Format: <"./file">, <"../parent/file">, <"/absolute/to/root">
//    - Always interpreted relative to strata.toml location
//    - Extension (.str) optional but recommended for clarity
//
// 3. RELATIVE PATHS (./path)
//    - Relative to the importing file's directory
//    - Format: ./sibling.str, ../parent.str, ../../ancestor.str
//    - Must start with ./ or ../
//    - No bare imports (no "util" without package context)
//
// 4. PACKAGE IMPORTS (package::module)
//    - Format: <package_name>::<module_path>
//    - Maps to: <project_root>/.strata/packages/<package_name>/<module_path>.str
//    - Resolved via strata.lock for exact versions
//    - Cannot shadow stdlib
//
// MODULE DEFINITION:
//
// A module is a .str file that exports a namespace. All top-level bindings
// (functions, types, constants) are part of the module's public API.
//
// Example module: myapp/util.str
//
//   func add(a: int, b: int) => int {
//     return a + b
//   }
//   
//   const VERSION: string = "1.0"
//
// Usage:
//
//   import util from myapp::util
//   let x: int = util.add(1, 2)       // Access via namespace
//   io.print(util.VERSION)
//
// PRIVATE (INTERNAL) MODULES:
//
// Module names starting with _ are internal and should not be imported by
// external packages. Example: myapp::_internal
// This is a convention, not enforced by the compiler (for simplicity).
//
// IMPORT BEHAVIOR:
//
// - Imports are evaluated at compile time (static)
// - Circular imports are errors (detected during compilation)
// - Each module is evaluated exactly once per compilation
// - Import creates a namespace binding in the importing module's scope
// - Imported names do NOT leak to code that imports the importing module
//   (i.e., imports are not transitive)
//
// ============================================================================
// 2. STANDARD LIBRARY BOUNDARY
// ============================================================================
//
// STDLIB MODULES:
//
// The standard library is the minimal set of modules shipped with Strata.
// All stdlib imports use the std:: namespace prefix.
//
// Current stdlib (v1.0):
//
//   std::io         → input/output, print, read, file operations
//   std::math       → arithmetic functions, sin, cos, sqrt, etc.
//   std::text       → string operations, split, join, trim
//   std::util       → misc utilities (later expansion point)
//   std::time       → time/date operations (future)
//
// Each stdlib module is versioned with the compiler.
// Compiler version 1.5.2 includes stdlib version 1.5.2 (locked together).
//
// PREVENTION OF SHADOWING:
//
// Strata's import system prevents accidental shadowing:
//
//   1. User code cannot create a module named "std" (reserved)
//   2. Import resolution checks stdlib first
//   3. If a file is imported via both std:: and package::, compilation error
//   4. No $ variables or _ prefixes that could collide with stdlib internals
//
// EXTERNAL PACKAGES:
//
// Packages are modules not in stdlib. They must:
// - Be declared in strata.toml
// - Be explicitly versioned in strata.lock
// - Be imported via package::module syntax
// - Cannot use std:: namespace
// - Cannot override stdlib modules
//
// ============================================================================
// 3. DETERMINISTIC BUILDS
// ============================================================================
//
// REPRODUCIBILITY GUARANTEES:
//
// The same source code compiled with the same environment produces
// identical output across machines.
//
// Components that affect output:
// 1. Compiler version (strata 1.5.2)
// 2. Stdlib version (locked to compiler version)
// 3. Package versions (locked in strata.lock)
// 4. Source code (of course)
// 5. Target platform (x86-64-linux, arm64-macos, x86-64-windows)
// 6. Optimization flags (specified in strata.toml)
//
// Components that do NOT affect determinism:
// - File system order (all files processed in sorted order)
// - Build machine (Windows, macOS, Linux produce identical bytecode)
// - System environment variables
// - System time
// - Cache state (rebuild from scratch = same result)
//
// STRATA.TOML (Project Configuration):
//
//   [project]
//   name = "my-app"
//   version = "1.0.0"
//   strata = "1.5.2"                 # Compiler version (exact)
//   
//   [build]
//   target = "c"                      # or "js", "bytecode"
//   optimization = "O2"               # or "O0", "O1", "O3"
//   output = "./dist/my-app"
//   
//   [dependencies]
//   http = "1.2.0"                    # Package name = version
//   crypto = ">=2.0.0,<3.0.0"         # Version range (resolved at lock-time)
//   utils = { path = "./vendor/utils" } # Local package (development)
//   git-lib = "git+https://github.com/org/lib#v1.2.0"  # Git dependency
//   
//   [[warnings]]
//   level = "strict"                  # or "warn", "allow"
//
// STRATA.LOCK (Dependency Lock File):
//
//   [metadata]
//   strata = "1.5.2"                  # Compiler version that created lock
//   generated = 2024-01-15T10:30:00Z
//   
//   [[packages]]
//   name = "http"
//   requested = "1.2.0"
//   resolved = "1.2.0"
//   source = "registry"               # or "git", "path"
//   hash = "sha256:abc123..."         # Content hash for verification
//   
//   [[packages]]
//   name = "crypto"
//   requested = ">=2.0.0,<3.0.0"
//   resolved = "2.5.1"
//   source = "registry"
//   hash = "sha256:def456..."
//   
//   [[packages]]
//   name = "utils"
//   requested = "path:./vendor/utils"
//   resolved = "./vendor/utils"
//   source = "path"
//
// COMPILER VERSION PINNING:
//
// If strata.toml specifies strata = "1.5.2", only that version may be used.
// Attempting to compile with 1.5.3 or 1.6.0 fails with clear error:
//
//   Error: Project requires Strata 1.5.2, but you have 1.6.0
//   Use: strata update-compiler 1.5.2
//
// This prevents subtle differences in compiler behavior from silently
// affecting builds.
//
// ============================================================================
// 4. PACKAGE MANAGER DESIGN
// ============================================================================
//
// PHILOSOPHY:
// - Explicit over implicit (no magic)
// - Deterministic (same input → same output)
// - Offline-first (local cache, no network unless needed)
// - Simple (avoid npm-style complexity)
// - Future-proof (allow centralized registry, but don't require it)
//
// PACKAGE MANAGER COMMANDS:
//
//   strata init                        # Create new project (generates strata.toml)
//   strata build                       # Compile to target (uses strata.lock)
//   strata run [args...]               # Compile and execute
//   strata add <package> [version]     # Add dependency (updates strata.toml + lock)
//   strata remove <package>            # Remove dependency
//   strata update [package]            # Update packages to latest allowed version
//   strata lock                        # Regenerate strata.lock from strata.toml
//   strata verify                      # Verify all packages match lock file hashes
//   strata doctor                      # Diagnose environment and dependencies
//   strata publish                     # (Future) publish to registry
//
// PACKAGE STORAGE:
//
// All packages stored in:
//   <project_root>/.strata/packages/<package_name>/
//
// Lock file location:
//   <project_root>/strata.lock
//
// Cache location:
//   <home>/.strata/cache/
//     registry/              # Downloaded from registry
//     git/                   # Cloned from git
//
// PROJECT LAYOUT EXAMPLE:
//
//   my-app/
//   ├── strata.toml            # Project manifest
//   ├── strata.lock            # Locked dependencies
//   ├── .gitignore             # Excludes .strata/ and dist/
//   ├── src/
//   │  ├── main.str
//   │  ├── util.str
//   │  └── _internal.str       # Private module
//   ├── .strata/               # Generated by package manager (gitignored)
//   │  ├── packages/
//   │  │  ├── http/
//   │  │  │  ├── client.str
//   │  │  │  ├── server.str
//   │  │  │  └── _utils.str
//   │  │  └── crypto/
//   │  │     └── aes.str
//   │  └── metadata/           # Package metadata, not needed at runtime
//   └── dist/
//      └── my-app.c            # Generated C code
//
// DEPENDENCY RESOLUTION:
//
// 1. User runs: strata add http 1.2.0
// 2. strata checks cache, finds http@1.2.0, downloads if needed
// 3. strata verifies hash matches (if in lock file)
// 4. strata extracts to .strata/packages/http/
// 5. strata.toml updated: http = "1.2.0"
// 6. strata.lock updated with exact version and hash
// 7. No script execution, no post-install hooks
//
// VERSION RESOLUTION:
//
// When strata.toml has: http = ">=1.2.0,<2.0.0"
// strata lock command finds highest version matching range in registry
// and locks it in strata.lock.
// Next developer runs strata build → uses exact version from lock.
//
// OFFLINE MODE:
//
// If a package is in cache and hash matches lock file, use it.
// If not in cache or hash mismatch:
//   - If offline flag set: error (fail fast)
//   - If online: fetch and verify
//
//   strata build --offline     # Only use cached packages
//   strata build               # Fetch if needed
//
// GIT DEPENDENCIES:
//
// strata.toml:
//   git-lib = "git+https://github.com/org/lib#v1.2.0"
//
// strata.lock resolves to:
//   resolved = "git+https://github.com/org/lib@abc123def456..."
//   source = "git"
//   ref = "v1.2.0"            # Original tag/branch
//   commit = "abc123def456"    # Resolved commit hash
//
// Path dependencies (for development):
//
// strata.toml:
//   my-utils = { path = "./vendor/my-utils" }
//
// strata.lock:
//   source = "path"
//   resolved = "./vendor/my-utils"
//
// Path deps are NOT versioned but DO include hash for change detection.
//
// REGISTRY INTERFACE (Future):
//
// When a centralized registry exists, it must support:
//
//   GET /api/v1/package/<name>/<version>
//     Returns: { name, version, hash, size, dependencies, ... }
//
//   GET /api/v1/package/<name>/latest
//     Returns: latest version metadata
//
//   GET /api/v1/search?q=<term>
//     Returns: matching packages
//
//   Authentication: API keys in ~/.strata/credentials (not in repo)
//
// SECURITY CONSIDERATIONS:
//
// 1. Hash verification: All packages verified against strata.lock hash
// 2. No code execution: Package manager never runs user code
// 3. Lockfile in git: strata.lock MUST be committed to version control
// 4. Isolation: Each package in isolated directory, cannot modify others
// 5. No transitive trust: Package B cannot modify what Package A sees
//
// EDGE CASES:
//
// Q: What if two packages export conflicting names?
// A: Each is namespaced: import http from pkg1::http, import text from pkg2::text
//
// Q: What if a package depends on another package?
// A: Not allowed in v1.0 (flat dependency model). Packages are self-contained.
//    Future: transitive dependencies with flattening algorithm.
//
// Q: What if strata.lock gets corrupted?
// A: strata verify reports issues. strata lock --force regenerates.
//
// Q: Offline development without registry?
// A: Use path dependencies (point to local directories). Works without registry.
//
// ============================================================================
// 5. IMPORT EXAMPLES IN PRACTICE
// ============================================================================
//
// Project: web-server
// strata.toml:
//   [project]
//   name = "web-server"
//   version = "2.1.0"
//   strata = "1.5.2"
//
//   [dependencies]
//   http = "1.2.0"
//   crypto = ">=2.0.0,<3.0.0"
//
// Directory structure:
//   web-server/
//   ├── strata.toml
//   ├── strata.lock
//   ├── src/
//   │  ├── main.str
//   │  ├── handlers.str
//   │  └── _crypto_utils.str
//   └── .strata/packages/
//      ├── http/
//      │  ├── client.str
//      │  ├── server.str
//      │  └── _utils.str
//      └── crypto/
//         └── aes.str
//
// main.str:
//
//   import io from std::io
//   import math from std::math
//   import server from http::server        # From http package
//   import aes from crypto::aes            # From crypto package
//   import handlers from ./handlers        # Relative import
//
//   func main() => int {
//     let port: int = 8080
//     server.listen(port)
//     return 0
//   }
//
// handlers.str:
//
//   import io from std::io
//   import utils from http::_utils         # Can import private modules
//   import crypto from ./_crypto_utils     # Local private module
//
//   func handleRequest(path: string) => string {
//     io.print(path)
//     return "OK"
//   }
//
// ============================================================================
// 6. COMPILER INTEGRATION
// ============================================================================
//
// INTERPRETER (strata run main.str):
// 1. Read strata.toml and strata.lock
// 2. Load stdlib modules (std::*)
// 3. Load package modules from .strata/packages/
// 4. Parse and type-check main.str (resolves imports)
// 5. Execute AST in interpreter
//
// COMPILER TO C (strata build --target c):
// 1. Same as interpreter but generates C code instead of interpreting
// 2. Include all referenced modules in output
// 3. Generate C with proper namespacing to avoid symbol collisions
// 4. Output: dist/my-app.c
//
// COMPILER TO JS (strata build --target js):
// 1. Generate JavaScript modules
// 2. Output: dist/my-app.js
// 3. Each Strata module → JavaScript module with namespace
//
// ============================================================================
// 7. DESIGN RATIONALE
// ============================================================================
//
// WHY explicit imports over implicit?
//   → Avoids magic, makes dependencies visible, easier to understand code
//   → Enables dead code elimination and dependency tracking
//
// WHY file-based modules?
//   → Simple, no complex registry or export syntax
//   → 1 file = 1 module = 1 namespace = easy mental model
//   → Matches most developers' expectations
//
// WHY no bare imports?
//   → "import util" is ambiguous (local? stdlib? package?)
//   → Force explicit: ./util (relative) or pkg::util (package)
//   → Prevents mistakes, makes refactoring safe
//
// WHY strata.toml + strata.lock?
//   → Similar to Cargo.toml + Cargo.lock, proven model
//   → Separates intent (toml) from reality (lock)
//   → Lock file enables reproducible builds
//   → Both committed to git for team consistency
//
// WHY no transitive dependencies in v1.0?
//   → Eliminates dependency hell and version conflicts
//   → Simpler resolver, easier to understand
//   → Can upgrade to transitive later with flattening
//
// WHY hash verification?
//   → Detects tampering, corrupted downloads, cache invalidation
//   → Essential for security and reliability
//
// WHY no post-install scripts?
//   → Unsafe (arbitrary code execution from untrusted sources)
//   → Slow (requires toolchain to be installed)
//   → Unpredictable (system-dependent)
//   → Instead: packages must be pre-built, fully portable
//
// ============================================================================
import * as fs from "fs";
import * as process from "process";
const TYPE_REGISTRY = {
    // Core Primitive Types
    int: { kind: "primitive", primitive: "int" },
    float: { kind: "primitive", primitive: "float" },
    bool: { kind: "primitive", primitive: "bool" },
    char: { kind: "primitive", primitive: "char" },
    string: { kind: "primitive", primitive: "string" },
    any: { kind: "primitive", primitive: "any" },
    // Rust-style Signed Integers
    i8: { kind: "primitive", primitive: "i8" },
    i16: { kind: "primitive", primitive: "i16" },
    i32: { kind: "primitive", primitive: "i32" },
    i64: { kind: "primitive", primitive: "i64" },
    // Rust-style Unsigned Integers
    u8: { kind: "primitive", primitive: "u8" },
    u16: { kind: "primitive", primitive: "u16" },
    u32: { kind: "primitive", primitive: "u32" },
    u64: { kind: "primitive", primitive: "u64" },
    // Floating Point Types
    f32: { kind: "primitive", primitive: "f32" },
    f64: { kind: "primitive", primitive: "f64" },
    // Collection Types (Python, Go, Ruby, JavaScript)
    array: { kind: "primitive", primitive: "array" },
    list: { kind: "primitive", primitive: "list" },
    map: { kind: "primitive", primitive: "map" },
    dict: { kind: "primitive", primitive: "dict" },
    set: { kind: "primitive", primitive: "set" },
    tuple: { kind: "primitive", primitive: "tuple" },
    // Advanced Types (TypeScript, Rust, Go)
    option: { kind: "primitive", primitive: "option" },
    result: { kind: "primitive", primitive: "result" },
    promise: { kind: "primitive", primitive: "promise" },
    void: { kind: "primitive", primitive: "void" },
    null: { kind: "primitive", primitive: "null" },
    undefined: { kind: "primitive", primitive: "undefined" },
    // Regular Expression Support (Python, Ruby, JavaScript, Go)
    regex: { kind: "primitive", primitive: "regex" },
    pattern: { kind: "primitive", primitive: "pattern" },
    // R/NumPy Scientific Computing Types
    complex: { kind: "primitive", primitive: "complex" },
    matrix: { kind: "primitive", primitive: "matrix" },
    dataframe: { kind: "primitive", primitive: "dataframe" },
    // Function Types (JavaScript, TypeScript, Python, Ruby, Rust)
    callable: { kind: "primitive", primitive: "callable" },
    lambda: { kind: "primitive", primitive: "lambda" },
    closure: { kind: "primitive", primitive: "closure" },
};
// ============================================================================
// EXTENDED BUILT-IN FUNCTIONS - Multi-Language Features
// ============================================================================
// This registry provides language features from: Ruby, Python, JavaScript,
// TypeScript, Go, Rust, C++, C#, R, and C while maintaining Strata syntax
const BUILTIN_FUNCTIONS = {
    // STRING OPERATIONS (Python, Ruby, JavaScript)
    strlen: (args) => args[0]?.length ?? 0,
    substr: (args) => args[0]?.substring(args[1], args[2]) ?? "",
    toUpperCase: (args) => args[0]?.toUpperCase?.() ?? "",
    toLowerCase: (args) => args[0]?.toLowerCase?.() ?? "",
    trim: (args) => args[0]?.trim?.() ?? "",
    split: (args) => (args[0]?.split?.(args[1]) ?? []).join(","),
    join: (args) => args[0]?.join?.(args[1]) ?? "",
    startsWith: (args) => args[0]?.startsWith?.(args[1]) ?? false,
    endsWith: (args) => args[0]?.endsWith?.(args[1]) ?? false,
    includes: (args) => args[0]?.includes?.(args[1]) ?? false,
    indexOf: (args) => args[0]?.indexOf?.(args[1]) ?? -1,
    replace: (args) => args[0]?.replace?.(args[1], args[2]) ?? "",
    replaceAll: (args) => args[0]?.replaceAll?.(args[1], args[2]) ?? "",
    repeat: (args) => args[0]?.repeat?.(args[1]) ?? "",
    slice: (args) => args[0]?.slice?.(args[1], args[2]) ?? "",
    // ARRAY/LIST OPERATIONS (Python, JavaScript, Go, Rust)
    push: (args) => { args[0]?.push?.(args[1]); return args[0]; },
    pop: (args) => args[0]?.pop?.(),
    shift: (args) => args[0]?.shift?.(),
    unshift: (args) => { args[0]?.unshift?.(args[1]); return args[0]; },
    splice: (args) => args[0]?.splice?.(args[1], args[2]) ?? [],
    map: (args) => args[0]?.map?.(args[1]) ?? [],
    filter: (args) => args[0]?.filter?.(args[1]) ?? [],
    reduce: (args) => args[0]?.reduce?.(args[1], args[2]),
    forEach: (args) => { args[0]?.forEach?.(args[1]); },
    find: (args) => args[0]?.find?.(args[1]),
    findIndex: (args) => args[0]?.findIndex?.(args[1]) ?? -1,
    some: (args) => args[0]?.some?.(args[1]) ?? false,
    every: (args) => args[0]?.every?.(args[1]) ?? false,
    reverse: (args) => { args[0]?.reverse?.(); return args[0]; },
    sort: (args) => { args[0]?.sort?.(args[1]); return args[0]; },
    concat: (args) => args[0]?.concat?.(args[1]) ?? [],
    flat: (args) => args[0]?.flat?.(args[1] ?? 1) ?? [],
    flatMap: (args) => args[0]?.flatMap?.(args[1]) ?? [],
    includes_arr: (args) => args[0]?.includes?.(args[1]) ?? false,
    lastIndexOf: (args) => args[0]?.lastIndexOf?.(args[1]) ?? -1,
    // DICTIONARY/MAP OPERATIONS (Python, JavaScript, Go, Rust)
    keys: (args) => Object.keys(args[0] ?? {}) ?? [],
    values: (args) => Object.values(args[0] ?? {}) ?? [],
    entries: (args) => Object.entries(args[0] ?? {}) ?? [],
    has: (args) => (args[0] ?? {})?.[args[1]] !== undefined,
    delete: (args) => { delete (args[0] ?? {})[args[1]]; return args[0]; },
    clear: (args) => { for (let k in args[0])
        delete args[0][k]; return args[0]; },
    get: (args) => (args[0] ?? {})[args[1]],
    set: (args) => { (args[0] ?? {})[args[1]] = args[2]; return args[0]; },
    // SET OPERATIONS (Python, Go, Rust)
    add: (args) => { args[0]?.add?.(args[1]); return args[0]; },
    remove: (args) => { args[0]?.delete?.(args[1]); return args[0]; },
    union: (args) => new Set([...(args[0] ?? []), ...(args[1] ?? [])]),
    intersection: (args) => new Set([...(args[0] ?? [])].filter(x => args[1]?.has?.(x))),
    difference: (args) => new Set([...(args[0] ?? [])].filter(x => !args[1]?.has?.(x))),
    // MATH OPERATIONS (R, Python, C, C++)
    abs: (args) => Math.abs(args[0]),
    sqrt: (args) => Math.sqrt(args[0]),
    pow: (args) => Math.pow(args[0], args[1]),
    sin: (args) => Math.sin(args[0]),
    cos: (args) => Math.cos(args[0]),
    tan: (args) => Math.tan(args[0]),
    asin: (args) => Math.asin(args[0]),
    acos: (args) => Math.acos(args[0]),
    atan: (args) => Math.atan(args[0]),
    atan2: (args) => Math.atan2(args[0], args[1]),
    exp: (args) => Math.exp(args[0]),
    log: (args) => Math.log(args[0]),
    log10: (args) => Math.log10(args[0]),
    log2: (args) => Math.log2(args[0]),
    ceil: (args) => Math.ceil(args[0]),
    floor: (args) => Math.floor(args[0]),
    round: (args) => Math.round(args[0]),
    trunc: (args) => Math.trunc(args[0]),
    max: (args) => Math.max(...args),
    min: (args) => Math.min(...args),
    gcd: (args) => {
        let a = Math.abs(args[0]), b = Math.abs(args[1]);
        while (b)
            [a, b] = [b, a % b];
        return a;
    },
    lcm: (args) => Math.abs(args[0] * args[1]) / BUILTIN_FUNCTIONS.gcd([args[0], args[1]]),
    // RANDOM OPERATIONS (Python, Go, JavaScript, Ruby)
    random: (args) => Math.random(),
    randomInt: (args) => Math.floor(Math.random() * (args[1] - args[0] + 1)) + args[0],
    randomFloat: (args) => Math.random() * (args[1] - args[0]) + args[0],
    // TYPE CHECKING/CONVERSION (Python, JavaScript, TypeScript)
    typeof: (args) => typeof args[0],
    parseInt: (args) => parseInt(args[0], args[1] ?? 10),
    parseFloat: (args) => parseFloat(args[0]),
    toString: (args) => String(args[0]),
    toBoolean: (args) => Boolean(args[0]),
    toNumber: (args) => Number(args[0]),
    isNaN: (args) => isNaN(args[0]),
    isFinite: (args) => isFinite(args[0]),
    isInteger: (args) => Number.isInteger(args[0]),
    isArray: (args) => Array.isArray(args[0]),
    isObject: (args) => args[0] !== null && typeof args[0] === "object",
    isNull: (args) => args[0] === null,
    isUndefined: (args) => args[0] === undefined,
    // ERROR HANDLING (Go, Rust, C++)
    try: (args) => { try {
        return args[0]?.();
    }
    catch (e) {
        return e;
    } },
    catch: (args) => args[0] instanceof Error ? args[1]?.(args[0]) : args[0],
    panic: (args) => { throw new Error(args[0]); },
    defer: (args) => { /* deferred execution placeholder */ return args[0]; },
    // FILE OPERATIONS (Python, Go, C, C++)
    readFile: (args) => { try {
        return fs.readFileSync(args[0], "utf-8");
    }
    catch {
        return null;
    } },
    writeFile: (args) => { try {
        fs.writeFileSync(args[0], args[1]);
        return true;
    }
    catch {
        return false;
    } },
    appendFile: (args) => { try {
        fs.appendFileSync(args[0], args[1]);
        return true;
    }
    catch {
        return false;
    } },
    deleteFile: (args) => { try {
        fs.unlinkSync(args[0]);
        return true;
    }
    catch {
        return false;
    } },
    exists: (args) => fs.existsSync(args[0]),
    isFile: (args) => { try {
        return fs.statSync(args[0]).isFile();
    }
    catch {
        return false;
    } },
    isDirectory: (args) => { try {
        return fs.statSync(args[0]).isDirectory();
    }
    catch {
        return false;
    } },
    mkdir: (args) => { try {
        fs.mkdirSync(args[0], { recursive: true });
        return true;
    }
    catch {
        return false;
    } },
    // REGEX OPERATIONS (Python, Ruby, JavaScript, Go)
    match: (args) => {
        try {
            const m = args[0]?.match?.(new RegExp(args[1], args[2] ?? ""));
            return m ?? null;
        }
        catch {
            return null;
        }
    },
    test: (args) => {
        try {
            return new RegExp(args[1], args[2] ?? "").test(args[0]);
        }
        catch {
            return false;
        }
    },
    search: (args) => {
        try {
            return args[0]?.search?.(new RegExp(args[1], args[2] ?? ""));
        }
        catch {
            return -1;
        }
    },
    matchAll: (args) => {
        try {
            return [...args[0]?.matchAll?.(new RegExp(args[1], "g")) ?? []];
        }
        catch {
            return [];
        }
    },
    // DATETIME OPERATIONS (Python, Go, JavaScript, Ruby)
    now: (args) => new Date().getTime(),
    timestamp: (args) => Math.floor(new Date().getTime() / 1000),
    getDate: (args) => new Date(args[0]).getDate(),
    getMonth: (args) => new Date(args[0]).getMonth() + 1,
    getYear: (args) => new Date(args[0]).getFullYear(),
    getHours: (args) => new Date(args[0]).getHours(),
    getMinutes: (args) => new Date(args[0]).getMinutes(),
    getSeconds: (args) => new Date(args[0]).getSeconds(),
    // PROMISE/ASYNC OPERATIONS (JavaScript, TypeScript, Python async)
    Promise: (args) => new Promise(args[0]),
    resolve: (args) => Promise.resolve(args[0]),
    reject: (args) => Promise.reject(args[0]),
    // TUPLES (Python, Go, Rust)
    tuple: (args) => Object.freeze(Array.from(args)),
    untuple: (args) => Array.from(args[0] ?? []),
    // OPTIONAL/NULL HANDLING (Rust, TypeScript, Go)
    Some: (args) => ({ type: "some", value: args[0] }),
    None: (args) => ({ type: "none" }),
    unwrap: (args) => args[0]?.type === "some" ? args[0].value : (() => { throw new Error("unwrap of None"); })(),
    unwrapOr: (args) => args[0]?.type === "some" ? args[0].value : args[1],
    isSome: (args) => args[0]?.type === "some",
    isNone: (args) => args[0]?.type === "none",
    // RESULT OPERATIONS (Rust, Go)
    Ok: (args) => ({ type: "ok", value: args[0] }),
    Err: (args) => ({ type: "err", error: args[0] }),
    isOk: (args) => args[0]?.type === "ok",
    isErr: (args) => args[0]?.type === "err",
    // ITERATOR/GENERATOR OPERATIONS (Python, JavaScript, Go)
    range: (args) => Array.from({ length: args[1] - args[0] }, (_, i) => i + args[0]),
    enumerate: (args) => args[0]?.map?.((v, i) => [i, v]) ?? [],
    zip: (args) => args[0]?.map?.((v, i) => [v, args[1]?.[i]]) ?? [],
    reversed: (args) => [...args[0] ?? []].reverse(),
    sorted: (args) => [...args[0] ?? []].sort(args[1]),
    iter: (args) => (args[0] ?? [])[Symbol.iterator]?.(),
    next: (args) => args[0]?.next?.(),
    // HASH/DIGEST OPERATIONS (Python, Go, C++)
    hash: (args) => {
        let hash = 0;
        const str = String(args[0]);
        for (let i = 0; i < str.length; i++)
            hash = ((hash << 5) - hash) + str.charCodeAt(i), hash |= 0;
        return hash;
    },
    // REFLECTION (Python, JavaScript, TypeScript)
    hasProperty: (args) => args[1] in args[0],
    getProperty: (args) => args[0][args[1]],
    setProperty: (args) => { args[0][args[1]] = args[2]; return args[0]; },
    deleteProperty: (args) => { delete args[0][args[1]]; return args[0]; },
    getPrototype: (args) => Object.getPrototypeOf(args[0]),
    setPrototype: (args) => { Object.setPrototypeOf(args[0], args[1]); return args[0]; },
    // DEEP OPERATIONS
    clone: (args) => JSON.parse(JSON.stringify(args[0])),
    deepEqual: (args) => JSON.stringify(args[0]) === JSON.stringify(args[1]),
    assign: (args) => Object.assign(args[0], ...args.slice(1)),
    // TYPE ALIASES FOR COMPATIBILITY
    uint: (args) => Math.abs(Math.floor(args[0])),
    sint: (args) => Math.floor(args[0]),
    byte: (args) => Math.floor(args[0]) & 0xFF,
    rune: (args) => String.fromCharCode(args[0]),
    // FUNCTIONAL PROGRAMMING (JavaScript, Python, Rust)
    compose: (args) => (x) => args.reduceRight((v, f) => f(v), x),
    pipe: (args) => (x) => args.reduce((v, f) => f(v), x),
    curry: (args) => {
        const fn = args[0];
        const arity = args[1] ?? fn.length;
        return function curried(...args) {
            return args.length >= arity ? fn(...args) : (...more) => curried(...args, ...more);
        };
    },
    partial: (args) => args[0].bind(null, ...args.slice(1)),
    memoize: (args) => {
        const cache = new Map();
        return (...args) => {
            const key = JSON.stringify(args);
            return cache.has(key) ? cache.get(key) : (cache.set(key, args[0](...args)), cache.get(key));
        };
    },
    // SYMBOL/ENUM OPERATIONS
    symbol: (args) => Symbol(args[0]),
    // GENERIC/TEMPLATE OPERATIONS (C++, C#, TypeScript)
    generic: (args) => args[0],
    // BITWISE OPERATIONS (C, C++, Rust, Go)
    bitwiseAnd: (args) => args[0] & args[1],
    bitwiseOr: (args) => args[0] | args[1],
    bitwiseXor: (args) => args[0] ^ args[1],
    bitwiseNot: (args) => ~args[0],
    leftShift: (args) => args[0] << args[1],
    rightShift: (args) => args[0] >> args[1],
    unsignedRightShift: (args) => args[0] >>> args[1],
};
function parseTypeAnnotation(token) {
    if (token in TYPE_REGISTRY)
        return TYPE_REGISTRY[token];
    if (token.endsWith("?"))
        return {
            kind: "optional",
            innerType: parseTypeAnnotation(token.slice(0, -1)) ||
                { kind: "primitive", primitive: "any" },
        };
    if (token in TYPE_REGISTRY)
        return TYPE_REGISTRY[token];
    return { kind: "primitive", primitive: "any" };
}
function typeCompatible(actual, expected) {
    if (expected.primitive === "any" || actual.primitive === "any")
        return true;
    if (actual.kind === "primitive" && expected.kind === "primitive") {
        if (actual.primitive === expected.primitive)
            return true;
        // Allow numeric conversions: int → float
        if (actual.primitive === "int" &&
            expected.primitive === "float")
            return true;
        // Allow char → string
        if (actual.primitive === "char" &&
            expected.primitive === "string")
            return true;
        return false;
    }
    if (actual.kind === "union" && expected.kind === "union") {
        return ((actual.types
            ?.every((t) => expected.types?.some((e) => typeCompatible(t, e))) ?? false));
    }
    return false;
}
class Lexer {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.lineStart = 0;
    }
    peek() {
        return this.input[this.pos];
    }
    advance() {
        const ch = this.input[this.pos++];
        if (ch === "\n") {
            this.line++;
            this.column = 1;
            this.lineStart = this.pos;
        }
        else {
            this.column++;
        }
        return ch;
    }
    getLocation() {
        return {
            line: this.line,
            column: this.column,
            source: this.input.substring(this.lineStart, this.pos),
        };
    }
    nextToken() {
        // Skip whitespace
        while (this.peek() === " " ||
            this.peek() === "\n" ||
            this.peek() === "\r" ||
            this.peek() === "\t") {
            this.advance();
        }
        // Skip comments
        if (this.peek() === "/" &&
            this.input[this.pos + 1] === "/") {
            while (this.peek() && this.peek() !== "\n")
                this.advance();
            return this.nextToken();
        }
        if (!this.peek())
            return null;
        const loc = this.getLocation();
        // Multi-character operators
        const twoCharOps = [
            "==",
            "!=",
            "<=",
            ">=",
            "=>",
            "||",
            "&&",
            "++",
            "--",
        ];
        const twoChar = this.input.substring(this.pos, this.pos + 2);
        if (twoCharOps.includes(twoChar)) {
            this.advance();
            this.advance();
            return { token: twoChar, location: loc };
        }
        // Identifiers / keywords
        if (/[a-zA-Z_]/.test(this.peek() || "")) {
            let word = "";
            while (/[a-zA-Z0-9_]/.test(this.peek() || ""))
                word += this.advance();
            return { token: word, location: loc };
        }
        // Strings
        if (this.peek() === '"') {
            this.advance(); // Skip opening quote
            let str = "";
            while (this.peek() && this.peek() !== '"') {
                if (this.peek() === "\\") {
                    this.advance();
                    const escaped = this.advance();
                    str += escaped === "n" ? "\n" : escaped;
                }
                else {
                    str += this.advance();
                }
            }
            if (this.peek() === '"')
                this.advance(); // Skip closing quote
            return { token: `"${str}"`, location: loc };
        }
        // Numbers
        if (/[0-9]/.test(this.peek() || "")) {
            let num = "";
            while (/[0-9.]/.test(this.peek() || ""))
                num += this.advance();
            return { token: num, location: loc };
        }
        // Single character tokens
        const ch = this.advance();
        return { token: ch, location: loc };
    }
}
// ============================================================================
// PARSER
// ============================================================================
class Parser {
    constructor(input) {
        this.tokens = [];
        this.pos = 0;
        const lexer = new Lexer(input);
        let token;
        while ((token = lexer.nextToken())) {
            this.tokens.push(token);
        }
    }
    current() {
        return this.tokens[this.pos];
    }
    advance() {
        this.pos++;
    }
    expect(token) {
        if (!this.current() || this.current().token !== token) {
            throw new Error(`Expected ${token} at line ${this.current()?.location.line}`);
        }
        this.advance();
    }
    precedence(op) {
        const precs = {
            "||": 1,
            "&&": 2,
            "==": 3,
            "!=": 3,
            "<": 4,
            ">": 4,
            "<=": 4,
            ">=": 4,
            "+": 5,
            "-": 5,
            "*": 6,
            "/": 6,
            "%": 6,
        };
        return precs[op] ?? 0;
    }
    parseUnary() {
        if (this.current() &&
            ["!", "-", "+", "~"].includes(this.current().token)) {
            const op = this.current().token;
            this.advance();
            return { kind: "unary", op, operand: this.parseUnary() };
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        if (!this.current())
            throw new Error("Unexpected end of input");
        const token = this.current().token;
        if (/^[0-9]/.test(token)) {
            this.advance();
            return {
                kind: "literal",
                value: token.includes(".") ? parseFloat(token) : parseInt(token),
                type: token.includes(".") ? { kind: "primitive", primitive: "float" } : { kind: "primitive", primitive: "int" },
            };
        }
        if (token.startsWith('"')) {
            this.advance();
            return {
                kind: "literal",
                value: token.slice(1, -1),
                type: { kind: "primitive", primitive: "string" },
            };
        }
        if (token === "true" || token === "false") {
            this.advance();
            return {
                kind: "literal",
                value: token === "true",
                type: { kind: "primitive", primitive: "bool" },
            };
        }
        if (/[a-zA-Z_]/.test(token)) {
            let expr = { kind: "identifier", name: token };
            this.advance();
            // Handle member access and calls: io.print(...), obj.method(...), etc.
            while (this.current()?.token === ".") {
                this.advance();
                const property = this.current()?.token;
                if (!property)
                    throw new Error("Expected property name after .");
                this.advance();
                // Check for function call
                if (this.current()?.token === "(") {
                    this.advance();
                    const args = [];
                    while (this.current()?.token !== ")") {
                        args.push(this.parseUnary());
                        if (this.current()?.token === ",")
                            this.advance();
                    }
                    this.expect(")");
                    expr = {
                        kind: "call",
                        func: { kind: "member", object: expr, property },
                        args,
                    };
                }
                else {
                    // Property access without call
                    expr = { kind: "member", object: expr, property };
                }
            }
            return expr;
        }
        if (token === "(") {
            this.advance();
            const expr = this.parseBinary();
            this.expect(")");
            return expr;
        }
        throw new Error(`Unexpected token: ${token}`);
    }
    parseBinary(minPrec = 0) {
        let left = this.parseUnary();
        while (this.current() &&
            this.precedence(this.current().token) >= minPrec) {
            const op = this.current().token;
            const prec = this.precedence(op);
            this.advance();
            const right = this.parseBinary(prec + 1);
            left = { kind: "binary", op, left, right };
        }
        return left;
    }
    parse() {
        const statements = [];
        while (this.current()) {
            statements.push(this.parseStatement());
        }
        return statements;
    }
    parseStatement() {
        const token = this.current()?.token;
        if (token === "import") {
            this.advance();
            const name = this.current().token;
            this.advance();
            this.expect("from");
            const module = this.current().token;
            this.advance();
            return { kind: "import", name, module };
        }
        if (token === "let" || token === "const" || token === "var") {
            const mutable = token === "var";
            this.advance();
            const name = this.current().token;
            this.advance();
            this.expect(":");
            const typeStr = this.current().token;
            this.advance();
            this.expect("=");
            const value = this.parseBinary();
            return {
                kind: "let",
                name,
                type: parseTypeAnnotation(typeStr) || { kind: "primitive", primitive: "any" },
                value,
                mutable,
            };
        }
        if (token === "func") {
            this.advance();
            const name = this.current().token;
            this.advance();
            this.expect("(");
            const params = [];
            while (this.current()?.token !== ")") {
                const pname = this.current().token;
                this.advance();
                this.expect(":");
                const ptype = this.current().token;
                this.advance();
                params.push({
                    name: pname,
                    type: parseTypeAnnotation(ptype) || { kind: "primitive", primitive: "any" },
                });
                if (this.current()?.token === ",")
                    this.advance();
            }
            this.expect(")");
            this.expect("=>");
            const returnTypeStr = this.current().token;
            this.advance();
            this.expect("{");
            const body = [];
            while (this.current()?.token !== "}") {
                body.push(this.parseStatement());
            }
            this.expect("}");
            return {
                kind: "function",
                name,
                params,
                returnType: parseTypeAnnotation(returnTypeStr) || { kind: "primitive", primitive: "any" },
                body,
            };
        }
        if (token === "return") {
            this.advance();
            const value = this.current() ? this.parseBinary() : undefined;
            return { kind: "return", value };
        }
        if (token === "if") {
            this.advance();
            this.expect("(");
            const condition = this.parseBinary();
            this.expect(")");
            this.expect("{");
            const then = [];
            while (this.current()?.token !== "}") {
                then.push(this.parseStatement());
            }
            this.expect("}");
            return { kind: "if", condition, then };
        }
        if (token === "while") {
            this.advance();
            this.expect("(");
            const condition = this.parseBinary();
            this.expect(")");
            this.expect("{");
            const body = [];
            while (this.current()?.token !== "}") {
                body.push(this.parseStatement());
            }
            this.expect("}");
            return { kind: "while", condition, body };
        }
        if (token === "break") {
            this.advance();
            return { kind: "break" };
        }
        if (token === "continue") {
            this.advance();
            return { kind: "continue" };
        }
        const expr = this.parseBinary();
        // Check for assignment: identifier = value
        if (this.current()?.token === "=" && expr.kind === "identifier") {
            const target = expr.name;
            this.advance();
            const value = this.parseBinary();
            return { kind: "assignment", target, value };
        }
        return { kind: "expression", expr };
    }
}
class TypeChecker {
    constructor() {
        this.env = {
            vars: new Map(),
            functions: new Map(),
        };
        this.modules = new Map();
    }
    check(statements) {
        for (const stmt of statements) {
            this.checkStatement(stmt);
        }
    }
    checkStatement(stmt) {
        switch (stmt.kind) {
            case "let":
                this.env.vars.set(stmt.name, {
                    type: stmt.type,
                    mutable: stmt.mutable,
                });
                this.checkExpression(stmt.value, stmt.type);
                break;
            case "function":
                this.env.functions.set(stmt.name, {
                    params: stmt.params.map((p) => p.type),
                    returnType: stmt.returnType,
                });
                const oldEnv = this.env;
                this.env = { vars: new Map(), functions: new Map(), parent: oldEnv };
                for (const param of stmt.params) {
                    this.env.vars.set(param.name, {
                        type: param.type,
                        mutable: false,
                    });
                }
                for (const s of stmt.body) {
                    this.checkStatement(s);
                }
                this.env = oldEnv;
                break;
            case "if":
                this.checkExpression(stmt.condition, { kind: "primitive", primitive: "bool" });
                for (const s of stmt.then) {
                    this.checkStatement(s);
                }
                if (stmt.else) {
                    for (const s of stmt.else) {
                        this.checkStatement(s);
                    }
                }
                break;
            case "while":
                this.checkExpression(stmt.condition, { kind: "primitive", primitive: "bool" });
                for (const s of stmt.body) {
                    this.checkStatement(s);
                }
                break;
            case "expression":
                this.checkExpression(stmt.expr, { kind: "primitive", primitive: "any" });
                break;
            case "import":
                break;
        }
    }
    checkExpression(expr, expectedType) {
        const actualType = this.inferType(expr);
        if (!typeCompatible(actualType, expectedType)) {
            throw new Error(`Type mismatch: expected ${JSON.stringify(expectedType)}, got ${JSON.stringify(actualType)}`);
        }
    }
    inferType(expr) {
        switch (expr.kind) {
            case "literal":
                return expr.type;
            case "identifier":
                return this.env.vars.get(expr.name)?.type || { kind: "primitive", primitive: "any" };
            case "binary":
                if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(expr.op)) {
                    return { kind: "primitive", primitive: "bool" };
                }
                return this.inferType(expr.left);
            case "unary":
                if (expr.op === "!")
                    return { kind: "primitive", primitive: "bool" };
                return this.inferType(expr.operand);
            default:
                return { kind: "primitive", primitive: "any" };
        }
    }
}
class Environment {
    constructor() {
        this.vars = new Map();
        this.functions = new Map();
        this.modules = new Map();
        this.parent = null;
    }
    set(name, value, mutable = false) {
        this.vars.set(name, { value, mutable });
    }
    get(name) {
        if (this.vars.has(name)) {
            return this.vars.get(name).value;
        }
        if (this.parent)
            return this.parent.get(name);
        throw new Error(`Undefined variable: ${name}`);
    }
    update(name, value) {
        if (this.vars.has(name)) {
            const entry = this.vars.get(name);
            if (!entry.mutable) {
                throw new Error(`Cannot reassign immutable variable: ${name}`);
            }
            entry.value = value;
            return;
        }
        if (this.parent) {
            this.parent.update(name, value);
            return;
        }
        throw new Error(`Undefined variable: ${name}`);
    }
    setFunction(name, params, body) {
        this.functions.set(name, { params, body });
    }
    getFunction(name) {
        if (this.functions.has(name)) {
            return this.functions.get(name);
        }
        if (this.parent)
            return this.parent.getFunction(name);
        return null;
    }
    setModule(name, module) {
        this.modules.set(name, module);
    }
    getModule(name) {
        if (this.modules.has(name)) {
            return this.modules.get(name);
        }
        if (this.parent)
            return this.parent.getModule(name);
        return null;
    }
}
class Interpreter {
    constructor() {
        this.env = new Environment();
        this.controlFlow = { type: null };
        this.setupStdlib();
    }
    setupStdlib() {
        // I/O Module
        const ioModule = {
            print: (value) => { console.log(value); return null; },
            println: (value) => { console.log(value); return null; },
        };
        this.env.setModule("std::io", ioModule);
        this.env.setModule("str", ioModule); // Alias for std::io
        // Math Module (Python, R, C, C++)
        this.env.setModule("std::math", {
            sqrt: (x) => Math.sqrt(x),
            sin: (x) => Math.sin(x),
            cos: (x) => Math.cos(x),
            tan: (x) => Math.tan(x),
            asin: (x) => Math.asin(x),
            acos: (x) => Math.acos(x),
            atan: (x) => Math.atan(x),
            exp: (x) => Math.exp(x),
            log: (x) => Math.log(x),
            log10: (x) => Math.log10(x),
            log2: (x) => Math.log2(x),
            floor: (x) => Math.floor(x),
            ceil: (x) => Math.ceil(x),
            round: (x) => Math.round(x),
            abs: (x) => Math.abs(x),
            pow: (x, y) => Math.pow(x, y),
            max: (...args) => Math.max(...args),
            min: (...args) => Math.min(...args),
            gcd: (a, b) => { let x = Math.abs(a), y = Math.abs(b); while (y)
                [x, y] = [y, x % y]; return x; },
            PI: Math.PI,
            E: Math.E,
        });
        // String/Text Module (Python, Ruby, JavaScript)
        this.env.setModule("std::text", {
            split: (s, sep) => s.split(sep),
            join: (arr, sep) => arr.join(sep),
            trim: (s) => s.trim(),
            toUpperCase: (s) => s.toUpperCase(),
            toLowerCase: (s) => s.toLowerCase(),
            startsWith: (s, prefix) => s.startsWith(prefix),
            endsWith: (s, suffix) => s.endsWith(suffix),
            includes: (s, substr) => s.includes(substr),
            indexOf: (s, substr) => s.indexOf(substr),
            replace: (s, old, newStr) => s.replace(old, newStr),
            replaceAll: (s, old, newStr) => s.replaceAll(old, newStr),
            substring: (s, start, end) => s.substring(start, end),
            substr: (s, start, length) => s.substr(start, length),
            slice: (s, start, end) => s.slice(start, end),
            repeat: (s, count) => s.repeat(count),
            length: (s) => s.length,
            charAt: (s, index) => s.charAt(index),
            charCodeAt: (s, index) => s.charCodeAt(index),
        });
        // Array/List Module (Python, JavaScript, Go, Rust)
        this.env.setModule("std::list", {
            map: (arr, fn) => arr.map(fn),
            filter: (arr, fn) => arr.filter(fn),
            reduce: (arr, fn, init) => arr.reduce(fn, init),
            forEach: (arr, fn) => { arr.forEach(fn); },
            find: (arr, fn) => arr.find(fn),
            findIndex: (arr, fn) => arr.findIndex(fn),
            some: (arr, fn) => arr.some(fn),
            every: (arr, fn) => arr.every(fn),
            includes: (arr, item) => arr.includes(item),
            indexOf: (arr, item) => arr.indexOf(item),
            push: (arr, item) => { arr.push(item); return arr; },
            pop: (arr) => arr.pop(),
            shift: (arr) => arr.shift(),
            unshift: (arr, item) => { arr.unshift(item); return arr; },
            reverse: (arr) => { arr.reverse(); return arr; },
            sort: (arr, fn) => { arr.sort(fn); return arr; },
            concat: (arr, ...others) => arr.concat(...others),
            flat: (arr, depth) => arr.flat(depth),
            length: (arr) => arr.length,
        });
        // Dictionary/Map Module (Python, JavaScript, Go, Rust)
        this.env.setModule("std::map", {
            keys: (obj) => Object.keys(obj),
            values: (obj) => Object.values(obj),
            entries: (obj) => Object.entries(obj),
            has: (obj, key) => key in obj,
            get: (obj, key) => obj[key],
            set: (obj, key, value) => { obj[key] = value; return obj; },
            delete: (obj, key) => { delete obj[key]; return obj; },
            clear: (obj) => { for (let k in obj)
                delete obj[k]; return obj; },
            length: (obj) => Object.keys(obj).length,
            assign: (target, ...sources) => Object.assign(target, ...sources),
        });
        // Type Module (Python, JavaScript, TypeScript, Go)
        this.env.setModule("std::type", {
            typeof: (x) => typeof x,
            isArray: (x) => Array.isArray(x),
            isObject: (x) => x !== null && typeof x === "object",
            isNull: (x) => x === null,
            isUndefined: (x) => x === undefined,
            isNumber: (x) => typeof x === "number",
            isString: (x) => typeof x === "string",
            isBoolean: (x) => typeof x === "boolean",
            isNaN: (x) => isNaN(x),
            isFinite: (x) => isFinite(x),
            isInteger: (x) => Number.isInteger(x),
            toNumber: (x) => Number(x),
            toString: (x) => String(x),
            toBoolean: (x) => Boolean(x),
            toInt: (x) => Math.floor(Number(x)),
            toFloat: (x) => parseFloat(String(x)),
        });
        // File Module (Python, Go, C, C++)
        this.env.setModule("std::file", {
            read: (path) => { try {
                return fs.readFileSync(path, "utf-8");
            }
            catch {
                return null;
            } },
            write: (path, content) => { try {
                fs.writeFileSync(path, content);
                return true;
            }
            catch {
                return false;
            } },
            append: (path, content) => { try {
                fs.appendFileSync(path, content);
                return true;
            }
            catch {
                return false;
            } },
            exists: (path) => fs.existsSync(path),
            delete: (path) => { try {
                fs.unlinkSync(path);
                return true;
            }
            catch {
                return false;
            } },
            isFile: (path) => { try {
                return fs.statSync(path).isFile();
            }
            catch {
                return false;
            } },
            isDirectory: (path) => { try {
                return fs.statSync(path).isDirectory();
            }
            catch {
                return false;
            } },
            mkdir: (path) => { try {
                fs.mkdirSync(path, { recursive: true });
                return true;
            }
            catch {
                return false;
            } },
        });
        // Regex Module (Python, Ruby, JavaScript, Go)
        this.env.setModule("std::regex", {
            match: (str, pattern, flags) => { try {
                const m = str.match(new RegExp(pattern, flags ?? ""));
                return m ?? null;
            }
            catch {
                return null;
            } },
            test: (str, pattern, flags) => { try {
                return new RegExp(pattern, flags ?? "").test(str);
            }
            catch {
                return false;
            } },
            search: (str, pattern, flags) => { try {
                return str.search(new RegExp(pattern, flags ?? ""));
            }
            catch {
                return -1;
            } },
            replace: (str, pattern, replacement, flags) => { try {
                return str.replace(new RegExp(pattern, flags ?? "g"), replacement);
            }
            catch {
                return str;
            } },
        });
        // DateTime Module (Python, Go, JavaScript, Ruby)
        this.env.setModule("std::time", {
            now: () => new Date().getTime(),
            timestamp: () => Math.floor(new Date().getTime() / 1000),
            getDate: (ms) => new Date(ms).getDate(),
            getMonth: (ms) => new Date(ms).getMonth() + 1,
            getYear: (ms) => new Date(ms).getFullYear(),
            getHours: (ms) => new Date(ms).getHours(),
            getMinutes: (ms) => new Date(ms).getMinutes(),
            getSeconds: (ms) => new Date(ms).getSeconds(),
        });
        // Set Module (Python, Go, Rust)
        this.env.setModule("std::set", {
            create: () => new Set(),
            add: (set, item) => { set.add(item); return set; },
            remove: (set, item) => { set.delete(item); return set; },
            has: (set, item) => set.has(item),
            size: (set) => set.size,
            clear: (set) => { set.clear(); return set; },
            union: (set1, set2) => new Set([...set1, ...set2]),
            intersection: (set1, set2) => new Set([...set1].filter(x => set2.has(x))),
            difference: (set1, set2) => new Set([...set1].filter(x => !set2.has(x))),
        });
    }
    interpret(statements) {
        for (const stmt of statements) {
            this.interpretStatement(stmt);
            if (this.controlFlow.type)
                break;
        }
    }
    interpretStatement(stmt) {
        switch (stmt.kind) {
            case "let":
                const value = this.evaluateExpression(stmt.value);
                this.env.set(stmt.name, value, stmt.mutable);
                break;
            case "assignment":
                const newValue = this.evaluateExpression(stmt.value);
                this.env.update(stmt.target, newValue);
                break;
            case "expression":
                this.evaluateExpression(stmt.expr);
                break;
            case "if":
                const condition = this.evaluateExpression(stmt.condition);
                if (condition) {
                    for (const s of stmt.then) {
                        this.interpretStatement(s);
                        if (this.controlFlow.type)
                            return;
                    }
                }
                else if (stmt.else) {
                    for (const s of stmt.else) {
                        this.interpretStatement(s);
                        if (this.controlFlow.type)
                            return;
                    }
                }
                break;
            case "while":
                while (this.evaluateExpression(stmt.condition)) {
                    for (const s of stmt.body) {
                        this.interpretStatement(s);
                        if (this.controlFlow.type === "break") {
                            this.controlFlow.type = null;
                            return;
                        }
                        if (this.controlFlow.type === "continue") {
                            this.controlFlow.type = null;
                            break;
                        }
                        if (this.controlFlow.type === "return")
                            return;
                    }
                }
                break;
            case "for":
                this.interpretStatement(stmt.init);
                while (this.evaluateExpression(stmt.condition)) {
                    for (const s of stmt.body) {
                        this.interpretStatement(s);
                        if (this.controlFlow.type === "break") {
                            this.controlFlow.type = null;
                            return;
                        }
                        if (this.controlFlow.type === "continue") {
                            this.controlFlow.type = null;
                            break;
                        }
                        if (this.controlFlow.type === "return")
                            return;
                    }
                    this.interpretStatement(stmt.update);
                }
                break;
            case "return":
                this.controlFlow.value = stmt.value
                    ? this.evaluateExpression(stmt.value)
                    : null;
                this.controlFlow.type = "return";
                break;
            case "break":
                this.controlFlow.type = "break";
                break;
            case "continue":
                this.controlFlow.type = "continue";
                break;
            case "function":
                this.env.setFunction(stmt.name, [
                    ...stmt.params.map((p) => p.name),
                ], stmt.body);
                break;
            case "import":
                // Bind module to variable name
                const module = this.env.getModule(stmt.module);
                if (!module) {
                    throw new Error(`Module not found: ${stmt.module}`);
                }
                this.env.set(stmt.name, module, false);
                break;
        }
    }
    evaluateExpression(expr) {
        switch (expr.kind) {
            case "literal":
                return expr.value;
            case "identifier":
                return this.env.get(expr.name);
            case "binary":
                const left = this.evaluateExpression(expr.left);
                const right = this.evaluateExpression(expr.right);
                switch (expr.op) {
                    case "+":
                        return left + right;
                    case "-":
                        return left - right;
                    case "*":
                        return left * right;
                    case "/":
                        return left / right;
                    case "%":
                        return left % right;
                    case "==":
                        return left === right;
                    case "!=":
                        return left !== right;
                    case "<":
                        return left < right;
                    case ">":
                        return left > right;
                    case "<=":
                        return left <= right;
                    case ">=":
                        return left >= right;
                    case "&&":
                        return left && right;
                    case "||":
                        return left || right;
                    default:
                        return null;
                }
            case "unary":
                const operand = this.evaluateExpression(expr.operand);
                switch (expr.op) {
                    case "-":
                        return -operand;
                    case "+":
                        return +operand;
                    case "!":
                        return !operand;
                    case "~":
                        return ~operand;
                    default:
                        return null;
                }
            case "call":
                const func = this.evaluateExpression(expr.func);
                const args = expr.args.map((a) => this.evaluateExpression(a));
                // Check for built-in functions from extended language features
                if (expr.func.kind === "identifier" && expr.func.name in BUILTIN_FUNCTIONS) {
                    return BUILTIN_FUNCTIONS[expr.func.name](args);
                }
                if (typeof func === "function") {
                    return func(...args);
                }
                throw new Error("Not a function");
            case "member":
                const obj = this.evaluateExpression(expr.object);
                return obj?.[expr.property];
        }
    }
}
// ============================================================================
// C CODE GENERATOR
// ============================================================================
class CGenerator {
    constructor() {
        this.code = [];
    }
    generate(statements) {
        this.code = [];
        this.code.push("#include <stdio.h>");
        this.code.push("#include <math.h>");
        this.code.push("int main() {");
        for (const stmt of statements) {
            this.generateStatement(stmt);
        }
        this.code.push("return 0;");
        this.code.push("}");
        return this.code.join("\n");
    }
    generateStatement(stmt) {
        switch (stmt.kind) {
            case "let":
                const ctype = this.typeToCString(stmt.type);
                const value = this.generateExpression(stmt.value);
                this.code.push(`${ctype} ${stmt.name} = ${value};`);
                break;
            case "expression":
                const expr = this.generateExpression(stmt.expr);
                this.code.push(`${expr};`);
                break;
            case "if":
                const condition = this.generateExpression(stmt.condition);
                this.code.push(`if (${condition}) {`);
                for (const s of stmt.then) {
                    this.generateStatement(s);
                }
                this.code.push("}");
                break;
            case "return":
                const value2 = stmt.value
                    ? this.generateExpression(stmt.value)
                    : "0";
                this.code.push(`return ${value2};`);
                break;
        }
    }
    generateExpression(expr) {
        switch (expr.kind) {
            case "literal":
                if (typeof expr.value === "string") {
                    return `"${expr.value}"`;
                }
                return String(expr.value);
            case "identifier":
                return expr.name;
            case "binary":
                const left = this.generateExpression(expr.left);
                const right = this.generateExpression(expr.right);
                return `(${left} ${expr.op} ${right})`;
            case "unary":
                const operand = this.generateExpression(expr.operand);
                return `(${expr.op}${operand})`;
            case "call":
                const func = this.generateExpression(expr.func);
                const args = expr.args.map((a) => this.generateExpression(a));
                return `${func}(${args.join(", ")})`;
            case "member":
                const obj = this.generateExpression(expr.object);
                return `${obj}.${expr.property}`;
            default:
                return "";
        }
    }
    typeToCString(type) {
        if (type.kind === "primitive") {
            switch (type.primitive) {
                case "int":
                    return "int";
                case "float":
                    return "double";
                case "bool":
                    return "int";
                case "char":
                    return "char";
                case "string":
                    return "char*";
                default:
                    return "int";
            }
        }
        return "int";
    }
}
class PackageManager {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.strataumfile = this.loadStrataumfile();
        this.lockFile = this.loadLockFile();
    }
    loadStrataumfile() {
        const path = `${this.projectRoot}/Strataumfile`;
        try {
            const content = fs.readFileSync(path, "utf-8");
            return JSON.parse(content);
        }
        catch {
            return { name: "unknown", version: "0.0.0", dependencies: {} };
        }
    }
    loadLockFile() {
        const path = `${this.projectRoot}/Strataumfile.lock`;
        try {
            const content = fs.readFileSync(path, "utf-8");
            return JSON.parse(content);
        }
        catch {
            return { locked: false, packages: {} };
        }
    }
    saveStrataumfile() {
        const path = `${this.projectRoot}/Strataumfile`;
        fs.writeFileSync(path, JSON.stringify(this.strataumfile, null, 2));
        console.log(`✓ Updated ${path}`);
    }
    saveLockFile() {
        const path = `${this.projectRoot}/Strataumfile.lock`;
        this.lockFile.timestamp = new Date().toISOString();
        fs.writeFileSync(path, JSON.stringify(this.lockFile, null, 2));
        console.log(`✓ Locked dependencies in ${path}`);
    }
    install(packageName) {
        const packagesDir = `${this.projectRoot}/.strata/packages`;
        if (!fs.existsSync(packagesDir)) {
            fs.mkdirSync(packagesDir, { recursive: true });
        }
        if (packageName) {
            // Install specific package
            this.installPackage(packageName, packagesDir);
        }
        else {
            // Install all dependencies from Strataumfile
            if (!this.strataumfile.dependencies) {
                console.log("No dependencies to install.");
                return;
            }
            for (const [pkg, version] of Object.entries(this.strataumfile.dependencies)) {
                this.installPackage(pkg, packagesDir, version);
            }
        }
        this.saveLockFile();
        console.log("✓ Installation complete");
    }
    installPackage(packageName, packagesDir, version) {
        const pkgDir = `${packagesDir}/${packageName}`;
        // Create package directory
        if (!fs.existsSync(pkgDir)) {
            fs.mkdirSync(pkgDir, { recursive: true });
        }
        // Create a mock package with module definition
        const moduleContent = `
// ${packageName} module (v${version || "1.0.0"})
export func init() => void {
    io.print("${packageName} loaded")
}
`;
        fs.writeFileSync(`${pkgDir}/index.str`, moduleContent);
        // Create package.json in package directory
        const pkgInfo = {
            name: packageName,
            version: version || "1.0.0",
            main: "index.str",
        };
        fs.writeFileSync(`${pkgDir}/package.json`, JSON.stringify(pkgInfo, null, 2));
        // Update lock file
        if (!this.lockFile.packages)
            this.lockFile.packages = {};
        this.lockFile.packages[packageName] = {
            version: version || "1.0.0",
            installed: true,
            timestamp: new Date().toISOString(),
        };
        console.log(`✓ Installed ${packageName}@${version || "1.0.0"}`);
    }
    add(packageName, version = "latest") {
        if (!this.strataumfile.dependencies) {
            this.strataumfile.dependencies = {};
        }
        this.strataumfile.dependencies[packageName] = version;
        this.saveStrataumfile();
        // Auto-install
        const packagesDir = `${this.projectRoot}/.strata/packages`;
        if (!fs.existsSync(packagesDir)) {
            fs.mkdirSync(packagesDir, { recursive: true });
        }
        this.installPackage(packageName, packagesDir, version);
        this.saveLockFile();
        console.log(`✓ Added ${packageName}@${version}`);
    }
    remove(packageName) {
        if (this.strataumfile.dependencies && packageName in this.strataumfile.dependencies) {
            delete this.strataumfile.dependencies[packageName];
            this.saveStrataumfile();
            // Remove from filesystem
            const pkgDir = `${this.projectRoot}/.strata/packages/${packageName}`;
            if (fs.existsSync(pkgDir)) {
                fs.rmSync(pkgDir, { recursive: true });
            }
            // Update lock file
            if (this.lockFile.packages && packageName in this.lockFile.packages) {
                delete this.lockFile.packages[packageName];
                this.saveLockFile();
            }
            console.log(`✓ Removed ${packageName}`);
        }
        else {
            console.error(`Package ${packageName} not found in dependencies`);
            process.exit(1);
        }
    }
    list() {
        console.log("\nInstalled Packages:");
        console.log("==================");
        if (!this.strataumfile.dependencies || Object.keys(this.strataumfile.dependencies).length === 0) {
            console.log("No packages installed");
            return;
        }
        for (const [pkg, version] of Object.entries(this.strataumfile.dependencies)) {
            const status = this.lockFile.packages?.[pkg]?.installed ? "✓" : "✗";
            console.log(`${status} ${pkg}@${version}`);
        }
    }
    init(name, version = "0.0.1") {
        const strataumfile = {
            name,
            version,
            registry: "https://registry.stratauim.io",
            dependencies: {},
        };
        fs.writeFileSync(`${this.projectRoot}/Strataumfile`, JSON.stringify(strataumfile, null, 2));
        const lockFile = {
            locked: true,
            version: "1.0",
            timestamp: new Date().toISOString(),
            packages: {},
        };
        fs.writeFileSync(`${this.projectRoot}/Strataumfile.lock`, JSON.stringify(lockFile, null, 2));
        console.log(`✓ Initialized Strata project: ${name}`);
    }
    info() {
        console.log("\nProject Information:");
        console.log("====================");
        console.log(`Name: ${this.strataumfile.name}`);
        console.log(`Version: ${this.strataumfile.version}`);
        console.log(`Registry: ${this.strataumfile.registry || "default"}`);
        console.log(`Dependencies: ${Object.keys(this.strataumfile.dependencies || {}).length}`);
    }
}
// ============================================================================
// MAIN
// ============================================================================
const args = process.argv.slice(2);
// Handle package manager commands
if (args.length > 0) {
    const command = args[0];
    const pm = new PackageManager();
    switch (command) {
        case "init":
            const projectName = args[1] || "my-strata-project";
            const version = args[2] || "0.0.1";
            pm.init(projectName, version);
            process.exit(0);
        case "install":
            pm.install(args[1]);
            process.exit(0);
        case "add":
            if (!args[1]) {
                console.error("Usage: strataum add <package> [version]");
                process.exit(1);
            }
            pm.add(args[1], args[2] || "latest");
            process.exit(0);
        case "remove":
            if (!args[1]) {
                console.error("Usage: strataum remove <package>");
                process.exit(1);
            }
            pm.remove(args[1]);
            process.exit(0);
        case "list":
            pm.list();
            process.exit(0);
        case "info":
            pm.info();
            process.exit(0);
    }
}
// Default: run Strata file
if (args.length === 0) {
    console.error("Usage: strata <file.str> or strataum <command>");
    process.exit(1);
}
const startTime = performance.now();
const filePath = args[0];
const source = fs.readFileSync(filePath, "utf-8");
try {
    const parser = new Parser(source);
    const statements = parser.parse();
    const typeChecker = new TypeChecker();
    typeChecker.check(statements);
    const interpreter = new Interpreter();
    interpreter.interpret(statements);
    const generator = new CGenerator();
    const cCode = generator.generate(statements);
    fs.writeFileSync("out.c", cCode);
    const endTime = performance.now();
    const elapsed = (endTime - startTime).toFixed(2);
    console.error(`Executed in ${elapsed}ms`);
}
catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
}
