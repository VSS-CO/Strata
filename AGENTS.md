# Strata Extended - Agent Development Guide

## Build & Test Commands

```bash
npx tsc                              # Compile TypeScript to JavaScript (dist/main.js)
node dist/main.js <file>.str         # Run a Strata program
npm test                             # Run single test (no test runner configured)
```

Test files are .str files in examples/. Run any with: `node dist/main.js examples/01_basic_types.str`

## Architecture & Structure

**Single-file implementation**: index.ts → dist/main.js (1 file, 620+ lines, zero dependencies)

**Core subsystems**:
- Lexer: Tokenization with location tracking (line/column)
- Parser: Recursive descent, operator precedence climbing
- TypeChecker: Compile-time type validation before execution
- Interpreter: AST evaluation with environment-based scoping
- CGenerator: Outputs C code from AST

**Key components**:
- TYPE_REGISTRY: Primitive types (int, float, bool, char, string, any)
- Environment: Variable scoping with mutability tracking (var/let/const)
- ControlFlow: return/break/continue handling
- Expr/Stmt discriminated unions for AST

## Code Style & Conventions

**Naming**: camelCase for functions/variables, PascalCase for classes/types

**Imports**: `import * as fs from "fs"` style (ES module)

**Types**: Explicit annotations required. Use union types with discriminated unions (kind field)

**Comments**: Section headers with `// ============================================================================`

**Error handling**: Throw with location context. Format: `message at line X, column Y`

**AST construction**: Use factory functions (ExprTypes.*, StmtTypes.*)

**Mutability**: Default immutable (let/const). Explicit var for mutable

**Type checking**: All validation before execution. int→float allowed, others strict
