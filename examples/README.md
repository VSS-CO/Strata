# Strata Language Examples

This directory contains organized examples demonstrating all features of the Strata language.

## Running Examples

Run any example with:
```bash
node dist/main.js examples/NN_name.str
```

## Examples by Category

### Fundamentals
1. **01_basic_types.str** - Primitive types (int, float, bool, char, string)
2. **02_arithmetic.str** - Arithmetic operators (+, -, *, /, %)
3. **03_comparison.str** - Comparison operators (==, !=, <, >, <=, >=)
4. **04_logical.str** - Logical operators (&&, ||, !)
5. **05_unary.str** - Unary operators (-, +, !, ~)

### Control Flow
6. **06_if_else.str** - If/else conditionals
7. **07_while_loop.str** - While loops
8. **08_for_loop.str** - For loops
9. **09_break_continue.str** - Break and continue statements

### Functions
10. **10_functions.str** - Function declarations with type annotations

### Standard Library
11. **11_math_module.str** - Math functions (sqrt, pow, abs, floor, ceil, random)
12. **12_text_module.str** - Text functions (toUpper, toLower, length)
13. **13_util_module.str** - Utility functions (randomInt)
14. **14_time_module.str** - Time functions (now)

### Advanced Concepts
15. **15_type_safety.str** - Type checking and constraints
16. **16_immutability.str** - Immutable (let, const) vs mutable (var)
17. **17_nested_control.str** - Complex nested control structures
18. **18_algorithms.str** - Common algorithms (Fibonacci, prime, GCD, etc.)
19. **19_operators_precedence.str** - Operator precedence rules

## Language Features

### Type System
- **Explicit types**: `int`, `float`, `bool`, `char`, `string`, `any`
- **Type annotations**: `let x: int = 42`
- **Type checking**: Compile-time validation before execution

### Immutability
- **Immutable**: `let` and `const` create immutable bindings
- **Mutable**: `var` allows reassignment
- **Safety**: Immutability enforced at runtime

### Control Flow
- **Conditionals**: `if`, `else if`, `else`
- **Loops**: `while`, `for` (C-style)
- **Loop Control**: `break`, `continue`
- **Functions**: `func name(params) => returnType { ... }`

### Operators
- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `&&`, `||`, `!`
- **Unary**: `-`, `+`, `!`, `~`

### Modules
- **I/O**: `io.print()`, `io.println()`
- **Math**: `math.sqrt()`, `math.pow()`, `math.abs()`, `math.floor()`, `math.ceil()`, `math.random()`
- **Text**: `text.toUpper()`, `text.toLower()`, `text.length()`
- **Util**: `util.randomInt()`
- **Time**: `time.now()`

## Quick Start

Start with these examples in order:
1. `01_basic_types.str` - Learn variable declaration
2. `02_arithmetic.str` - Understand operators
3. `06_if_else.str` - Control decision-making
4. `07_while_loop.str` - Iteration basics
5. `10_functions.str` - Function structure
6. `18_algorithms.str` - Practical algorithms

## Type Safety Examples

```strata
// Valid: types match
let x: int = 42
let y: int = x + 10

// Invalid: type mismatch
// let z: int = "hello"  // ERROR

// Gradual typing
let flexible: any = 42
var flexible: any = "now string"  // OK with any type
```

## Immutability Examples

```strata
let immutable: int = 10
// immutable = 20  // ERROR: cannot reassign

var mutable: int = 10
var mutable: int = 20  // OK

const CONSTANT: float = 3.14159
// CONSTANT = 3.0  // ERROR
```

## Module Examples

```strata
import io from str
import math from str
import text from str

io.print(math.sqrt(25))           // 5
io.print(text.toUpper("hello"))   // HELLO
```

## Operator Precedence (High to Low)

1. Unary: `!`, `-`, `+`, `~`
2. Multiplicative: `*`, `/`, `%`
3. Additive: `+`, `-`
4. Relational: `<`, `>`, `<=`, `>=`
5. Equality: `==`, `!=`
6. Logical AND: `&&`
7. Logical OR: `||`

## Additional Resources

- `LANGUAGE_FEATURES.md` - Complete language documentation
- `EXTENSION_SUMMARY.md` - Feature overview
- `main.ts` - Full implementation
