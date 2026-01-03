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

// ============================================================================
// TYPE SYSTEM - Support for union types, primitives, interfaces, and optionals
// ============================================================================

type PrimitiveType = "int" | "float" | "bool" | "char" | "string" | "any";

interface TypeDef {
  kind: "primitive" | "union" | "interface" | "optional";
  name?: string;
  primitive?: PrimitiveType;
  types?: TypeDef[];
  fields?: Record<string, TypeDef>;
  innerType?: TypeDef;
}

const TYPE_REGISTRY: Record<string, TypeDef> = {
  int: { kind: "primitive", primitive: "int" },
  float: { kind: "primitive", primitive: "float" },
  bool: { kind: "primitive", primitive: "bool" },
  char: { kind: "primitive", primitive: "char" },
  string: { kind: "primitive", primitive: "string" },
  any: { kind: "primitive", primitive: "any" },
};

function parseTypeAnnotation(token: string): TypeDef | null {
  if (token in TYPE_REGISTRY) return TYPE_REGISTRY[token];
  if (token.endsWith("?"))
    return {
      kind: "optional",
      innerType:
        parseTypeAnnotation(token.slice(0, -1)) ||
        { kind: "primitive", primitive: "any" },
    };
  if (token in TYPE_REGISTRY) return TYPE_REGISTRY[token];
  return { kind: "primitive", primitive: "any" };
}

function typeCompatible(actual: TypeDef, expected: TypeDef): boolean {
  if (expected.primitive === "any" || actual.primitive === "any")
    return true;
  if (actual.kind === "primitive" && expected.kind === "primitive") {
    if (actual.primitive === expected.primitive) return true;
    // Allow numeric conversions: int → float
    if (
      actual.primitive === "int" &&
      expected.primitive === "float"
    )
      return true;
    // Allow char → string
    if (
      actual.primitive === "char" &&
      expected.primitive === "string"
    )
      return true;
    return false;
  }
  if (actual.kind === "union" && expected.kind === "union") {
    return (
      (actual.types
        ?.every(
          (t) =>
            expected.types?.some((e) => typeCompatible(t, e))
        ) ?? false)
    );
  }
  return false;
}

// ============================================================================
// LOCATION TRACKING - For better error messages
// ============================================================================

interface Location {
  line: number;
  column: number;
  source: string;
}

class Lexer {
  private pos = 0;
  private line = 1;
  private column = 1;
  private lineStart = 0;

  constructor(private input: string) {}

  private peek(): string | undefined {
    return this.input[this.pos];
  }

  private advance(): string {
    const ch = this.input[this.pos++];
    if (ch === "\n") {
      this.line++;
      this.column = 1;
      this.lineStart = this.pos;
    } else {
      this.column++;
    }
    return ch;
  }

  private getLocation(): Location {
    return {
      line: this.line,
      column: this.column,
      source: this.input.substring(this.lineStart, this.pos),
    };
  }

  nextToken(): { token: string; location: Location } | null {
    // Skip whitespace
    while (
      this.peek() === " " ||
      this.peek() === "\n" ||
      this.peek() === "\r" ||
      this.peek() === "\t"
    ) {
      this.advance();
    }

    // Skip comments
    if (
      this.peek() === "/" &&
      this.input[this.pos + 1] === "/"
    ) {
      while (this.peek() && this.peek() !== "\n") this.advance();
      return this.nextToken();
    }

    if (!this.peek()) return null;

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
        } else {
          str += this.advance();
        }
      }
      if (this.peek() === '"') this.advance(); // Skip closing quote
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
// AST DEFINITIONS
// ============================================================================

type Expr =
  | { kind: "literal"; value: any; type: TypeDef }
  | { kind: "identifier"; name: string }
  | { kind: "binary"; op: string; left: Expr; right: Expr }
  | { kind: "unary"; op: string; operand: Expr }
  | { kind: "call"; func: Expr; args: Expr[] }
  | { kind: "member"; object: Expr; property: string };

type Stmt =
  | { kind: "let"; name: string; type: TypeDef; value: Expr; mutable: boolean }
  | { kind: "assignment"; target: string; value: Expr }
  | { kind: "expression"; expr: Expr }
  | { kind: "if"; condition: Expr; then: Stmt[]; else?: Stmt[] }
  | { kind: "while"; condition: Expr; body: Stmt[] }
  | { kind: "for"; init: Stmt; condition: Expr; update: Stmt; body: Stmt[] }
  | { kind: "return"; value?: Expr }
  | { kind: "break" }
  | { kind: "continue" }
  | { kind: "function"; name: string; params: { name: string; type: TypeDef }[]; returnType: TypeDef; body: Stmt[] }
  | { kind: "import"; name: string; module: string };

// ============================================================================
// PARSER
// ============================================================================

class Parser {
  private tokens: { token: string; location: Location }[] = [];
  private pos = 0;

  constructor(input: string) {
    const lexer = new Lexer(input);
    let token;
    while ((token = lexer.nextToken())) {
      this.tokens.push(token);
    }
  }

  private current() {
    return this.tokens[this.pos];
  }

  private advance() {
    this.pos++;
  }

  private expect(token: string) {
    if (!this.current() || this.current().token !== token) {
      throw new Error(
        `Expected ${token} at line ${this.current()?.location.line}`
      );
    }
    this.advance();
  }

  private precedence(op: string): number {
    const precs: Record<string, number> = {
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

  private parseUnary(): Expr {
    if (
      this.current() &&
      ["!", "-", "+", "~"].includes(this.current().token)
    ) {
      const op = this.current().token;
      this.advance();
      return { kind: "unary", op, operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
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
      const name = token;
      this.advance();
      return { kind: "identifier", name };
    }

    if (token === "(") {
      this.advance();
      const expr = this.parseBinary();
      this.expect(")");
      return expr;
    }

    throw new Error(`Unexpected token: ${token}`);
  }

  private parseBinary(minPrec = 0): Expr {
    let left = this.parseUnary();

    while (
      this.current() &&
      this.precedence(this.current().token) >= minPrec
    ) {
      const op = this.current().token;
      const prec = this.precedence(op);
      this.advance();
      const right = this.parseBinary(prec + 1);
      left = { kind: "binary", op, left, right };
    }

    return left;
  }

  parse(): Stmt[] {
    const statements: Stmt[] = [];
    while (this.current()) {
      statements.push(this.parseStatement());
    }
    return statements;
  }

  private parseStatement(): Stmt {
    const token = this.current()?.token;

    if (token === "import") {
      this.advance();
      const name = this.current()!.token;
      this.advance();
      this.expect("from");
      const module = this.current()!.token;
      this.advance();
      return { kind: "import", name, module };
    }

    if (token === "let" || token === "const" || token === "var") {
      const mutable = token === "var";
      this.advance();
      const name = this.current()!.token;
      this.advance();
      this.expect(":");
      const typeStr = this.current()!.token;
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
      const name = this.current()!.token;
      this.advance();
      this.expect("(");
      const params = [];
      while (this.current()?.token !== ")") {
        const pname = this.current()!.token;
        this.advance();
        this.expect(":");
        const ptype = this.current()!.token;
        this.advance();
        params.push({
          name: pname,
          type: parseTypeAnnotation(ptype) || { kind: "primitive", primitive: "any" },
        });
        if (this.current()?.token === ",") this.advance();
      }
      this.expect(")");
      this.expect("=>");
      const returnTypeStr = this.current()!.token;
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
    return { kind: "expression", expr };
  }
}

// ============================================================================
// TYPE CHECKER
// ============================================================================

interface TypeEnv {
  vars: Map<string, { type: TypeDef; mutable: boolean }>;
  functions: Map<string, { params: TypeDef[]; returnType: TypeDef }>;
  parent?: TypeEnv;
}

class TypeChecker {
  private env: TypeEnv = {
    vars: new Map(),
    functions: new Map(),
  };
  private modules: Map<string, TypeEnv> = new Map();

  check(statements: Stmt[]): void {
    for (const stmt of statements) {
      this.checkStatement(stmt);
    }
  }

  private checkStatement(stmt: Stmt): void {
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

  private checkExpression(expr: Expr, expectedType: TypeDef): void {
    const actualType = this.inferType(expr);
    if (!typeCompatible(actualType, expectedType)) {
      throw new Error(
        `Type mismatch: expected ${JSON.stringify(expectedType)}, got ${JSON.stringify(actualType)}`
      );
    }
  }

  private inferType(expr: Expr): TypeDef {
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
        if (expr.op === "!") return { kind: "primitive", primitive: "bool" };
        return this.inferType(expr.operand);
      default:
        return { kind: "primitive", primitive: "any" };
    }
  }
}

// ============================================================================
// INTERPRETER
// ============================================================================

interface ControlFlow {
  type: "return" | "break" | "continue" | null;
  value?: any;
}

class Environment {
  private vars: Map<string, { value: any; mutable: boolean }> = new Map();
  private functions: Map<string, { params: string[]; body: Stmt[] }> = new Map();
  private modules: Map<string, any> = new Map();
  public parent: Environment | null = null;

  set(name: string, value: any, mutable = false): void {
    this.vars.set(name, { value, mutable });
  }

  get(name: string): any {
    if (this.vars.has(name)) {
      return this.vars.get(name)!.value;
    }
    if (this.parent) return this.parent.get(name);
    throw new Error(`Undefined variable: ${name}`);
  }

  update(name: string, value: any): void {
    if (this.vars.has(name)) {
      const entry = this.vars.get(name)!;
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

  setFunction(name: string, params: string[], body: Stmt[]): void {
    this.functions.set(name, { params, body });
  }

  getFunction(name: string): { params: string[]; body: Stmt[] } | null {
    if (this.functions.has(name)) {
      return this.functions.get(name)!;
    }
    if (this.parent) return this.parent.getFunction(name);
    return null;
  }

  setModule(name: string, module: any): void {
    this.modules.set(name, module);
  }

  getModule(name: string): any {
    if (this.modules.has(name)) {
      return this.modules.get(name);
    }
    if (this.parent) return this.parent.getModule(name);
    return null;
  }
}

class Interpreter {
  private env: Environment = new Environment();
  private controlFlow: ControlFlow = { type: null };

  constructor() {
    this.setupStdlib();
  }

  private setupStdlib(): void {
    this.env.setModule("std::io", {
      print: (value: any) => {
        console.log(value);
        return null;
      },
    });
    this.env.setModule("std::math", {
      sqrt: (x: number) => Math.sqrt(x),
      sin: (x: number) => Math.sin(x),
      cos: (x: number) => Math.cos(x),
      floor: (x: number) => Math.floor(x),
      ceil: (x: number) => Math.ceil(x),
    });
    this.env.setModule("std::text", {
      split: (s: string, sep: string) => s.split(sep),
      join: (arr: string[], sep: string) => arr.join(sep),
    });
  }

  interpret(statements: Stmt[]): void {
    for (const stmt of statements) {
      this.interpretStatement(stmt);
      if (this.controlFlow.type) break;
    }
  }

  private interpretStatement(stmt: Stmt): void {
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
            if (this.controlFlow.type) return;
          }
        } else if (stmt.else) {
          for (const s of stmt.else) {
            this.interpretStatement(s);
            if (this.controlFlow.type) return;
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
            if (this.controlFlow.type === "return") return;
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
            if (this.controlFlow.type === "return") return;
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
        break;
    }
  }

  private evaluateExpression(expr: Expr): any {
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
        const args = expr.args.map((a) =>
          this.evaluateExpression(a)
        );
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
  private code: string[] = [];

  generate(statements: Stmt[]): string {
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

  private generateStatement(stmt: Stmt): void {
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

  private generateExpression(expr: Expr): string {
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
        const args = expr.args.map((a) =>
          this.generateExpression(a)
        );
        return `${func}(${args.join(", ")})`;
      case "member":
        const obj = this.generateExpression(expr.object);
        return `${obj}.${expr.property}`;
      default:
        return "";
    }
  }

  private typeToCString(type: TypeDef): string {
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

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: strata <file.str>");
  process.exit(1);
}

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
} catch (error) {
  console.error(
    "Error:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}
