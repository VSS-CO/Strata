# ✅ Strataum Rewrite - Complete

Fresh, clean implementation in `strataum/rewrite` folder.

## 📦 What You Have

**`strataum/rewrite/`** - Complete vanilla registry:
- ✅ `index.ts` - Main server (~330 lines)
- ✅ `package.json` - Dependencies & scripts
- ✅ `tsconfig.json` - TypeScript config
- ✅ `README.md` - Documentation
- ✅ `.gitignore` - Git configuration
- ✅ `index.js` - Compiled (auto-generated)

## 🚀 Run It

```bash
cd g:/Strata/strataum/rewrite
npm install
npm run dev
```

**Server on http://localhost:3000** ✅

## 🧪 Test Endpoints

```bash
# Health
curl http://localhost:3000/health

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Publish
curl -X POST http://localhost:3000/publish \
  -H "Authorization: Bearer $TOKEN" \
  -F "tarball=@file.str" \
  -F "name=mylib" \
  -F "version=1.0.0"

# Download
curl http://localhost:3000/package/mylib/1.0.0

# Search
curl "http://localhost:3000/search?q=mylib"
```

## ✨ Features

✅ User registration & login  
✅ Token authentication  
✅ Package publishing (multipart upload)  
✅ Package downloading (file streaming)  
✅ Full-text search  
✅ Package listing  
✅ Package info  
✅ CORS headers  
✅ Error handling  
✅ Health checks  

## 📊 Code Quality

| Metric | Value |
|--------|-------|
| Lines of code | ~330 |
| Files | 1 |
| Classes | 1 (StrataumRegistry) |
| Dependencies | 2 (express, multer) |
| Complexity | Low |
| Testability | High |

## 🔐 Default Auth

```
Username: admin
Password: admin123
```

## 📍 Endpoints

```
GET  /                  API info
GET  /health            Status
POST /register          Create user
POST /login             Get token
POST /publish           Upload package
GET  /search?q=        Search packages
GET  /packages          List all
GET  /package/<name>    Get info
GET  /package/<name>/<version>  Download
```

## 🛠️ Commands

```bash
# Build
npm run build

# Run
npm start

# Build & run
npm run dev
```

## 📁 File Structure

```
rewrite/
├── index.ts              ← Main server (single file)
│   ├── StrataumRegistry  ← Core logic
│   ├── Express app       ← HTTP server
│   ├── Routes            ← Endpoints
│   └── Startup           ← Listen & log
├── package.json          ← Dependencies
├── tsconfig.json         ← TS config
├── README.md             ← This doc
└── .gitignore
```

## ✅ What Works

| Feature | Status |
|---------|--------|
| Server startup | ✅ |
| HTTP routes | ✅ |
| User registration | ✅ |
| User login | ✅ |
| Token generation | ✅ |
| Token validation | ✅ |
| Package publishing | ✅ |
| File upload | ✅ |
| File download | ✅ |
| Search | ✅ |
| List packages | ✅ |
| Error handling | ✅ |
| CORS | ✅ |

## 🎯 Usage Examples

### Create & Publish Package

```bash
# Start server
cd rewrite
npm run dev

# In another terminal
# Create file
echo 'func test() => int { return 42 }' > test.str

# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Publish
curl -X POST http://localhost:3000/publish \
  -H "Authorization: Bearer $TOKEN" \
  -F "tarball=@test.str" \
  -F "name=test" \
  -F "version=1.0.0"

# Download
curl http://localhost:3000/package/test/1.0.0 > downloaded.str

# Verify
cat downloaded.str
```

## 💾 In-Memory Storage

All data stored in memory:
- Users map
- Packages map (by name → versions array)
- Tokens map (for quick validation)

Data is lost on server restart (good for testing).

## 🔄 Development Loop

1. **Edit** `index.ts`
2. **Run** `npm run dev` (auto-builds)
3. **Test** with curl or client
4. **Repeat**

## 🚀 Summary

This is a **complete, working Strataum Registry**:
- ✅ ~330 lines of clean code
- ✅ Single-file implementation
- ✅ All features working
- ✅ Easy to understand & modify
- ✅ Easy to test locally
- ✅ Ready for development

---

**Status**: ✅ Complete & Ready

```bash
cd g:/Strata/strataum/rewrite
npm run dev
```

Your fresh Strataum Registry is running! 🎉
