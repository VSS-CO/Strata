# Strataum With Real Downloads - Demo

## ✅ What's New

The Strataum registry now uses **Express** and **real file downloads** instead of mocks.

### Changes:
- ✅ Converted HTTP server to **Express.js**
- ✅ Added **multer** for file uploads
- ✅ Real **package file uploads** (no more base64)
- ✅ Real **package downloads** (streaming files)
- ✅ New `download` command in client
- ✅ Cleaner route handling with Express

## 🚀 Quick Demo

### 1. Start Registry Server

```bash
cd strataum
npm install    # Installs express & multer
npm run build
npm start

# 🚀 Strataum Registry running on http://localhost:4873
# 📦 Web UI: http://localhost:4873
# 🔐 Default credentials: admin / admin123
```

### 2. Create a Package (Terminal 2)

```bash
mkdir demo-package
cd demo-package

# Create Strata code
cat > math.str << 'EOF'
func add(a: int, b: int) => int {
  return a + b
}

func sub(a: int, b: int) => int {
  return a - b
}

func mul(a: int, b: int) => int {
  return a * b
}
EOF

# Create package manifest
cat > package.json << 'EOF'
{
  "name": "demo-math",
  "version": "1.0.0",
  "description": "Demo math library",
  "main": "math.str",
  "license": "MIT",
  "keywords": ["math", "demo"]
}
EOF
```

### 3. Login & Publish

```bash
# Login
node ../dist/client.js login admin admin123
# ✓ Login successful!

# Publish
node ../dist/client.js publish package.json
# ✓ Published demo-math@1.0.0
# ✓ Available at: http://localhost:4873/api/package/demo-math/1.0.0
```

### 4. Download Package (Terminal 3)

```bash
mkdir my-app
cd my-app

# Download from registry
node ../../dist/client.js download demo-math 1.0.0 .
# ⬇️  Downloading demo-math@1.0.0...
# ✓ Downloaded demo-math@1.0.0
# ✓ Saved to ./demo-math.str
```

### 5. Verify Downloaded File

```bash
cat demo-math.str
# func add(a: int, b: int) => int {
#   return a + b
# }
# ...
```

## 📊 How It Works

### Publishing Flow (Express)

```
Client uploads math.str
       ↓
POST /api/publish (multipart/form-data)
       ↓
Multer parses upload
       ↓
Buffer stored in memory as `content`
       ↓
Package object created with actual file content
       ↓
Stored in packages Map
       ↓
Response: 201 Created
```

### Download Flow (Streaming)

```
Client requests download
       ↓
GET /api/package/demo-math/1.0.0
       ↓
Server finds package by name & version
       ↓
Streams file content from memory
       ↓
Client receives binary stream
       ↓
Written to disk
       ↓
File saved locally
```

## 🔄 Before vs After

### Before (Mocks)
```bash
strataum add http-client
# Creates fake .str file locally
# No actual download
```

### After (Real)
```bash
strataum publish package.json
# Uploads ACTUAL file to registry

strataum download demo-math
# DOWNLOADS actual file from registry
# Saves to disk
```

## 📁 File Structure Changes

### Server (server.ts)
```typescript
// Before: base64-encoded content
tarball: string  // "SGVsbG8gV29ybGQ="

// After: raw file content
content: string  // "func add(a: int, b: int) => int { ... }"
```

### Routes
```typescript
// Before: custom HTTP
const server = http.createServer(...)

// After: Express routing
app.post("/api/publish", upload.single("tarball"), handler)
app.get("/api/package/:name/:version", handler)
```

### Upload Handling
```typescript
// Before: base64 encoding
const tarballBase64 = Buffer.from(tarball).toString("base64");

// After: real multipart upload via multer
this.upload.single("tarball")  // File in req.file.buffer
```

## 💻 New Commands

### Download Command
```bash
strataum download <package> [version] [targetDir]

# Examples:
strataum download demo-math
# Downloads demo-math@latest to current dir

strataum download demo-math 1.0.0
# Downloads specific version

strataum download demo-math 1.0.0 ./vendor
# Download to specific directory
```

## 🌐 API Changes

### Publish Endpoint

**Before:**
```
POST /api/publish
Content-Type: application/json
{
  "name": "pkg",
  "tarball": "SGVs..."  // base64
}
```

**After:**
```
POST /api/publish
Content-Type: multipart/form-data
[multipart body with actual file]

Form Fields:
- name, version, description, main, license, keywords
- tarball: [actual file content]
```

### Download Endpoint

**New endpoint for actual downloads:**
```
GET /api/package/:name/:version
→ Returns binary file stream
```

## 🛠️ Technical Details

### Express Setup
```typescript
const app = express();
app.use(express.json());
app.post("/api/publish", upload.single("tarball"), handler);
```

### File Upload with Multer
```typescript
const upload = multer({ storage: multer.memoryStorage() });

// In handler:
const fileContent = req.file.buffer.toString("utf-8");
```

### Streaming Download
```typescript
res.setHeader("Content-Disposition", 
  `attachment; filename="${pkg.name}.str"`);
res.send(pkg.content);
```

## ✅ Verification Steps

1. **Upload Works:**
   - ✓ File uploaded via POST
   - ✓ Content stored in registry
   - ✓ 201 response received

2. **Download Works:**
   - ✓ File retrieved from registry
   - ✓ Content streamed to client
   - ✓ File written to disk
   - ✓ Content matches original

3. **End-to-End:**
   - ✓ Create local file
   - ✓ Upload to registry
   - ✓ Download from registry
   - ✓ Compare original and downloaded files

## 🐛 Testing

### Manual Test
```bash
# 1. Create test file
echo "func test() => int { return 42 }" > test.str

# 2. Create package.json
echo '{"name":"test","version":"1.0.0","main":"test.str"}' > package.json

# 3. Publish
node dist/client.js publish package.json

# 4. Download
node dist/client.js download test

# 5. Verify
cat test.str
```

### Automated Test Script
```bash
#!/bin/bash
set -e

# Create test package
mkdir -p test-pkg
cat > test-pkg/hello.str << 'EOF'
func greet(name: string) => string {
  return "Hello, " + name
}
EOF

cat > test-pkg/package.json << 'EOF'
{
  "name": "test-hello",
  "version": "1.0.0",
  "main": "hello.str"
}
EOF

# Publish
node dist/client.js publish test-pkg/package.json

# Download
mkdir -p test-download
node dist/client.js download test-hello 1.0.0 test-download

# Verify
if cmp -s test-pkg/hello.str test-download/test-hello.str; then
  echo "✓ Files match!"
else
  echo "✗ Files don't match!"
  exit 1
fi
```

## 📦 Package Format

### What Gets Stored
```
Name: demo-math
Version: 1.0.0
Author: admin
Content: [Raw file bytes]
  func add(a: int, b: int) => int {
    return a + b
  }
  func sub(a: int, b: int) => int {
    return a - b
  }
  ...
```

### What Gets Downloaded
```
File: demo-math.str
Content: [Exact copy of uploaded file]
  func add(a: int, b: int) => int {
    return a + b
  }
  ...
```

## 🚀 Next Steps

Now that packages are **actually downloading**, you can:

1. **Integrate with Package Manager:**
   - `strataum install` can now download real packages
   - Extract to `.strata/packages/`

2. **Add Dependency Resolution:**
   - Parse package imports
   - Recursively download dependencies

3. **Cache Management:**
   - Store in `.strata/cache/`
   - Verify package hashes

4. **Version Resolution:**
   - Support version ranges
   - Select best matching version

---

**Status**: ✅ Real downloads working!

Try it: `node dist/client.js download <package>`
