# Strataum Registry Server

Official package registry server for the Strata language, similar to npm registry.

## Features

- 🔐 User authentication & token-based access
- 📦 Package publishing & versioning
- 🔍 Search & package information
- 🌐 Web UI for browsing packages
- 💾 In-memory storage (serverless-ready)
- 📊 Package statistics & analytics

## Quick Start

### Start the Registry Server

```bash
cd strataum
npm install
npm run build
npm start
```

Server runs on `http://localhost:4873` with web UI available.

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

## API Endpoints

### Authentication

**Register User**
```bash
POST /api/register
Content-Type: application/json

{
  "username": "user",
  "email": "user@example.com",
  "password": "password123"
}
```

**Login**
```bash
POST /api/login
Content-Type: application/json

{
  "username": "user",
  "password": "password123"
}

# Response includes token
{
  "token": "abc123...",
  "user": { "username": "user", "email": "user@example.com" }
}
```

### Package Operations

**Publish Package**
```bash
POST /api/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "my-package",
  "version": "1.0.0",
  "description": "My awesome package",
  "main": "index.str",
  "license": "MIT",
  "keywords": ["util", "helper"],
  "tarball": "base64-encoded-file-content"
}
```

**Search Packages**
```bash
GET /api/search?q=util
```

**Get Package Info**
```bash
GET /api/package/my-package
```

**Install Package**
```bash
GET /api/package/my-package@1.0.0
```

**List All Packages**
```bash
GET /api/packages
```

## Client CLI Usage

The Strataum client provides a command-line interface for registry operations.

### Commands

**Register**
```bash
strataum register <username> <email> <password>
```

**Login**
```bash
strataum login <username> <password>
```

**Logout**
```bash
strataum logout
```

**Publish Package**
```bash
strataum publish <path-to-package.json>
```

**Search**
```bash
strataum search <query>
```

**Package Info**
```bash
strataum info <package-name>
```

**Show Current User**
```bash
strataum whoami
```

**Set Registry URL**
```bash
strataum set-registry <url>
```

## Configuration

Client config is stored at `~/.strataumrc`:

```json
{
  "registry": "http://localhost:4873",
  "username": "your-username",
  "token": "your-auth-token"
}
```

## Serverless Deployment

The registry can be deployed to serverless platforms (AWS Lambda, Google Cloud Functions, etc.) using the export/import functionality:

```typescript
import { StrataumRegistry } from "./server";

const registry = new StrataumRegistry();
// ... operations ...

// Export state
const state = registry.toJSON();
// Save to persistent storage

// Restore state
const restored = StrataumRegistry.fromJSON(state);
```

## Example Workflow

### 1. Start Server
```bash
npm start
```

### 2. Register User
```bash
strataum register alice alice@example.com password123
```

### 3. Create Package
```bash
mkdir my-util
cd my-util
cat > package.json << 'EOF'
{
  "name": "my-util",
  "version": "1.0.0",
  "description": "Utility functions",
  "main": "index.str",
  "license": "MIT",
  "keywords": ["util"]
}
EOF

cat > index.str << 'EOF'
func add(a: int, b: int) => int {
  return a + b
}
EOF
```

### 4. Publish Package
```bash
strataum publish package.json
```

### 5. Search Packages
```bash
strataum search util
```

### 6. Get Package Info
```bash
strataum info my-util
```

## Architecture

```
┌─────────────────────────────────────────┐
│      Strataum Registry Server           │
├─────────────────────────────────────────┤
│  HTTP Server (Node.js)                  │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │  API Handlers                      ││
│  │  ├─ Authentication                 ││
│  │  ├─ Publishing                     ││
│  │  ├─ Search                         ││
│  │  └─ Installation                   ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │  Storage Layer (In-Memory)         ││
│  │  ├─ Users Map                      ││
│  │  ├─ Packages Map                   ││
│  │  └─ Tokens Map                     ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  Web UI (Single Page Application)       │
│  ├─ Login/Register                      │
│  ├─ Package Search                      │
│  └─ Package Browsing                    │
└─────────────────────────────────────────┘
```

## Environment Variables

- `PORT` - Server port (default: 4873)
- `STRATAUM_REGISTRY` - Registry URL for client (default: http://localhost:4873)

## License

GPL-3.0
