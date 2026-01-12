# Strataum on Google Cloud Functions - Complete Guide

Deploy the complete Strataum Registry to Google Cloud Functions as a single, production-ready function.

## ✅ Single File Entry Point

All functionality consolidated in `index.ts` (compiles to `dist/index.js`):
- ✅ Registry logic
- ✅ Express app with all routes
- ✅ User authentication
- ✅ Package upload/download
- ✅ State management
- ✅ Google Cloud Functions integration

## 🚀 Quick Deploy (2 Steps)

### Step 1: Build
```bash
cd strataum
npm install
npm run build
```

### Step 2: Deploy
```bash
gcloud functions deploy strataum \
  --runtime nodejs18 \
  --entry-point strataum \
  --source . \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --memory 512MB
```

That's it! Your registry is now live. 🎉

## 📍 Get Your Function URL

```bash
gcloud functions describe strataum --region us-central1
```

Look for `httpsTrigger.url`. Example:
```
https://us-central1-PROJECT_ID.cloudfunctions.net/strataum
```

## 🧪 Test It

### Health Check
```bash
curl https://us-central1-PROJECT_ID.cloudfunctions.net/strataum/health

# Response:
# {"status":"ok","message":"Strataum Registry is running"}
```

### Get Info
```bash
curl https://us-central1-PROJECT_ID.cloudfunctions.net/strataum

# Response shows all available endpoints
```

## 💻 Use From Client

### Configure
```bash
REGISTRY_URL="https://us-central1-PROJECT_ID.cloudfunctions.net/strataum"
strataum set-registry $REGISTRY_URL
```

### Login
```bash
strataum login admin admin123
```

### Publish
```bash
strataum publish package.json
```

### Download
```bash
strataum download my-package 1.0.0
```

### Search
```bash
strataum search util
```

## 📊 API Endpoints

All endpoints available at your function URL:

```
POST /api/register
{
  "username": "user",
  "email": "user@example.com",
  "password": "password123"
}
→ 201: { "token": "...", "user": {...} }

POST /api/login
{
  "username": "user",
  "password": "password123"
}
→ 200: { "token": "..." }

POST /api/publish (multipart/form-data)
Authorization: Bearer <token>
{
  "name": "pkg",
  "version": "1.0.0",
  "description": "...",
  "main": "index.str",
  "license": "MIT",
  "keywords": ["tag1", "tag2"],
  "tarball": <file>
}
→ 201: { "success": true }

GET /api/search?q=<query>
→ 200: { "results": [...], "total": N }

GET /api/packages
→ 200: { "packages": [...] }

GET /api/package/<name>
→ 200: { "name": "...", "versions": [...] }

GET /api/package/<name>/<version>
→ 200: <binary file content>

GET /api/export (Bearer token)
→ 200: <JSON state backup>

POST /api/import (Bearer token)
Body: JSON state
→ 200: { "success": true }
```

## ⚙️ Configuration Options

### Memory
```bash
gcloud functions deploy strataum \
  --memory 256MB         # Minimum
  --memory 512MB         # Recommended
  --memory 2GB           # For high traffic
```

### Timeout
```bash
gcloud functions deploy strataum \
  --timeout 30s          # Quick operations
  --timeout 60s          # Recommended
  --timeout 300s         # Large file uploads
```

### Concurrency
```bash
gcloud functions deploy strataum \
  --max-instances 100    # Default
  --max-instances 1000   # High traffic
```

### Region
```bash
# US
--region us-central1     # Iowa
--region us-east1        # South Carolina
--region us-west1        # Oregon

# EU
--region europe-west1    # Belgium
--region europe-west4    # Netherlands

# Asia
--region asia-northeast1 # Tokyo
--region asia-southeast1 # Singapore
```

## 🔐 Security

### Require Authentication
```bash
gcloud functions deploy strataum \
  --no-allow-unauthenticated

# Then use:
gcloud functions call strataum --region us-central1
```

### Set Environment Variables
```bash
gcloud functions deploy strataum \
  --set-env-vars REGISTRY_STATE='{"users":[],"packages":[]}'
```

### Add IAM Policies
```bash
# Allow specific service account
gcloud functions add-iam-policy-binding strataum \
  --member=serviceAccount:sa@project.iam.gserviceaccount.com \
  --role=roles/cloudfunctions.invoker
```

## 💾 State Persistence

### Option 1: Environment Variable (Limited)
State stored in env var (~32KB limit):

```bash
gcloud functions deploy strataum \
  --set-env-vars REGISTRY_STATE='...'
```

Works but limited. Good for testing.

### Option 2: Cloud Firestore (Recommended)

1. **Enable Firestore:**
```bash
gcloud firestore databases create --location=us-central1
```

2. **Update index.ts:** (add to getRegistry function)
```typescript
import { Firestore } from '@google-cloud/firestore';

const db = new Firestore();

// In getRegistry():
const doc = await db.collection('registry').doc('state').get();
if (doc.exists) {
    registry = StrataumRegistry.fromJSON(doc.data());
}

// After mutations, save:
await db.collection('registry').doc('state').set(registry.toJSON());
```

3. **Rebuild and redeploy:**
```bash
npm run build
gcloud functions deploy strataum --source .
```

### Option 3: Cloud Storage (Large Files)

```typescript
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('my-registry-bucket');

// Load
const [data] = await bucket.file('state.json').download();
const state = JSON.parse(data.toString());

// Save
await bucket.file('state.json').save(registry.toJSON());
```

## 📈 Monitoring

### View Logs
```bash
gcloud functions logs read strataum \
  --region us-central1 \
  --limit 50 \
  --follow
```

### Real-time Stream
```bash
gcloud functions logs read strataum \
  --region us-central1 \
  --follow
```

### Error Logs Only
```bash
gcloud functions logs read strataum \
  --region us-central1 \
  --limit 100 \
  | grep -i error
```

### Cloud Monitoring Dashboard
Open https://console.cloud.google.com/monitoring/dashboards

Metrics to monitor:
- Execution count (invocations)
- Execution time
- Memory usage
- Error count
- Queue depth

## 💰 Pricing

### Free Tier (Monthly)
- 2,000,000 invocations
- 400,000 GB-seconds compute
- 5 GB outbound data

### Pricing Beyond Free
| Component | Cost |
|-----------|------|
| Invocations | $0.40 per million |
| Compute | $0.00001667 per GB-second |
| Outbound Data | $0.12 per GB |

### Example Costs
**100K invocations/month:**
```
Invocations: 100,000 × $0.40/M = $0.04
Compute: 100 GB-seconds × $0.00001667 = $0.001
Total: ~$0.05/month
```

**1M invocations/month:**
```
Invocations: 1,000,000 × $0.40/M = $0.40
Compute: 1000 GB-seconds × $0.00001667 = $0.017
Total: ~$0.42/month
```

## 🔄 Update Function

After making changes:

```bash
# Rebuild
npm run build

# Redeploy
gcloud functions deploy strataum \
  --region us-central1
```

## 🗑️ Delete Function

```bash
gcloud functions delete strataum --region us-central1
```

## 🧪 Local Testing

### With Functions Framework
```bash
npx functions-framework \
  --target=strataum \
  --port=3000

# In another terminal
curl http://localhost:3000/health
```

### Full Test Cycle
```bash
# 1. Start local server
npx functions-framework --target=strataum --port=3000 &

# 2. Register user
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# 3. Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 4. Publish
curl -X POST http://localhost:3000/api/publish \
  -H "Authorization: Bearer TOKEN" \
  -F "tarball=@file.str" \
  -F "name=mylib" \
  -F "version=1.0.0"

# 5. Download
curl http://localhost:3000/api/package/mylib/1.0.0
```

## 🚨 Troubleshooting

### Function won't deploy
```bash
# Check TypeScript compilation
npm run build

# Check syntax in dist/index.js
head dist/index.js

# Check for missing dependencies
npm list
```

### Package upload fails (413 Payload Too Large)
```bash
# Increase timeout and memory
gcloud functions deploy strataum \
  --timeout 120s \
  --memory 2GB
```

### Can't download packages
```bash
# Check logs
gcloud functions logs read strataum --limit 100

# Test endpoint directly
curl https://.../strataum/api/packages
```

### Cold starts too slow
```bash
# Use min instances to keep warm
gcloud functions deploy strataum \
  --min-instances 1
```

### State not persisting
```bash
# Check REGISTRY_STATE env var
gcloud functions describe strataum

# Or setup Firestore (see State Persistence above)
```

## 📚 File Structure

```
strataum/
├── index.ts              # Main entry point (all-in-one)
├── client.ts             # CLI client
├── server.ts             # Legacy (can remove)
├── gcf.ts                # Legacy (can remove)
├── package.json          # Updated to use index.js
├── tsconfig.json
├── dist/
│   ├── index.js          # ← Deployed to GCF
│   ├── client.js
│   └── ...
└── docs/
    ├── README.md
    ├── GCF_DEPLOY.md     # This file
    └── ...
```

## ✅ What's Included

Single `index.ts` file with:
- ✅ Complete StrataumRegistry class
- ✅ All registry methods (register, login, publish, search, download)
- ✅ Full Express app with routes
- ✅ Multer for file uploads
- ✅ State persistence support
- ✅ Google Cloud Functions integration
- ✅ CORS enabled
- ✅ Error handling
- ✅ Token validation

## 🎯 Full Deployment Workflow

```bash
# 1. Prepare
cd strataum
npm install
npm run build

# 2. Deploy to GCF
gcloud functions deploy strataum \
  --runtime nodejs18 \
  --entry-point strataum \
  --source . \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --memory 512MB

# 3. Get URL
REGISTRY_URL=$(gcloud functions describe strataum \
  --region us-central1 \
  --format='value(httpsTrigger.url)')
echo $REGISTRY_URL

# 4. Test
curl $REGISTRY_URL/health

# 5. Configure client
strataum set-registry $REGISTRY_URL

# 6. Use
strataum login admin admin123
strataum publish package.json
strataum search util
strataum download my-package
```

## 🔗 Resources

- [Google Cloud Functions Docs](https://cloud.google.com/functions/docs)
- [Functions Framework](https://github.com/GoogleCloudPlatform/functions-framework-nodejs)
- [Node.js Runtime](https://cloud.google.com/functions/docs/runtime/nodejs)
- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Cloud Console](https://console.cloud.google.com)

---

## 🎉 You're Ready!

```bash
gcloud functions deploy strataum \
  --runtime nodejs18 \
  --entry-point strataum \
  --source strataum/ \
  --trigger-http \
  --allow-unauthenticated
```

Your Strataum Registry is now running serverlessly on Google Cloud Functions! 🚀
