# Strataum Registry - Rewrite Complete ✅

Fresh, clean implementation in `g:/Strata/strataum/rewrite/`

## Quick Answer: How File Publishing Works

**Files are stored as UTF-8 strings in a JavaScript Map.**

```
Upload:   File bytes → Multer → String → Map storage
Download: Map storage → String → HTTP response → File
```

## The Complete Flow

### 1. Upload (Publish)
```bash
curl -X POST http://localhost:3000/publish \
  -H "Authorization: Bearer $TOKEN" \
  -F "tarball=@file.str" \
  -F "name=mylib" \
  -F "version=1.0.0"
```

**What happens:**
1. Multer intercepts multipart/form-data request
2. Extracts file bytes into `req.file.buffer`
3. Converts bytes to UTF-8 string: `"func add(a: int, b: int) => ..."`
4. Stores string in registry Map under "mylib@1.0.0"

**Code location:** [index.ts Line 288-323](file:///g:/Strata/strataum/rewrite/index.ts#L288-L323)

### 2. Download
```bash
curl http://localhost:3000/package/mylib/1.0.0 > mylib-downloaded.str
```

**What happens:**
1. Server looks up "mylib@1.0.0" in registry Map
2. Retrieves stored content string
3. Sends in HTTP response body
4. Client receives and saves to disk

**Code location:** [index.ts Line 353-363](file:///g:/Strata/strataum/rewrite/index.ts#L353-L363)

## Storage Structure

```typescript
registry.storage.packages = {
  "mylib": [
    {
      name: "mylib",
      version: "1.0.0",
      content: "func add(a: int, b: int) => int { ... }",  // ← FILE HERE
      author: "admin",
      description: "Math functions",
      main: "index.str",
      license: "MIT",
      keywords: ["math"],
      createdAt: "2026-01-12T..."
    }
  ]
}
```

**Key point:** Files are just strings in a JavaScript Map. No database, no disk I/O.

## Start & Test

```bash
cd g:/Strata/strataum/rewrite

# Install & build
npm install
npm run build

# Run
npm start
# or
npm run dev
```

Server runs on **http://localhost:3000**

## Test Immediately

```bash
# Health
curl http://localhost:3000/health

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Create file
echo 'func test() => int { return 42 }' > test.str

# Publish
curl -X POST http://localhost:3000/publish \
  -H "Authorization: Bearer $TOKEN" \
  -F "tarball=@test.str" \
  -F "name=test-lib" \
  -F "version=1.0.0"

# Download
curl http://localhost:3000/package/test-lib/1.0.0

# Search
curl "http://localhost:3000/search?q=test"
```

## What's Included

| File | Purpose |
|------|---------|
| index.ts | Main server (~330 lines) |
| index.js | Compiled (auto-generated) |
| package.json | Dependencies & scripts |
| tsconfig.json | TypeScript config |
| README.md | Documentation |
| QUICKSTART.txt | Quick reference |
| HOW_FILES_WORK.md | Detailed explanation |
| FILE_FLOW.txt | Visual flow diagram |
| FILE_STORAGE_DIAGRAM.txt | Memory visualization |

## Features

✅ User registration & login  
✅ Token authentication  
✅ Package publishing (file upload)  
✅ Package downloading (file streaming)  
✅ Full-text search  
✅ Package listing  
✅ CORS enabled  
✅ Error handling  
✅ Health checks  

## Endpoints

```
GET  /                  API info
GET  /health            Status check
POST /register          Create user
POST /login             Get token
POST /publish           Publish package
GET  /search?q=<q>      Search
GET  /packages          List all
GET  /package/<name>    Package info
GET  /package/<name>/<version>  Download
```

## Key Implementation Details

### Multer Setup (Line 207)
```typescript
const upload = multer({ storage: multer.memoryStorage() });
```
- Files stored in RAM (not disk)
- Available at `req.file.buffer`

### Conversion (Line 304)
```typescript
const content = req.file.buffer.toString("utf-8");
```
- Converts binary bytes to UTF-8 string
- String stored in Package object

### Storage (Package object)
```typescript
const result = registry.publish(
  name, version, description, main, license, keywords,
  content,  // ← File stored as string
  author
);
```

### Download (Line 353-363)
```typescript
app.get("/package/:name/:version", (req, res) => {
  const content = registry.downloadPackage(req.params.name, req.params.version);
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.name}.str"`);
  res.send(content);  // Send string as file
});
```

## Performance

| Operation | Time | Space |
|-----------|------|-------|
| Lookup | O(1) | O(1) |
| Upload | O(n) | O(n) |
| Download | O(n) | O(1) |

Where n = file size

## Code Statistics

- **Lines of code:** ~330
- **Files:** 1 (index.ts)
- **Classes:** 1 (StrataumRegistry)
- **Dependencies:** 2 (express, multer)
- **Complexity:** Low

## Default Credentials

```
Username: admin
Password: admin123
```

## Documentation References

**In this folder:**
- `README.md` - Full docs
- `HOW_FILES_WORK.md` - Detailed explanation
- `FILE_STORAGE_DIAGRAM.txt` - Visual flows

**In g:/Strata/:**
- `FILE_PUBLISHING_EXPLAINED.md` - Complete guide
- `HOW_FILE_PUBLISHING_WORKS.txt` - Quick answer

## Summary

✅ **Complete** - All features working  
✅ **Tested** - Basic functionality verified  
✅ **Documented** - Comprehensive guides  
✅ **Ready** - Run with `npm run dev`  

Fresh, clean, single-file implementation (~330 lines) with zero complexity.

**Go time:** `npm run dev` 🚀
