# Strataum Registry Architecture

## Overview

Strataum is a package registry server for the Strata language, similar to npm registry. It provides:
- Package publishing, versioning, and discovery
- User authentication with token-based access
- Web UI for browsing packages
- Serverless-ready in-memory storage
- Full REST API

## Components

### 1. Server (`server.ts`)

**StrataumRegistry Class**
- Core registry implementation
- In-memory storage for serverless compatibility
- HTTP request handler
- Export/import functionality for persistence

**Key Methods:**
```typescript
handleRegister()      // Register new users
handleLogin()         // Authenticate users
handlePublish()       // Publish packages
handleSearch()        // Search packages
handlePackageInfo()   // Get package details
handleInstall()       // Download packages
handleWebUI()         // Serve web interface
```

**Storage Structure:**
```typescript
interface RegistryStorage {
    users: Map<string, User>         // username -> user data
    packages: Map<string, Package[]> // name -> [versions]
    tokens: Map<string, string>      // token -> username
}
```

### 2. Client (`client.ts`)

**StrataumClient Class**
- Command-line interface
- Registry communication
- Configuration management
- Token/credential storage

**Key Commands:**
```bash
register    # Create user account
login       # Authenticate
logout      # Clear session
publish     # Upload package
search      # Find packages
info        # Package details
whoami      # Current user
set-registry # Change registry URL
```

### 3. Web UI

**Features:**
- Dashboard with statistics
- User registration form
- Login interface
- Package search
- Package listing

**Built with:**
- Vanilla HTML5
- CSS3 with gradients & animations
- Fetch API for HTTP requests
- LocalStorage for credentials

## Data Models

### User
```typescript
interface User {
    username: string
    password: string          // Base64 hashed
    email: string
    token: string             // Auth token
    createdAt: string         // ISO timestamp
}
```

### Package
```typescript
interface Package {
    name: string
    version: string
    author: string            // User who published
    description: string
    main: string              // Entry file (usually index.str)
    license: string
    keywords: string[]
    tarball: string           // Base64 encoded file
    createdAt: string
    updatedAt: string
}
```

## API Endpoints

### Authentication

**Register**
```
POST /api/register
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "secret123"
}
```

**Login**
```
POST /api/login
{
  "username": "alice",
  "password": "secret123"
}
Response: { "token": "...", "user": {...} }
```

### Package Management

**Publish**
```
POST /api/publish
Authorization: Bearer <token>
{
  "name": "pkg-name",
  "version": "1.0.0",
  "description": "...",
  "main": "index.str",
  "license": "MIT",
  "keywords": [...],
  "tarball": "base64-content"
}
```

**Search**
```
GET /api/search?q=<query>
Response: { "results": [...], "total": N }
```

**Package Info**
```
GET /api/package/<name>
Response: { "name": "...", "versions": [...] }
```

**Install**
```
GET /api/package/<name>@<version>
Returns: Binary tarball
```

**List All**
```
GET /api/packages
Response: { "packages": [...] }
```

## Request Flow

### Publish Flow
```
Client
  ↓
strataum publish package.json
  ↓
Read package.json + main file
  ↓
Create tarball (base64)
  ↓
POST /api/publish (with token)
  ↓
Server validates token
  ↓
Server creates Package object
  ↓
Server stores in packages map
  ↓
Response: 201 Created
```

### Search Flow
```
Web UI / CLI
  ↓
GET /api/search?q=query
  ↓
Server filters packages by name
  ↓
Server returns matching packages
  ↓
Client displays results
```

## Storage & Persistence

### In-Memory (Runtime)
All data stored in Maps:
```javascript
users: Map<string, User>
packages: Map<string, Package[]>
tokens: Map<string, string>
```

### Serverless Export
```typescript
registry.toJSON()  // Export all state as JSON

StrataumRegistry.fromJSON(state)  // Restore state
```

**Usage Pattern:**
1. Load state from persistent storage (S3, Firestore, etc.)
2. Initialize registry with state
3. Handle requests
4. Export state after mutations
5. Save to persistent storage

### Example: AWS Lambda
```typescript
import { StrataumRegistry } from './server';

let registry: StrataumRegistry;

export async function handler(event: APIGatewayEvent) {
    // Load state on cold start
    if (!registry) {
        const state = await loadFromS3('registry-state.json');
        registry = StrataumRegistry.fromJSON(state);
    }
    
    // Handle request
    const response = await registry.handleRequest(event);
    
    // Persist state
    await saveToS3('registry-state.json', registry.toJSON());
    
    return response;
}
```

## Security

### Authentication
- Token-based (Bearer token in Authorization header)
- Tokens generated with `generateToken()` - cryptographically random
- Token stored in local `.strataumrc` file

### Password Hashing
- Base64 encoding (simple hash for demo)
- **Note:** Production should use bcrypt/argon2

### Data Validation
- Required field checks
- Email format validation
- User existence checks

## Configuration

### Server
```bash
PORT=4873              # Default registry port
STRATAUM_REGISTRY=url  # For client registry URL
```

### Client
Stored in `~/.strataumrc`:
```json
{
  "registry": "http://localhost:4873",
  "username": "alice",
  "token": "token123..."
}
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Register | O(1) | Map insertion |
| Login | O(1) | Map lookup |
| Publish | O(1) | Map lookup + array push |
| Search | O(n) | Linear scan of packages |
| Get Info | O(1) | Direct map lookup |
| List All | O(n) | Iterate packages |

## Limitations & Future Improvements

### Current
- In-memory storage only
- No database integration
- Simple password hashing
- No rate limiting
- No package signing/verification

### Future
- Database persistence (PostgreSQL, MongoDB)
- Bcrypt password hashing
- Rate limiting & throttling
- Package signing with GPG
- Tarball storage (S3, filesystem)
- Package statistics/analytics
- Dependency resolution
- Package deprecation management
- User organizations & teams
- CDN integration
- Download statistics

## Testing

### Manual Testing
```bash
# 1. Start server
npm start

# 2. Register user
node dist/client.js register test test@example.com test123

# 3. Create & publish package
mkdir test-pkg
cd test-pkg
echo '{"name":"test","version":"1.0.0","description":"Test"}' > package.json
echo 'func test() => int { return 42 }' > index.str
node ../dist/client.js publish package.json

# 4. Search
node dist/client.js search test

# 5. Get info
node dist/client.js info test
```

### Web UI Testing
1. Open http://localhost:4873
2. Test registration
3. Test login
4. Test search
5. Verify package listing

## File Structure

```
strataum/
├── server.ts          # Registry server implementation
├── client.ts          # CLI client implementation
├── package.json       # Package configuration
├── tsconfig.json      # TypeScript config
├── dist/              # Compiled JavaScript
│   ├── server.js
│   ├── client.js
│   ├── server.d.ts
│   └── client.d.ts
├── README.md          # Full documentation
├── QUICKSTART.md      # Quick start guide
├── ARCHITECTURE.md    # This file
└── .gitignore         # Git ignore rules
```

## References

- npm Registry: https://registry.npmjs.org/
- npm CLI: https://docs.npmjs.com/cli
- Package.json format: https://docs.npmjs.com/cli/configuring-npm/package-json
