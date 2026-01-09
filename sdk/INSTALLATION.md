# Strata SDK Installation Guide

## Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Git**: For cloning repositories
- **C++ Compiler**: For building native extensions (optional)
  - **Linux**: `gcc` or `clang`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools

## Installation Methods

### 1. NPM Global Installation (Recommended)

```bash
npm install -g @strata/sdk
```

Verify installation:

```bash
strata-sdk --version
```

### 2. Local Project Installation

```bash
npm install @strata/sdk --save-dev
```

Use via npm scripts:

```json
{
  "scripts": {
    "build": "strata-sdk build",
    "run": "strata-sdk run"
  }
}
```

### 3. From Source

```bash
git clone https://github.com/VSS-CO/Strata.git
cd Strata/sdk
npm install
npm run build
npm link  # Make available globally
```

## Building with Native Extensions

For maximum performance, build native C++ bindings:

### Linux/macOS

```bash
npm install --build-from-source
```

Requires:
- GCC/Clang
- Make
- Python 3

### Windows

```bash
npm install --build-from-source
```

Requires:
- Visual Studio Build Tools
- Python 3

### WebAssembly Build

```bash
# Install Emscripten
brew install emscripten  # macOS
# or download from https://emscripten.org

# Build WASM
npm run build:wasm
```

## Post-Installation Setup

### 1. Initialize Your First Project

```bash
mkdir my-strata-app
cd my-strata-app
strata-sdk init
```

This creates:
- `strata.toml` - Project configuration
- `src/main.str` - Main program file
- `dist/` - Build output directory

### 2. Launch the IDE

```bash
strata-sdk gui
```

The Electron IDE will open with your project loaded.

### 3. Build and Run

```bash
# Build to C
strata-sdk build

# Run the program
strata-sdk run src/main.str
```

## Troubleshooting

### "strata-sdk: command not found"

**Solution**: Ensure global installation:

```bash
npm install -g @strata/sdk
npm link @strata/sdk
```

Or use local installation:

```bash
npx strata-sdk --version
```

### "Cannot find module '@strata/sdk'"

**Solution**: Install in the current project:

```bash
npm install @strata/sdk
```

### Native Addon Build Fails

**Solution**: Install build tools:

**macOS**:
```bash
xcode-select --install
```

**Ubuntu/Debian**:
```bash
sudo apt-get install build-essential python3
```

**Windows**:
- Install Visual Studio Build Tools from https://visualstudio.microsoft.com/downloads/

### Compiler Not Found

**Solution**: Ensure Strata compiler is in PATH:

```bash
# Check installation
which strata  # macOS/Linux
where strata  # Windows

# Add to PATH if needed
export PATH=$PATH:/path/to/strata/bin
```

### Permission Denied (macOS/Linux)

**Solution**: Fix permissions:

```bash
sudo chown -R $(whoami) ~/.npm
npm install -g @strata/sdk
```

## Development Setup

### For SDK Contributors

```bash
git clone https://github.com/VSS-CO/Strata.git
cd Strata/sdk

# Install dependencies
npm install

# Watch mode
npm run build:watch

# Run tests
npm test

# Build everything
npm run build
npm run build:gui
npm run build:native
```

## Docker Installation

```dockerfile
FROM node:20-alpine

RUN npm install -g @strata/sdk

WORKDIR /app
COPY . .

RUN strata-sdk build

CMD ["strata-sdk", "run", "src/main.str"]
```

Build and run:

```bash
docker build -t strata-app .
docker run strata-app
```

## Configuration

### Environment Variables

```bash
# Set optimization level
export STRATA_OPTIMIZATION=O3

# Set build target
export STRATA_TARGET=c

# Enable verbose logging
export STRATA_VERBOSE=1

# Set compiler path
export STRATA_COMPILER=/usr/local/bin/strata
```

### Configuration Files

Create `.stratarcrc` in project root:

```json
{
  "compiler": {
    "path": "strata",
    "timeout": 30000
  },
  "build": {
    "target": "c",
    "optimization": "O2"
  },
  "runtime": {
    "timeout": 10000,
    "env": {
      "DEBUG": "1"
    }
  }
}
```

## Uninstallation

### Global Installation

```bash
npm uninstall -g @strata/sdk
```

### Local Installation

```bash
npm uninstall @strata/sdk
```

### Complete Cleanup

```bash
# Remove cache
rm -rf ~/.strata
rm -rf ~/.npm

# Remove global installation
npm uninstall -g @strata/sdk

# Remove from projects
npm uninstall @strata/sdk
```

## Next Steps

After installation:

1. **Read the Quick Start**: `strata-sdk docs`
2. **Explore Examples**: `cd sdk/examples/hello-world`
3. **Create a Project**: `strata-sdk new my-app`
4. **Launch IDE**: `strata-sdk gui`
5. **Join Community**: https://github.com/VSS-CO/Strata/discussions

## Support

- **Documentation**: https://github.com/VSS-CO/Strata/wiki
- **Issues**: https://github.com/VSS-CO/Strata/issues
- **Community**: https://github.com/VSS-CO/Strata/discussions
