# Strataum Registry - Vanilla Implementation

Clean, simple package registry server for the Strata language.

## 🚀 Quick Start

```bash
cd g:/Strata/strataum/rewrite

# Install & build
npm install
npm run build

# Start server
npm start
```

Server runs on **http://localhost:3000** ✅

## 🧪 Test It

Open another terminal:

```bash
# Health check
curl http://localhost:3000/health

# Login (get token)
TOKEN=$(curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo $TOKEN

# Create test package
cat > test.str << 'EOF'
func add(a: int, b: int) => int {
  return a + b
}
EOF

# Publish
curl -X POST http://localhost:3000/publish \
  -H "Authorization: Bearer $TOKEN" \
  -F "tarball=@test.str" \
  -F "name=math" \
  -F "version=1.0.0" \
  -F "description=Math functions" \
  -F "main=index.str" \
  -F "license=MIT"

# Download
curl http://localhost:3000/package/math/1.0.0

# Search
curl "http://localhost:3000/search?q=math"

# List all
curl http://localhost:3000/packages
```

## 📊 Endpoints

```
GET  /                  API info
GET  /health            Health check
POST /register          Create user
POST /login             Authenticate
POST /publish           Publish package
GET  /search?q=<query>  Search
GET  /packages          List all
GET  /package/<name>    Package info
GET  /package/<name>/<version>  Download
```

## ✅ Features

- ✅ User registration & login
- ✅ Token authentication
- ✅ Package publishing (file upload)
- ✅ Package downloading (file streaming)
- ✅ Full-text search
- ✅ Package listing
- ✅ CORS enabled
- ✅ Error handling

## 🔐 Default Credentials

```
Username: admin
Password: admin123
```

## 📝 File Structure

```
rewrite/
├── index.ts           Main server (~330 lines)
├── index.js           Compiled (auto-generated)
├── package.json       Dependencies & scripts
├── tsconfig.json      TypeScript config
├── .gitignore         Ignore files
└── README.md          This file
```

## 💻 Code Size

- **~330 lines** of TypeScript
- **1 file** (index.ts)
- **Zero complexity** (single class, simple logic)

## 🔄 Development

```bash
# Build & run
npm run dev

# Just build
npm run build

# Just run
npm start
```

## ✨ What's Included

Single `index.ts` file with:
- StrataumRegistry class (user & package management)
- Express routes (HTTP API)
- Multer integration (file uploads)
- CORS headers
- Error handling

## 🎯 Use Cases

### 1. Local Testing
```bash
npm run dev
# Test registry locally
```

### 2. Development
```bash
# Edit index.ts
npm run dev  # Auto-rebuilds
```

### 3. Production
```bash
npm run build
npm start
```

## 📦 Dependencies

- **express** ^4.18.2 - HTTP server
- **multer** ^1.4.5 - File uploads
- **typescript** ^5.3.3 - Type safety

## 🆘 Troubleshooting

**Port 3000 in use?**
```bash
PORT=3001 npm start
```

**Build fails?**
```bash
rm *.js
npm run build
```

**Can't publish?**
```bash
# Make sure you have valid token from /login
# Use Authorization header: Bearer <token>
```

---

**Status**: ✅ Complete & working  
**Lines**: ~330  
**Files**: 1 (index.ts)  
**Ready**: Yes
