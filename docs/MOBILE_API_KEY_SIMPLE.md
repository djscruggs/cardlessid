# Mobile API Key - Simple Setup

## Overview

Your mobile client uses a single API key stored in environment variables. Simple and secure.

## Setup (2 Steps)

### Step 1: Add Your API Key to `.env`

Your generated API key:
```
ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58
```

Add to your `.env` file:
```bash
# Mobile Client API Key (required for production credentials)
MOBILE_API_KEY=ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58

# Optional: Mobile-specific configuration
MOBILE_API_CONTACT=mobile@cardlessid.org
MOBILE_API_RATE_LIMIT=1000

# Optional: Separate issuer for mobile (recommended for production)
# If not set, uses VITE_APP_WALLET_ADDRESS and ISSUER_PRIVATE_KEY
# MOBILE_ISSUER_ADDRESS=SEPARATE_ALGORAND_ADDRESS
# MOBILE_ISSUER_PRIVATE_KEY=base64_encoded_private_key
```

### Step 2: Restart Server

```bash
npm run dev
```

Done! ✅

## How It Works

**Super Simple:**
```
1. Mobile sends request with X-API-Key header
2. Server checks: does it match MOBILE_API_KEY?
   ├─ YES → Production mode (real NFTs created)
   └─ NO  → Error 401 "Invalid API key"

3. Web UI sends request WITHOUT X-API-Key header
   → Demo mode (no real NFTs)
```

## Testing

### Test Mobile Client (Production Mode):

```bash
curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58" \
  -d '{"provider": "mock"}'

# Should log:
# [API Auth] ✓ Authenticated: Mobile Client (ABCD1234...)
# [Credentials] PRODUCTION MODE: Mobile Client (API key)
```

### Test Web UI (Demo Mode):

```bash
curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -d '{"provider": "mock"}'

# No X-API-Key header = demo mode
# [Credentials] DEMO MODE: Web UI demonstration
```

### Test Invalid Key:

```bash
curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong_key" \
  -d '{"provider": "mock"}'

# Should return 401:
# {"error": "Invalid API key"}
```

## Mobile App Integration

### iOS (Swift):
```swift
let apiKey = "ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58"

var request = URLRequest(url: URL(string: "https://cardlessid.org/api/verification/start")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")

// Send request...
```

### Android (Kotlin):
```kotlin
val apiKey = "ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58"

val request = Request.Builder()
    .url("https://cardlessid.org/api/verification/start")
    .post(requestBody)
    .addHeader("Content-Type", "application/json")
    .addHeader("X-API-Key", apiKey)
    .build()
```

## Security

**Environment Variables Only:**
- ✅ API key in `.env` (gitignored)
- ✅ Never in code or config files
- ✅ Never committed to git
- ✅ Simple to rotate (just change env var)

**In Mobile App:**
- ❌ Don't hardcode the API key
- ✅ Fetch from your backend on app launch
- ✅ Store in device secure storage (Keychain/Keystore)

## Validation Location

The validation happens in [app/utils/api-auth.server.ts](../app/utils/api-auth.server.ts):

```typescript
// Line 31-58: Simple comparison
const apiKey = request.headers.get("X-API-Key");
const expectedApiKey = process.env.MOBILE_API_KEY;

if (apiKey !== expectedApiKey) {
  return { success: false, error: "Invalid API key" };
}
```

That's it! No config files, no arrays, just a simple string comparison.

## Troubleshooting

### "Invalid API key"
- Check `MOBILE_API_KEY` in your `.env` file
- Restart dev server after adding it
- Make sure header is exactly `X-API-Key` (case-sensitive)

### "API key authentication is not configured"
- `MOBILE_API_KEY` is not set in `.env`
- Add it and restart server

### "Issuer configuration is invalid"
- Missing `VITE_APP_WALLET_ADDRESS` or `ISSUER_PRIVATE_KEY`
- OR missing `MOBILE_ISSUER_ADDRESS` or `MOBILE_ISSUER_PRIVATE_KEY`
- Check your `.env` file has issuer credentials

## Summary

**One API key, one environment variable, done!**

```bash
# 1. Add to .env
MOBILE_API_KEY=ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58

# 2. Restart server
npm run dev

# 3. Use in mobile app
X-API-Key: ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58
```

**Mobile with key** → Real credentials ✅
**Web without key** → Demo mode 🎭
**Anyone with wrong key** → Error 401 ❌
