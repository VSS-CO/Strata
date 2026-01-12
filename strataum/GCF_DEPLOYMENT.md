# Strataum on Google Cloud Functions

Deploy the Strataum Registry to Google Cloud Functions (serverless).

## 📋 Prerequisites

1. **Google Cloud Project**: Create at https://console.cloud.google.com
2. **gcloud CLI**: Install from https://cloud.google.com/sdk/docs/install
3. **Authentication**: `gcloud auth login`
4. **Set Project**: `gcloud config set project YOUR_PROJECT_ID`

## 🚀 Quick Deploy

### 1. Build TypeScript

```bash
cd strataum
npm install
npm run build
```

### 2. Deploy to Google Cloud Functions

```bash
gcloud functions deploy strataum \
  --runtime nodejs18 \
  --entry-point strataum \
  --source . \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --timeout 60s \
  --memory 512MB
```

### 3. Get Function URL

```bash
gcloud functions describe strataum --region us-central1
```

Output will include the trigger URL:
```
httpsTrigger:
  url: https://us-central1-PROJECT_ID.cloudfunctions.net/strataum
```

### 4. Test the Function

```bash
# Health check
curl https://us-central1-PROJECT_ID.cloudfunctions.net/strataum/health

# Should return:
# {"status":"ok","message":"Strataum Registry is running"}
```

## 📝 Configuration

### Memory & Timeout

```bash
gcloud functions deploy strataum \
  --memory 512MB \           # 128MB to 8GB
  --timeout 60s \            # 1s to 540s
  --region us-central1
```

### Environment Variables

For state persistence, set environment variable:

```bash
gcloud functions deploy strataum \
  --set-env-vars REGISTRY_STATE='{"users":[],"packages":[]}' \
  --region us-central1
```

Or use Firestore/Cloud Storage for persistence (see below).

### Regions

Deploy to nearest region for lower latency:

```bash
# US regions
--region us-central1
--region us-east1
--region us-west1

# EU regions
--region europe-west1
--region europe-west4

# Asia regions
--region asia-northeast1
--region asia-southeast1
```

## 💾 State Persistence

### Option 1: Environment Variable (Simple)
```bash
gcloud functions deploy strataum \
  --set-env-vars REGISTRY_STATE='...' \
  --region us-central1
```

**Pros**: Simple, no infrastructure  
**Cons**: Limited to ~32KB, not real-time

### Option 2: Cloud Firestore (Recommended)

**Setup:**
```bash
# Enable Firestore
gcloud firestore databases create --location=us-central1

# Install Firestore SDK
npm install @google-cloud/firestore
```

**Code change (in server.ts):**
```typescript
import { Firestore } from '@google-cloud/firestore';

const db = new Firestore();

// Save state
await db.collection('registry').doc('state').set(registry.toJSON());

// Load state
const doc = await db.collection('registry').doc('state').get();
const state = doc.data();
registry = StrataumRegistry.fromJSON(state);
```

**Deploy:**
```bash
gcloud functions deploy strataum \
  --runtime nodejs18 \
  --source . \
  --entry-point strataum \
  --trigger-http \
  --allow-unauthenticated
```

### Option 3: Cloud Storage (Large Files)

```typescript
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('my-registry-bucket');

// Save
await bucket.file('state.json').save(registry.toJSON());

// Load
const [data] = await bucket.file('state.json').download();
const state = JSON.parse(data.toString());
```

## 📤 Upload/Download Packages

### To Registry
```bash
strataum set-registry https://us-central1-PROJECT_ID.cloudfunctions.net/strataum
strataum login admin admin123
strataum publish package.json
```

### From Registry
```bash
strataum download my-package
```

## 🔐 Authentication

### Add API Key (Recommended)

```bash
# Create API Key
gcloud alpha services api-keys create \
  --display-name="Strataum Registry" \
  --api-target=cloudfunctions.googleapis.com

# Restrict to function
gcloud functions add-iam-policy-binding strataum \
  --member=serviceAccount:SA_EMAIL \
  --role=roles/cloudfunctions.invoker
```

### Require Authentication

```bash
# Prevent unauthenticated access
gcloud functions deploy strataum \
  --no-allow-unauthenticated
```

Then use:
```bash
gcloud functions call strataum --region us-central1
```

## 📊 Monitoring

### View Logs
```bash
gcloud functions logs read strataum \
  --limit 50 \
  --region us-central1
```

### Stream Logs
```bash
gcloud functions logs read strataum \
  --limit 50 \
  --region us-central1 \
  --follow
```

### Cloud Monitoring Dashboard
Open https://console.cloud.google.com/monitoring

**Metrics to track:**
- Invocation count
- Execution time
- Memory usage
- Errors

## 🗑️ Cleanup

### Delete Function
```bash
gcloud functions delete strataum --region us-central1
```

### Delete Project
```bash
gcloud projects delete PROJECT_ID
```

## 📊 Performance Tips

1. **Cold Start**: ~2-3s (first invocation)
2. **Warm Start**: ~50-100ms (subsequent invocations)
3. **Memory**: Use 512MB for faster execution
4. **Concurrency**: Default 100 (configurable)

### Optimize for Speed
```bash
gcloud functions deploy strataum \
  --memory 2GB \
  --max-instances 1000 \
  --region us-central1
```

## 💰 Cost Estimation

### Pricing (as of 2024)
- **Invocations**: $0.40 per million
- **Computing Time**: $0.00001667 per GB-second
- **Free Tier**: 2M invocations/month

### Example (100K/month)
```
Invocations: 100,000 × $0.40/1M = $0.04
Compute: 100,000 invocs × 1s × 512MB = ~$0.01/month
Total: ~$0.05-0.10/month
```

## 🧪 Testing

### Local Testing with Functions Framework

```bash
# Install framework (already in package.json)
npm install @google-cloud/functions-framework

# Run locally
functions-framework --target=strataum --port=3000

# Test in another terminal
curl http://localhost:3000/health
```

### Integration Test
```bash
#!/bin/bash
REGISTRY_URL="https://us-central1-PROJECT_ID.cloudfunctions.net/strataum"

# Register
curl -X POST $REGISTRY_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'

# Login
curl -X POST $REGISTRY_URL/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Search
curl "$REGISTRY_URL/api/search?q=util"
```

## 🔗 Full Workflow

```bash
# 1. Build
npm run build

# 2. Deploy
gcloud functions deploy strataum \
  --runtime nodejs18 \
  --entry-point strataum \
  --source . \
  --trigger-http \
  --allow-unauthenticated

# 3. Get URL
REGISTRY_URL=$(gcloud functions describe strataum --format='value(httpsTrigger.url)')

# 4. Configure client
strataum set-registry $REGISTRY_URL

# 5. Login
strataum login admin admin123

# 6. Publish
strataum publish package.json

# 7. Download
strataum download my-package
```

## 🆘 Troubleshooting

### Function not deploying
```bash
# Check for build errors
npm run build

# Check Cloud Functions quota
gcloud compute project-info describe --project=PROJECT_ID
```

### Package upload fails
```bash
# Increase timeout
gcloud functions deploy strataum --timeout 120s

# Increase memory
gcloud functions deploy strataum --memory 1GB
```

### Can't download packages
```bash
# Check function logs
gcloud functions logs read strataum --limit 100

# Test endpoint directly
curl https://...../api/packages
```

### State not persisting
```bash
# Use Cloud Storage or Firestore
# See "State Persistence" section above

# Or increase environment variable limit
# Note: ~32KB max per env var
```

## 📚 Resources

- [Google Cloud Functions Docs](https://cloud.google.com/functions/docs)
- [Node.js Runtime Guide](https://cloud.google.com/functions/docs/runtime/nodejs)
- [Functions Framework](https://github.com/GoogleCloudPlatform/functions-framework-nodejs)
- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)

## 🎯 Next Steps

1. ✅ Deploy function
2. ✅ Test endpoints
3. ✅ Setup state persistence (optional)
4. ✅ Configure monitoring
5. ✅ Setup custom domain (optional)

---

**Ready to deploy? Start with:**
```bash
npm run build
gcloud functions deploy strataum --runtime nodejs18 --source . --trigger-http --allow-unauthenticated
```
