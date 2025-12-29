# Strata Language

Strata is a simple, interpreted programming language with support for running and compiling to multiple targets such as C, C++, C#, Shell, and Batch.

## Features

* Modules: `str.io`, `str.math`, `str.util`, `str.time`, `str.lang`, `str.net`, `str.sql`, `str.xml`, `str.rmi`, `str.security`, `str.text`
* Basic types: `int`, `float`, `string`, `bool`
* Variable creation and assignment: `create type x`, `set var x = 9`
* Functions: `func name { ... }`
* Conditional statements: `if`, `else`
* Loops: `while`, `for`
* Built-in functions: `io.print`, `math.sqrt`, `math.pow`, `math.random`, `util.randomInt`, `time.now`
* Compilation to: C, C++, C#, Shell, Batch

## Keywords

`if`, `else`, `while`, `for`, `break`, `continue`, `return`, `let`, `const`, `int`, `float`, `string`, `bool`, `func`, `end`, `import`, `from`, `true`, `false`, `null`, `typeof`

## Example Program

```
import io
import math

create type x
set var x = 9

io.print(math.sqrt(x))
```

## CLI Usage

### Run a Strata program

```
strata run <file.str>
```

### Compile a Strata program

```
strata compile <file.str> --target <c|cpp|cs|sh|bat>
```

### Example

```
strata run example.str
strata compile example.str --target c
```

## Modules Usage

### str.io

```
io.print("Hello World")
```

### str.math

```
math.sqrt(16)
math.pow(2, 3)
math.random()
```

### str.util

```
util.randomInt(10)
```

### str.time

```
time.now()
```

## Notes

* Variables must be created before assignment.
* Functions can be defined using `func name { ... }`.
* Supports importing modules using `import module_name`.
* Compilation generates source code and optionally builds executables for C and C++ targets.
