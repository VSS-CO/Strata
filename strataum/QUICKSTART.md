# Strataum Registry - Quick Start Guide

## 🚀 Setup

```bash
cd strataum
npm install
npm run build
```

## 💻 Start Server

```bash
npm start
# 🚀 Strataum Registry running on http://localhost:4873
# 📦 Web UI: http://localhost:4873
# 🔐 Default credentials: admin / admin123
```

Visit http://localhost:4873 in your browser to access the web UI.

## 🔐 Authenticate

### Login (in separate terminal)
```bash
node dist/client.js login admin admin123
# ✓ Login successful!
# ✓ Token saved to ~/.strataumrc
# Welcome back, admin!
```

### Register New User
```bash
node dist/client.js register alice alice@example.com password123
# ✓ Registration successful!
# ✓ Token saved to ~/.strataumrc
# Welcome, alice!
```

## 📦 Publish Package

### 1. Create a package
```bash
mkdir test-package
cd test-package
cat > package.json << 'EOF'
{
  "name": "test-util",
  "version": "1.0.0",
  "description": "Test utility functions",
  "main": "index.str",
  "license": "MIT",
  "keywords": ["test", "util"]
}
EOF

cat > index.str << 'EOF'
func add(a: int, b: int) => int {
  return a + b
}

func multiply(a: int, b: int) => int {
  return a * b
}
EOF
```

### 2. Publish
```bash
node ../dist/client.js publish package.json
# ✓ Published test-util@1.0.0
# ✓ Available at: http://localhost:4873/api/package/test-util@1.0.0
```

## 🔍 Search & Browse

### Search for packages
```bash
node dist/client.js search util
# Found 1 package(s):
#
# 📦 test-util@1.0.0
#    Test utility functions
#    Author: admin
```

### Get package info
```bash
node dist/client.js info test-util
# 📦 test-util
#
# Versions:
#   1.0.0 - Test utility functions
#     Published by admin on 1/12/2026
```

## 🌐 Web UI Features

1. **Dashboard** - View package statistics
2. **Register** - Create new user accounts
3. **Login** - Authenticate with credentials
4. **Search** - Find packages by name/keyword
5. **Browse** - View all available packages

## 📋 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

### Packages
- `POST /api/publish` - Publish package
- `GET /api/packages` - List all packages
- `GET /api/search?q=<query>` - Search packages
- `GET /api/package/<name>` - Get package info
- `POST /api/package/<name>@<version>` - Install package

## 🔧 Configuration

Client config stored at `~/.strataumrc`:

```json
{
  "registry": "http://localhost:4873",
  "username": "admin",
  "token": "abc123..."
}
```

### Change registry
```bash
node dist/client.js set-registry http://other-registry.com
```

## 🗄️ Serverless Export

Export registry state for serverless deployment:

```javascript
const registry = new StrataumRegistry();
const state = registry.toJSON();
// Save state to storage (e.g., S3, Firestore)
```

Restore state:
```javascript
const registry = StrataumRegistry.fromJSON(savedState);
```

## 📚 Examples

### Example 1: Multi-version package
```bash
# Publish v1.0.0
node dist/client.js publish package.json

# Update version in package.json to 1.1.0
# Add new features to index.str
node dist/client.js publish package.json

# Install specific version
node dist/client.js info my-package
```

### Example 2: Keyword search
```bash
# Create packages with keywords
# Search by keywords
node dist/client.js search json
node dist/client.js search http
node dist/client.js search crypto
```

## 🆘 Troubleshooting

**Port already in use?**
```bash
PORT=4874 npm start
```

**Config issues?**
```bash
# Clear stored config
rm ~/.strataumrc
```

**Check current auth**
```bash
node dist/client.js whoami
```

## 📖 More Info

See [README.md](./README.md) for detailed documentation.
