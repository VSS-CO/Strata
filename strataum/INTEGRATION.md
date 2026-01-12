# Strataum Integration Guide

## Integrating Strataum with Strata Package Manager

The Strataum server works seamlessly with the Strata package manager (strataum CLI) integrated into the main Strata compiler.

## Architecture

```
┌─────────────────────────────────────────┐
│  Strata Compiler (Main Project)         │
├─────────────────────────────────────────┤
│  ├─ index.ts (with PackageManager)      │
│  ├─ CLI: strataum init|add|remove|...   │
│  └─ Strataumfile / Strataumfile.lock    │
└──────────────────┬──────────────────────┘
                   │ (HTTP)
                   ↓
┌─────────────────────────────────────────┐
│  Strataum Registry Server (this folder) │
├─────────────────────────────────────────┤
│  ├─ server.ts (Registry API)            │
│  ├─ client.ts (CLI for server)          │
│  ├─ Web UI (http://localhost:4873)      │
│  └─ In-memory storage                   │
└─────────────────────────────────────────┘
```

## Setup & Configuration

### 1. Run Registry Server

```bash
cd strataum
npm install
npm run build
npm start

# Server starts on http://localhost:4873
```

### 2. Configure Strata Client

Set registry URL (optional, defaults to localhost:4873):

```bash
cd /path/to/strata/project
strataum set-registry http://localhost:4873
```

### 3. Authenticate

Register or login with the registry:

```bash
# Option A: Login with existing account
strataum login alice password123

# Option B: Register new account
strataum register alice alice@example.com password123
```

## Workflow: Publish & Install

### Publish a Package

```bash
# Create package
mkdir my-util
cd my-util

cat > Strataumfile << 'EOF'
{
  "name": "my-util",
  "version": "1.0.0",
  "registry": "http://localhost:4873",
  "dependencies": {}
}
EOF

cat > index.str << 'EOF'
func add(a: int, b: int) => int {
  return a + b
}

func sub(a: int, b: int) => int {
  return a - b
}
EOF

# Create package.json for publishing
cat > package.json << 'EOF'
{
  "name": "my-util",
  "version": "1.0.0",
  "description": "Simple math utilities",
  "main": "index.str",
  "license": "MIT",
  "keywords": ["math", "util"]
}
EOF

# Publish to registry
strataum-client publish package.json
# ✓ Published my-util@1.0.0
```

### Install a Package

In a new Strata project:

```bash
# Initialize project
strataum init my-app

# Add dependency from registry
strataum add my-util

# View installed packages
strataum list

# Check package info
strataum info my-util
```

### Use Package in Code

```str
import util from my-util::index

let result: int = util.add(5, 3)
io.print(result)  // 8
```

## API Integration

### Registry Client (StrataumClient)

The Strata package manager can use StrataumClient directly:

```typescript
import { StrataumClient } from './strataum/client';

const client = new StrataumClient('http://localhost:4873');

// Search packages
await client.search('util');

// Get package info
await client.info('my-util');

// Publish package
await client.publish('./package.json');
```

### Registry Server (StrataumRegistry)

Direct server integration:

```typescript
import { StrataumRegistry } from './strataum/server';

const registry = new StrataumRegistry();

// In serverless function
const state = registry.toJSON();
await storage.save('registry.json', state);

// On next invocation
const registry = StrataumRegistry.fromJSON(await storage.load('registry.json'));
```

## Package Format

### Strataumfile (Project Manifest)
Located in project root:
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "registry": "http://localhost:4873",
  "dependencies": {
    "my-util": "1.0.0",
    "http-client": "2.1.0"
  }
}
```

### Strataumfile.lock (Dependency Lock)
Auto-generated, tracks exact versions:
```json
{
  "locked": true,
  "version": "1.0",
  "timestamp": "2024-01-12T...",
  "packages": {
    "my-util": {
      "version": "1.0.0",
      "installed": true,
      "timestamp": "..."
    }
  }
}
```

### Package Source (package.json for Publishing)
Located in package root:
```json
{
  "name": "my-util",
  "version": "1.0.0",
  "description": "Math utilities",
  "main": "index.str",
  "license": "MIT",
  "keywords": ["math", "util"],
  "author": "alice"
}
```

### Package Content (index.str)
The actual Strata code being published:
```str
func add(a: int, b: int) => int {
  return a + b
}

export func sub(a: int, b: int) => int {
  return a - b
}
```

## Complete Example Workflow

### Step 1: Start Registry Server (Terminal 1)
```bash
cd strataum
npm start
# 🚀 Strataum Registry running on http://localhost:4873
```

### Step 2: Create & Publish Package (Terminal 2)
```bash
# Create package directory
mkdir math-lib
cd math-lib

# Create Strata code
cat > index.str << 'EOF'
func add(a: int, b: int) => int {
  return a + b
}

func multiply(a: int, b: int) => int {
  return a * b
}
EOF

# Create package manifest
cat > package.json << 'EOF'
{
  "name": "math-lib",
  "version": "1.0.0",
  "description": "Math functions",
  "main": "index.str",
  "license": "MIT",
  "keywords": ["math"]
}
EOF

# Login to registry
strataum login admin admin123

# Publish package
strataum publish package.json
# ✓ Published math-lib@1.0.0
```

### Step 3: Use in Another Project (Terminal 3)
```bash
# Create new project
mkdir app
cd app

# Initialize
strataum init my-app

# Add dependency
strataum add math-lib

# Create app code
cat > main.str << 'EOF'
import math from math-lib::index

func main() => void {
  let sum: int = math.add(10, 20)
  let product: int = math.multiply(5, 3)
  
  io.print(sum)      // 30
  io.print(product)  // 15
}

main()
EOF

# Run (once Strata compiler supports imports)
strata main.str
```

## Deployment Scenarios

### Local Development
```bash
# Terminal 1: Registry
cd strataum && npm start

# Terminal 2: Create/publish
# Terminal 3: Use packages
```

### Docker Deployment
```dockerfile
# Dockerfile for registry
FROM node:20
WORKDIR /app
COPY strataum/ .
RUN npm install && npm run build
EXPOSE 4873
CMD ["npm", "start"]
```

```bash
docker run -p 4873:4873 strataum-registry
```

### Serverless (AWS Lambda)
```typescript
// lambda.ts
import { StrataumRegistry } from './server';

let registry: StrataumRegistry | null = null;

export async function handler(event: any) {
    // Lazy init
    if (!registry) {
        const state = JSON.parse(process.env.REGISTRY_STATE || '{}');
        registry = StrataumRegistry.fromJSON(state);
    }
    
    // Handle HTTP request
    const response = await registry.handleRequest(event.body);
    
    // Save state
    process.env.REGISTRY_STATE = registry.toJSON();
    
    return response;
}
```

### Multi-Instance (Distributed)
```typescript
// Shared storage layer
const storage = new S3Storage();

// Load from storage
const state = JSON.parse(await storage.get('registry.json'));
const registry = StrataumRegistry.fromJSON(state);

// Handle requests
const response = await registry.handleRequest(request);

// Save back
await storage.put('registry.json', registry.toJSON());
```

## Environment Variables

```bash
# Server
PORT=4873                          # Registry server port
REGISTRY_HOST=0.0.0.0             # Bind address

# Client
STRATAUM_REGISTRY=http://localhost:4873    # Registry URL
STRATAUM_TOKEN=abc123...          # Auth token (auto-set)
STRATAUM_CONFIG=~/.strataumrc     # Config file location
```

## Troubleshooting

### Server won't start
```bash
# Check port
lsof -i :4873
# Kill if needed
kill <PID>
```

### Authentication failed
```bash
# Clear cached credentials
rm ~/.strataumrc

# Try logging in again
strataum login username password
```

### Can't find package
```bash
# Search to verify it exists
strataum search <package-name>

# Check registry URL
node dist/client.js whoami
# Not logged in? -> run 'strataum login'
```

### Package installation fails
```bash
# Check Strataumfile syntax
cat Strataumfile

# Check lock file
cat Strataumfile.lock

# Reinstall
strataum install <package-name>
```

## Security Best Practices

1. **Use HTTPS in Production**
   ```bash
   PORT=443 npm start  # With SSL certificate
   ```

2. **Change Default Password**
   ```bash
   strataum login admin
   # Update password
   ```

3. **Token Management**
   - Tokens stored in `~/.strataumrc`
   - Keep out of version control
   - Rotate regularly

4. **Private Registries**
   ```bash
   # Run separate instance behind firewall
   strataum set-registry http://internal-registry:4873
   ```

## API Reference

See [README.md](./README.md) for complete API documentation.

## Migration from Public Registry

```bash
# Search on public registry
strataum set-registry https://registry.stratauim.io
strataum search <package>

# Download and republish locally
strataum info <package>
# ... create local version ...
strataum set-registry http://localhost:4873
strataum publish package.json
```
