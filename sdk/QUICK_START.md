# Strata SDK - Quick Start Guide

Get started with Strata SDK in 5 minutes.

## 🚀 Installation (30 seconds)

```bash
npm install -g @strata/sdk
```

Verify installation:
```bash
strata-sdk --version
```

## 📁 Create Your First Project (1 minute)

```bash
strata-sdk new hello-strata
cd hello-strata
```

This creates:
```
hello-strata/
├── strata.toml      # Project config
├── src/
│   └── main.str     # Your program
└── dist/            # Build output
```

## ✏️ Edit Your Program

Open `src/main.str`:

```strata
import io from std::io
import math from std::math

func greet(name: string) => string {
  return "Hello, " + name + "!"
}

func main() {
  io.println(greet("Strata"))
  io.println("Math: " + math.sqrt(16))
}
```

## ⚙️ Build & Run (1 minute)

```bash
# Build
strata-sdk build

# Run
strata-sdk run src/main.str
```

Expected output:
```
Hello, Strata!
Math: 4
```

## 🎨 Try the GUI IDE (1 minute)

```bash
strata-sdk gui
```

This opens the Electron IDE with:
- Code editor
- Project explorer
- Build button
- Run button
- Output console

## 📚 Next Steps

- **Learn more**: Read [README.md](./README.md)
- **Full guide**: Read [USAGE.md](./USAGE.md)
- **Architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Examples**: See [examples/](./examples/)

## 🔌 Use in Your Code

```typescript
import { StrataRunner } from '@strata/sdk';

const runner = new StrataRunner();

// Compile and run
const result = await runner.run('program.str');
console.log(result.output);

// Or build a project
const projectResult = await runner.buildProject('./my-project');
if (projectResult.success) {
  console.log('Build successful!');
}
```

## 💡 Common Commands

```bash
# Create new project
strata-sdk new my-app

# Build
strata-sdk build

# Run single file
strata-sdk run program.str

# Type check
strata-sdk check program.str

# Analyze code
strata-sdk analyze program.str

# Launch GUI
strata-sdk gui

# Get help
strata-sdk --help
```

## 🎯 Typical Workflow

```
1. strata-sdk new my-project
   └─ Create project

2. Edit src/main.str
   └─ Write Strata code

3. strata-sdk build
   └─ Compile to C/JS

4. strata-sdk run dist/main
   └─ Execute program

5. strata-sdk gui
   └─ Use GUI for editing/building
```

## ⚡ Pro Tips

### Edit in IDE
```bash
strata-sdk gui
# Edit, Build (Shift+B), Run (F5)
```

### Watch Mode (auto-rebuild)
```bash
strata-sdk build --watch
```

### Verbose Output
```bash
strata-sdk build --verbose
strata-sdk run program.str --verbose
```

### Type Checking Only
```bash
strata-sdk check program.str
```

## 📖 Documentation Map

| Document | Use for |
|----------|---------|
| [README.md](./README.md) | Overview, features, API |
| [USAGE.md](./USAGE.md) | How to use SDK |
| [INSTALLATION.md](./INSTALLATION.md) | Setup help |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How it works |
| [QUICK_START.md](./QUICK_START.md) | Get started fast (this!) |

## ✅ Verify Installation

Run the hello-world example:

```bash
cd examples/hello-world
strata-sdk build
strata-sdk run src/main.str
```

Should output:
```
Hello, Strata!
Math example: sqrt(16) = 4
```

## 🆘 Troubleshooting

### Command not found
```bash
npm install -g @strata/sdk
# or use: npx strata-sdk
```

### Permission denied (macOS/Linux)
```bash
sudo chown -R $(whoami) ~/.npm
npm install -g @strata/sdk
```

### More help
See [INSTALLATION.md](./INSTALLATION.md#troubleshooting)

## 📞 Support

- **Docs**: [README.md](./README.md)
- **Questions**: [GitHub Discussions](https://github.com/VSS-CO/Strata/discussions)
- **Issues**: [GitHub Issues](https://github.com/VSS-CO/Strata/issues)

---

**You're ready! Start building with Strata. 🎉**
