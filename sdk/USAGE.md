# Strata SDK - Usage Guide

Complete guide to using the Strata SDK for development.

## Table of Contents

1. [CLI Usage](#cli-usage)
2. [Programmatic API](#programmatic-api)
3. [GUI IDE](#gui-ide)
4. [Project Configuration](#project-configuration)
5. [Examples](#examples)
6. [Advanced Topics](#advanced-topics)

## CLI Usage

### Project Management

#### Create a new project

```bash
strata-sdk new my-project
strata-sdk new my-project --target js --optimize O3
```

Options:
- `--target` / `-t`: Build target (`c`, `js`, `bytecode`)
- `--optimize` / `-O`: Optimization level (`O0`, `O1`, `O2`, `O3`)

#### Initialize in current directory

```bash
strata-sdk init
```

Creates:
- `strata.toml` - Configuration file
- `src/main.str` - Entry point
- `.gitignore` - Git configuration

#### Open existing project

```bash
strata-sdk open /path/to/project
```

### Building and Running

#### Build a project

```bash
strata-sdk build my-project
strata-sdk build my-project --optimize O3 --verbose
```

Options:
- `--optimize` / `-O`: Override optimization level
- `--verbose` / `-v`: Detailed compilation output
- `--clean`: Clean build directory first
- `--watch`: Watch mode for continuous compilation

#### Run a file

```bash
strata-sdk run src/main.str
strata-sdk run main.str -- --arg1 value1
```

Arguments after `--` are passed to the program.

#### Build and run

```bash
strata-sdk build && strata-sdk run dist/main
```

### Code Analysis

#### Type checking

```bash
strata-sdk check src/main.str
```

Reports:
- Type errors
- Missing imports
- Undefined variables
- Unused variables (with strict mode)

#### Code analysis

```bash
strata-sdk analyze src/main.str
```

Reports:
- Imported modules
- Defined functions
- Type definitions
- Warnings and suggestions

#### Linting

```bash
strata-sdk lint src/
strata-sdk lint src/ --fix
```

## Programmatic API

### Basic Usage

```typescript
import { StrataRunner, ProjectManager } from '@strata/sdk';

const runner = new StrataRunner();
const pm = runner.getProjectManager();

// Create a project
const project = await pm.createProject('my-app');

// Compile
const compileResult = await runner.buildProject(project.path);

// Run
const runResult = await runner.runProject(project.path);
```

### Event Handling

```typescript
// Listen to compilation events
runner.on('compile', (event) => {
  if (event.type === 'start') {
    console.log('Compilation started');
  } else if (event.type === 'progress') {
    console.log(`Progress: ${event.progress}%`);
  } else if (event.type === 'complete') {
    console.log('Compilation complete');
  } else if (event.type === 'error') {
    console.error(event.error);
  }
});

// Listen to runtime events
runner.on('runtime', (event) => {
  if (event.type === 'output') {
    console.log(event.message);
  } else if (event.type === 'complete') {
    console.log(`Execution finished: exit code ${event.exitCode}`);
  }
});
```

### File Management

```typescript
// Add a file
const file = await pm.addFile(projectId, 'src/utils.str', `
func add(a: int, b: int) => int {
  return a + b
}
`);

// Update a file
await pm.updateFile(projectId, 'src/utils.str', newContent);

// Get file content
const files = pm.getProjectFiles(projectId);
for (const file of files) {
  console.log(file.name, file.path);
}

// Delete a file
await pm.deleteFile(projectId, 'src/old.str');

// Save all changes
await pm.saveProject(projectId);
```

### Compilation with Options

```typescript
const result = await runner.buildProject('my-project', {
  optimization: 'O3',
  verbose: true,
  clean: true
});

if (result.success) {
  console.log(`Output: ${result.outputFile}`);
  console.log(`Duration: ${result.duration}ms`);
} else {
  console.error(`Error: ${result.error}`);
}
```

### Type Checking

```typescript
const { valid, errors } = await runner.typeCheck('src/main.str');

if (!valid) {
  errors.forEach(err => console.error(err));
}
```

### Code Analysis

```typescript
const analysis = await runner.analyze('src/main.str');

console.log('Imports:', analysis.imports);
console.log('Functions:', analysis.functions);
console.log('Types:', analysis.types);
console.log('Warnings:', analysis.warnings);
```

## GUI IDE

### Launching the IDE

```bash
strata-sdk gui
```

Opens the Electron-based IDE with:
- Project explorer
- Code editor with syntax highlighting
- Built-in compiler and runtime
- Output console
- File management

### IDE Features

#### Project Management
- Create new projects
- Open existing projects
- View project structure in sidebar

#### Code Editing
- Syntax highlighting for Strata
- Auto-indentation
- Tab management
- Keyboard shortcuts:
  - `Ctrl+S` / `Cmd+S`: Save
  - `Ctrl+Shift+B` / `Cmd+Shift+B`: Build
  - `F5`: Run
  - `Ctrl+K Ctrl+C` / `Cmd+K Cmd+C`: Comment

#### Building and Running
- Build button with progress
- Run button for execution
- Real-time compilation errors
- Output console with execution results

#### File Management
- Add new files
- Delete files
- View file hierarchy
- Quick file switching

### IDE Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Project |
| `Ctrl+O` | Open Project |
| `Ctrl+S` | Save |
| `Ctrl+Shift+B` | Build |
| `F5` | Run |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+/` | Toggle Comment |
| `Tab` / `Shift+Tab` | Indent / Unindent |

## Project Configuration

### strata.toml Structure

```toml
[project]
name = "my-app"
version = "0.1.0"
description = "My Strata application"

[build]
target = "c"                  # c, js, bytecode
optimization = "O2"           # O0-O3
output = "./dist"

[dependencies]
math = "1.0.0"
io = "1.0.0"

[[warnings]]
level = "warn"                # strict, warn, allow
```

### Configuration Options

#### Project Section
- `name`: Project name
- `version`: Semantic version
- `description`: Project description
- `authors`: Author information
- `license`: Project license

#### Build Section
- `target`: Compilation target
  - `c`: C language output
  - `js`: JavaScript output
  - `bytecode`: Internal bytecode
- `optimization`: Optimization level
  - `O0`: No optimization
  - `O1`: Basic optimization
  - `O2`: Balanced optimization
  - `O3`: Aggressive optimization
- `output`: Output directory

#### Dependencies Section
```toml
[dependencies]
package_name = "version"
```

### Build Options

Pass build options via CLI or API:

```bash
# CLI
strata-sdk build --optimize O3 --verbose

# API
runner.buildProject(path, {
  optimization: 'O3',
  verbose: true,
  clean: true,
  watch: true
})
```

## Examples

### Hello World

**src/main.str**:
```strata
import io from std::io

func main() {
  io.println("Hello, Strata!")
}
```

**Run**:
```bash
strata-sdk run src/main.str
```

### Working with Modules

**src/math.str**:
```strata
func add(a: int, b: int) => int {
  return a + b
}

func multiply(a: int, b: int) => int {
  return a * b
}
```

**src/main.str**:
```strata
import io from std::io
import math from ./math

func main() {
  let result: int = math.add(5, 3)
  io.println("5 + 3 = " + result)
}
```

### Using Standard Library

```strata
import io from std::io
import math from std::math
import text from std::text

func main() {
  // Math operations
  let x: float = math.sqrt(16.0)
  io.println("sqrt(16) = " + x)

  // String operations
  let words: string[] = text.split("Hello, World!", ", ")
  io.println("Words: " + text.join(words, "|"))

  // Type conversions
  let num: int = text.toInt("42")
  io.println("Parsed: " + num)
}
```

## Advanced Topics

### Custom Build Configuration

Create `.stratarcrc`:

```json
{
  "compiler": {
    "optimization": "O3",
    "timeout": 60000
  },
  "build": {
    "parallel": true,
    "workers": 4
  },
  "runtime": {
    "timeout": 30000,
    "env": {
      "DEBUG": "1"
    }
  }
}
```

### Incremental Builds

Enable incremental compilation:

```bash
strata-sdk build --incremental
```

Only recompiles changed files and their dependencies.

### Watch Mode

Automatic recompilation on file changes:

```bash
strata-sdk build --watch
strata-sdk run --watch
```

### Debugging

Enable debug output:

```bash
DEBUG=strata:* strata-sdk build --verbose
```

View available debug namespaces:
- `strata:lexer` - Tokenization
- `strata:parser` - Parsing
- `strata:compiler` - Compilation
- `strata:runtime` - Execution

### Performance Profiling

Profile compilation:

```bash
strata-sdk build --profile
```

Generates performance report in `profile.json`.

### Testing

Write tests:

**src/math.test.str**:
```strata
import test from std::test
import math from ./math

test.describe("Math module", () => {
  test.it("should add numbers", () => {
    test.assertEquals(math.add(2, 3), 5)
  })

  test.it("should multiply numbers", () => {
    test.assertEquals(math.multiply(4, 5), 20)
  })
})
```

Run tests:

```bash
strata-sdk test
```

### Deployment

#### Docker

**Dockerfile**:
```dockerfile
FROM node:20-alpine
RUN npm install -g @strata/sdk
WORKDIR /app
COPY . .
RUN strata-sdk build
CMD ["strata-sdk", "run", "dist/main"]
```

Build and run:

```bash
docker build -t my-strata-app .
docker run my-strata-app
```

#### CI/CD Integration

**GitHub Actions** (`.github/workflows/strata.yml`):
```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install -g @strata/sdk
      - run: strata-sdk build
      - run: strata-sdk test
```

## Troubleshooting

### Build Fails with "Module not found"

```bash
# Verify imports
strata-sdk check src/main.str

# Analyze dependencies
strata-sdk analyze src/main.str
```

### Runtime Timeout

Increase timeout in configuration:

```json
{
  "runtime": {
    "timeout": 60000
  }
}
```

Or via CLI:

```bash
strata-sdk run --timeout 60000 main.str
```

### Memory Issues

Reduce optimization:

```bash
strata-sdk build -O O1
```

Or limit memory:

```bash
strata-sdk run --memory 256m main.str
```

### Compilation Too Slow

Enable parallel compilation:

```bash
strata-sdk build --parallel --workers 8
```

Use incremental builds:

```bash
strata-sdk build --incremental --watch
```

## Next Steps

- Explore [examples](./examples/)
- Read [API documentation](./README.md#api-reference)
- Check [installation guide](./INSTALLATION.md)
- Join [community](https://github.com/VSS-CO/Strata/discussions)
