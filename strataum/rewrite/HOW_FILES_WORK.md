# How File Publishing & Downloading Works

## 📤 Publishing Files

### The Flow

```
Client sends multipart/form-data
    ↓
Multer middleware intercepts
    ↓
File stored in memory buffer (req.file.buffer)
    ↓
Buffer converted to UTF-8 string
    ↓
String stored in Package object
    ↓
Package stored in registry Map
    ↓
Success response
```

### Code: Publishing (Line 288-323)

```typescript
app.post("/publish", upload.single("tarball"), (req, res) => {
    // 1. Check authentication
    const token = req.headers.authorization?.replace("Bearer ", "");
    const author = registry.validateToken(token);
    
    // 2. Get metadata from form fields
    const { name, version, description, main, license, keywords } = req.body;
    
    // 3. KEY PART: Extract file content
    const content = req.file.buffer.toString("utf-8");
    //                    ^^^^^^              Convert bytes to string
    
    // 4. Store in registry
    const result = registry.publish(
        name, version, description, main, license, keywords,
        content,  // ← The actual file content stored here
        author
    );
});
```

### Multer Setup (Line 207)

```typescript
const upload = multer({ storage: multer.memoryStorage() });
```

**What this does:**
- `memoryStorage()` = stores uploaded files in RAM memory (not disk)
- Files available as `req.file.buffer` (Uint8Array of bytes)

### How to Use

```bash
# Create file
echo 'func add(a: int, b: int) => int { return a + b }' > math.str

# Publish
curl -X POST http://localhost:3000/publish \
  -H "Authorization: Bearer TOKEN" \
  -F "tarball=@math.str" \           # ← File upload
  -F "name=math" \                   # ← Metadata (form fields)
  -F "version=1.0.0" \
  -F "description=Math functions"
```

## 📥 Downloading Files

### The Flow

```
Client requests /package/<name>/<version>
    ↓
Server looks up package in registry Map
    ↓
Retrieves stored content string
    ↓
Sets HTTP headers (Content-Type, Content-Disposition)
    ↓
Sends content as response body
    ↓
Client receives file
```

### Code: Downloading (Line 353-363)

```typescript
app.get("/package/:name/:version", (req, res) => {
    // 1. Look up package
    const content = registry.downloadPackage(req.params.name, req.params.version);
    //                                       ↑
    //                     Queries registry Map
    
    if (!content) {
        return res.status(404).json({ error: "Not found" });
    }
    
    // 2. Set response headers
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.name}.str"`);
    
    // 3. Send file content
    res.send(content);
    //       ↑
    //  Sends the stored string as file
});
```

### How to Download

```bash
# Simple download
curl http://localhost:3000/package/math/1.0.0 > math-downloaded.str

# Browser download (auto-triggers download dialog)
curl http://localhost:3000/package/math/1.0.0 --output math-downloaded.str
```

## 🗄️ Storage Structure

### In Memory (Registry)

```typescript
class StrataumRegistry {
    storage: RegistryStorage = {
        packages: Map<string, Package[]>
        //  {
        //    "math": [
        //      {
        //        name: "math",
        //        version: "1.0.0",
        //        content: "func add(a: int, b: int) => int { ... }",
        //        ...
        //      }
        //    ]
        //  }
    }
}
```

**How it's organized:**
- Package name → Array of versions
- Each version has `content` field with file text
- All stored as strings in memory

### Example Data

```javascript
{
    "math": [
        {
            name: "math",
            version: "1.0.0",
            content: "func add(a: int, b: int) => int {\n  return a + b\n}",
            author: "admin",
            description: "Math functions",
            main: "index.str",
            license: "MIT",
            keywords: ["math", "util"],
            createdAt: "2026-01-12T..."
        }
    ]
}
```

## 🔄 Complete Example

### Step 1: Create File

```bash
cat > library.str << 'EOF'
func greet(name: string) => string {
  return "Hello, " + name
}

func goodbye(name: string) => string {
  return "Goodbye, " + name
}
EOF
```

### Step 2: Login

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo $TOKEN  # abc123...
```

### Step 3: Publish

```bash
curl -X POST http://localhost:3000/publish \
  -H "Authorization: Bearer $TOKEN" \
  -F "tarball=@library.str" \
  -F "name=greeting-lib" \
  -F "version=1.0.0" \
  -F "description=Greeting functions" \
  -F "main=library.str" \
  -F "license=MIT" \
  -F "keywords=greeting,strings"
```

**What happens:**
1. Multer receives file bytes from `library.str`
2. Converts to UTF-8 string
3. Registry stores in Map under "greeting-lib" → "1.0.0"
4. Server responds with 201 Created

### Step 4: Download

```bash
curl http://localhost:3000/package/greeting-lib/1.0.0 > greeting.str

cat greeting.str
# func greet(name: string) => string {
#   return "Hello, " + name
# }
# func goodbye(name: string) => string {
#   return "Goodbye, " + name
# }
```

**What happens:**
1. Server looks up "greeting-lib@1.0.0" in Map
2. Retrieves stored content string
3. Sends as HTTP response
4. Browser/curl saves to file

## 🎯 Key Points

### In-Memory Storage
- Files stored as **strings** in RAM
- NOT saved to disk
- Lost on server restart (design choice for testing)

### Multer's Role
```typescript
const upload = multer({ storage: multer.memoryStorage() });
                                     ↑
                     Keeps files in RAM, not disk
```

### File Content Path
```
Binary file bytes
    ↓ (Multer receives)
req.file.buffer (Uint8Array)
    ↓ (toString conversion)
"func add(...)" (UTF-8 string)
    ↓ (Stored in registry)
Package.content field
    ↓ (On download)
Sent back as HTTP response
```

### HTTP Headers (Download)

```
Content-Type: text/plain
    ↓
Browser knows it's text

Content-Disposition: attachment; filename="math.str"
    ↓
Browser downloads as file (not inline)
```

## 💾 Persistence Options

### Current (Memory-Only)
```typescript
memoryStorage()  // RAM only
```

**Pros:** Fast, simple, perfect for testing
**Cons:** Lost on restart

### Future (Disk-Based)
```typescript
// Could save to disk:
fs.writeFileSync(`./packages/${name}/${version}.str`, content);

// Or database:
db.packages.insert({ name, version, content });
```

## 🧪 Test: Verify Files Match

```bash
# Original
cat library.str

# Published
curl -X POST http://localhost:3000/publish \
  -H "Authorization: Bearer $TOKEN" \
  -F "tarball=@library.str" \
  -F "name=test" \
  -F "version=1.0.0"

# Downloaded
curl http://localhost:3000/package/test/1.0.0 > test-downloaded.str

# Compare (should be identical)
diff library.str test-downloaded.str
# (no output = files are identical ✓)
```

## ✅ Summary

| Operation | Mechanism | Storage |
|-----------|-----------|---------|
| Upload | Multer → buffer → string | Registry Map |
| Store | Package object with content field | In-memory Map |
| Download | Query Map → get content → HTTP response | Retrieved from Map |
| Persistence | In-memory only (lost on restart) | RAM |

---

**Files are stored as UTF-8 strings in an in-memory Map structure. Simple, fast, perfect for testing!** 🚀
