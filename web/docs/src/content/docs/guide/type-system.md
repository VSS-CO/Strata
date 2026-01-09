---
title: Type System
description: Understand Strata's static type system
---

# Type System

Strata is a statically typed language. Types are checked at compile time, catching errors before runtime.

## Why Static Typing?

Static typing prevents entire classes of bugs:

```strata
// This is caught at compile time:
let x: int = 42
let message: string = x  // Error: cannot assign int to string

// This would cause a runtime error in untyped languages
```

## The Basic Types

### int

32-bit signed integer:

```strata
let age: int = 25
let temperature: int = -10
let count: int = 0
```

**Operations:**
```strata
let sum: int = 5 + 3         // 8
let diff: int = 10 - 3       // 7
let product: int = 4 * 5     // 20
let quotient: int = 20 / 4   // 5
let remainder: int = 10 % 3  // 1
```

**Comparisons:**
```strata
let x: int = 5
let y: int = 10

if (x > y) { ... }   // false
if (x < y) { ... }   // true
if (x == y) { ... }  // false
if (x != y) { ... }  // true
```

### float

64-bit floating-point number:

```strata
let pi: float = 3.14159
let temperature: float = 98.6
let price: float = 19.99
```

**Operations:**
```strata
let sum: float = 3.5 + 2.5      // 6.0
let product: float = 2.5 * 4.0  // 10.0
let quotient: float = 10.0 / 2.5 // 4.0
```

### string

Text values (immutable):

```strata
let greeting: string = "Hello"
let empty: string = ""
let escaped: string = "Line 1\nLine 2"
```

**Concatenation:**
```strata
let first: string = "Hello"
let second: string = "World"
let combined: string = first + ", " + second  // "Hello, World"
```

### bool

Boolean: `true` or `false`:

```strata
let active: bool = true
let completed: bool = false
let isAdult: bool = age >= 18
```

**Operators:**
```strata
let a: bool = true
let b: bool = false

if (a && b) { ... }  // AND → false
if (a || b) { ... }  // OR → true
if (!a) { ... }      // NOT → false
```

### any

The universal type (rarely used):

```strata
func printAnything(value: any) => any {
  io.print(value)
}
```

## Type Consistency

Strata enforces type consistency:

```strata
let x: int = 42
let y: string = "hello"

// Error: cannot add int and string
let result: any = x + y

// Correct: convert to string first
import text from str
let result: string = text.intToString(x) + y
```

## Arrays

Arrays hold multiple values of the same type:

```strata
let numbers: any = [1, 2, 3, 4, 5]
let words: any = ["hello", "world"]
let empty: any = []
```

**Access elements:**
```strata
let first: any = numbers[0]   // 1
let second: any = numbers[1]  // 2
```

**Array operations:**
```strata
import io from str

let arr: any = [10, 20, 30]
let length: any = io.len(arr)  // 3
```

## Type Conversions

Convert between types explicitly:

```strata
import text from str

// int to string
let num: int = 42
let str: string = text.intToString(num)

// string to int
let input: string = "123"
let value: int = io.toInt(input)
```

## Functions and Types

Every function must declare its types:

```strata
// Parameter types
func add(a: int, b: int) => int {
  return a + b
}

// Works correctly
let result: int = add(5, 3)  // 8

// Type error
let wrong: string = add(5, 3)  // Error: int cannot be assigned to string
```

## Type Safety Examples

### Preventing String/Number Confusion

```strata
let age: int = 25
let message: string = "Age: " + age  // Error: cannot concat int to string

// Correct way:
import text from str
let message: string = "Age: " + text.intToString(age)
```

### Preventing Boolean Mistakes

```strata
let flag: bool = true

// Error: int is not bool
if (flag == 1) { ... }

// Correct:
if (flag == true) { ... }
```

### Preventing Math Type Mismatches

```strata
let count: int = 10
let average: float = 25.5

// Error: cannot directly mix int and float
let total: any = count + average

// Conversion needed (may depend on context)
```

## Designing Functions with Types

Type signatures document your functions:

```strata
// This signature tells you exactly what to pass and what you get back
func calculateDiscount(price: float, discountPercent: float) => float {
  return price * (1.0 - discountPercent / 100.0)
}

// Callers know:
// - Both inputs must be floats
// - The result will be a float
let discounted: float = calculateDiscount(99.99, 10.0)
```

## Best Practices

### Always annotate function parameters:
```strata
// Good
func multiply(x: int, y: int) => int { ... }

// Bad - missing type info
func multiply(x, y) => int { ... }  // Error
```

### Prefer specific types:
```strata
// Good - specific types
let value: int = 42
let name: string = "Alice"

// Avoid - too generic
let data: any = 42
let info: any = "Alice"
```

### Use types to document intent:
```strata
// This type signature says: "I take two positive numbers and return their sum"
func sum(a: float, b: float) => float {
  return a + b
}
```

## Next Steps

- **[Variables & Types](./variables-and-types)** — Declare and use variables
- **[Functions](./functions)** — Define typed functions
- **[Examples](../examples)** — See type system in practice
