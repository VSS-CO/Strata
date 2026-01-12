# Strataum Usage Guide

## 📦 Strata Local Package Manager (CLI)

The local package manager is built into the Strata compiler for managing project dependencies locally.

### Commands

#### 1. Initialize a Project
```bash
node dist/index.js init my-app 1.0.0
# Creates:
#   - Strataumfile (manifest)
#   - Strataumfile.lock (lock file)
```

#### 2. Add a Package
```bash
node dist/index.js add http-client 2.1.0
# Updates Strataumfile
# Installs to .strata/packages/http-client/
# Updates Strataumfile.lock
```

#### 3. List Packages
```bash
node dist/index.js list
# Output:
# Installed Packages:
# ==================
# ✓ http-client@2.1.0
# ✓ json-parser@1.5.2
```

#### 4. Remove a Package
```bash
node dist/index.js remove http-client
# Updates Strataumfile
# Removes from .strata/packages/
# Updates Strataumfile.lock
```

#### 5. Install Packages
```bash
# Install all from Strataumfile
node dist/index.js install

# Install specific package
node dist/index.js install json-parser
```

#### 6. Project Info
```bash
node dist/index.js info
# Output:
# Project Information:
# ====================
# Name: my-app
# Version: 1.0.0
# Registry: https://registry.stratauim.io
# Dependencies: 2
```

---

## 🌐 Strataum Registry Server

The registry server provides package publishing, search, and discovery capabilities (like npm).

### Setup

```bash
cd strataum
npm install
npm run build
npm start
```

**Server starts on**: `http://localhost:4873`

**Web UI**: Open browser to `http://localhost:4873`

**Default credentials**:
- Username: `admin`
- Password: `admin123`

---

## 🔐 Registry Authentication

### Register New User
```bash
node dist/client.js register alice alice@example.com password123
# ✓ Registration successful!
# ✓ Token saved to ~/.strataumrc
# Welcome, alice!
```

### Login
```bash
node dist/client.js login alice password123
# ✓ Login successful!
# ✓ Token saved to ~/.strataumrc
# Welcome back, alice!
```

### Logout
```bash
node dist/client.js logout
# ✓ Logged out successfully
```

### Check Current User
```bash
node dist/client.js whoami
# alice
```

---

## 📤 Publishing Packages

### Step 1: Create Package Directory
```bash
mkdir my-math-lib
cd my-math-lib
```

### Step 2: Create Strata Code
```bash
cat > index.str << 'EOF'
func add(a: int, b: int) => int {
  return a + b
}

func multiply(a: int, b: int) => int {
  return a * b
}

func factorial(n: int) => int {
  if n <= 1 {
    return 1
  }
  return n * factorial(n - 1)
}
EOF
```

### Step 3: Create Package Manifest
```bash
cat > package.json << 'EOF'
{
  "name": "math-lib",
  "version": "1.0.0",
  "description": "Mathematical functions library",
  "main": "index.str",
  "license": "MIT",
  "keywords": ["math", "library", "functions"],
  "author": "alice"
}
EOF
```

### Step 4: Publish
```bash
node ../dist/client.js publish package.json
# ✓ Published math-lib@1.0.0
# ✓ Available at: http://localhost:4873/api/package/math-lib@1.0.0
```

---

## 🔍 Searching & Discovering Packages

### Search by Name
```bash
node dist/client.js search math
# Found 1 package(s):
#
# 📦 math-lib@1.0.0
#    Mathematical functions library
#    Author: alice
```

### Get Package Info
```bash
node dist/client.js info math-lib
# 📦 math-lib
#
# Versions:
#   1.0.0 - Mathematical functions library
#     Published by alice on 1/12/2026
```

### Browse All Packages
Visit web UI: `http://localhost:4873`
- See dashboard statistics
- Browse all published packages
- Search by keywords

---

## 💻 Using Packages in Projects

### Step 1: Create Project
```bash
mkdir my-app
cd my-app
node ../dist/index.js init my-app
```

### Step 2: Add Dependency
```bash
node ../dist/index.js add math-lib
# ✓ Updated Strataumfile
# ✓ Installed math-lib@1.0.0
# ✓ Locked dependencies in Strataumfile.lock
```

### Step 3: Use in Code
```bash
cat > main.str << 'EOF'
import math from math-lib::index

func main() => void {
  let sum: int = math.add(5, 3)
  let product: int = math.multiply(4, 7)
  let fact: int = math.factorial(5)
  
  io.print(sum)        // 8
  io.print(product)    // 28
  io.print(fact)       // 120
}

main()
EOF
```

### Step 4: Run
```bash
# Once Strata compiler supports module imports:
strata main.str
```

---

## 📊 Strataumfile Structure

### Strataumfile (Manifest)
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "registry": "http://localhost:4873",
  "dependencies": {
    "math-lib": "1.0.0",
    "http-client": "2.1.0",
    "json-parser": "1.5.2"
  }
}
```

### Strataumfile.lock (Lock File)
```json
{
  "locked": true,
  "version": "1.0",
  "timestamp": "2026-01-12T12:34:56.789Z",
  "packages": {
    "math-lib": {
      "version": "1.0.0",
      "installed": true,
      "timestamp": "2026-01-12T12:34:56.789Z"
    },
    "http-client": {
      "version": "2.1.0",
      "installed": true,
      "timestamp": "2026-01-12T12:34:56.789Z"
    },
    "json-parser": {
      "version": "1.5.2",
      "installed": true,
      "timestamp": "2026-01-12T12:34:56.789Z"
    }
  }
}
```

---

## 🌐 Web UI Guide

### Access the Web UI
```
http://localhost:4873
```

### Features

#### 1. Dashboard
- Total packages count
- Total versions count
- Total users count

#### 2. Register
- Create new account
- Set username, email, password
- Get auth token

#### 3. Login
- Authenticate with credentials
- Token saved to localStorage
- Session management

#### 4. Search
- Search packages by name
- View search results
- See package descriptions

#### 5. Package Browser
- View all published packages
- See latest version
- View author information
- Real-time updates

---

## 🔧 Configuration

### Registry Configuration
The Strata package manager automatically creates a registry config in `Strataumfile`.

Default registry: `https://registry.stratauim.io`

Change registry:
```bash
node dist/client.js set-registry http://custom-registry:4873
```

### Client Config File
Location: `~/.strataumrc` (user home directory)

```json
{
  "registry": "http://localhost:4873",
  "username": "alice",
  "token": "abc123xyz..."
}
```

---

## 🚀 Advanced Usage

### Publishing Multiple Versions
```bash
# Version 1.0.0
cat > package.json << 'EOF'
{"name":"math-lib","version":"1.0.0",...}
EOF
node dist/client.js publish package.json

# Version 1.1.0 with new features
cat > package.json << 'EOF'
{"name":"math-lib","version":"1.1.0",...}
EOF
# Update index.str with new functions
node dist/client.js publish package.json

# Version 2.0.0 with breaking changes
cat > package.json << 'EOF'
{"name":"math-lib","version":"2.0.0",...}
EOF
# Update index.str with new API
node dist/client.js publish package.json
```

### Dependency Management
```bash
# List current dependencies
cat Strataumfile

# Update dependency version
# Edit Strataumfile manually or use:
node dist/index.js remove old-lib
node dist/index.js add old-lib 2.0.0

# Install everything from Strataumfile
node dist/index.js install

# Lock for reproducibility
cat Strataumfile.lock
```

### Private Registry
```bash
# Run your own registry instance
PORT=5000 npm start

# Configure client to use it
node dist/client.js set-registry http://your-server:5000

# All operations now use your registry
node dist/client.js login ...
node dist/client.js publish ...
```

---

## 📚 Examples

### Example 1: Simple Utility Library
```bash
# Create
mkdir string-utils
cd string-utils
cat > index.str << 'EOF'
func uppercase(s: string) => string {
  return s.toUpperCase()
}

func reverse(s: string) => string {
  let result: string = ""
  let i: int = s.length - 1
  while i >= 0 {
    result = result + s.charAt(i)
    i = i - 1
  }
  return result
}
EOF

# Package
cat > package.json << 'EOF'
{
  "name": "string-utils",
  "version": "1.0.0",
  "description": "String utilities",
  "main": "index.str",
  "license": "MIT",
  "keywords": ["string", "utility"]
}
EOF

# Publish
strataum login admin admin123
strataum publish package.json
```

### Example 2: Use Multiple Packages
```bash
# Create project
strataum init web-app

# Add dependencies
strataum add http-client 2.0.0
strataum add json-parser 1.5.0
strataum add string-utils 1.0.0

# Check what's installed
strataum list

# Code
cat > app.str << 'EOF'
import http from http-client::index
import json from json-parser::index
import str from string-utils::index

func main() => void {
  let response: string = http.get("https://api.example.com/data")
  let data: any = json.parse(response)
  let formatted: string = str.uppercase(data.name)
  io.print(formatted)
}

main()
EOF
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port
PORT=4874 npm start

# Or kill existing process
lsof -i :4873
kill <PID>
```

### Authentication Issues
```bash
# Clear stored credentials
rm ~/.strataumrc

# Login again
node dist/client.js login username password

# Check current user
node dist/client.js whoami
```

### Package Not Found
```bash
# Search to verify existence
node dist/client.js search package-name

# Check registry URL
cat ~/.strataumrc

# Change if needed
node dist/client.js set-registry http://correct-registry:4873
```

### Strataumfile Issues
```bash
# Validate JSON
cat Strataumfile

# Recreate if needed
node dist/index.js init my-app

# Reinstall packages
node dist/index.js install

# Verify lock file
cat Strataumfile.lock
```

---

## 📖 More Information

- [README.md](strataum/README.md) - Full API documentation
- [QUICKSTART.md](strataum/QUICKSTART.md) - 5-minute quick start
- [ARCHITECTURE.md](strataum/ARCHITECTURE.md) - System design
- [INTEGRATION.md](strataum/INTEGRATION.md) - Integration guide
- [STRATAUM_SUMMARY.md](STRATAUM_SUMMARY.md) - Complete overview

---

**Happy packaging! 📦**
