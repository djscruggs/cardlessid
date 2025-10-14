# API Authentication Policy

## Overview

The authentication system uses a **single API key** stored in environment variables. This provides simplicity, security, and clear separation between production and demo modes.

## Current Implementation

### Simple Single-Key Validation

```typescript
// app/utils/api-auth.server.ts
const apiKey = request.headers.get("X-API-Key");
const expectedApiKey = process.env.MOBILE_API_KEY;

if (apiKey === expectedApiKey) {
  // ✅ Production mode - real credentials
} else if (!apiKey) {
  // 🎭 Demo mode - web UI demonstration
} else {
  // ❌ Invalid key - reject
}
```

## Authentication Flow

```
Request Received
    │
    ├─ Has X-API-Key header?
    │   │
    │   YES ──> Compare with MOBILE_API_KEY
    │           │
    │           ├─ MATCH ──> ✅ Production Mode
    │           │            • Real NFTs created
    │           │            • Database writes
    │           │            • Rate limited (1000/hour)
    │           │            • Full credential issuance
    │           │
    │           └─ NO MATCH ──> ❌ Error 401
    │                          "Invalid API key"
    │
    └─ NO ──> 🎭 Demo Mode
              • No real NFTs
              • No database writes
              • Shows demo warnings
              • For web UI only
```

## Environment Variables

### Required

| Variable | Description | Example | Generate With |
|----------|-------------|---------|---------------|
| `MOBILE_API_KEY` | Single API key for mobile client | `ead6b3d0327886a7...` | `openssl rand -hex 32` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `MOBILE_API_CONTACT` | Contact email | `mobile@cardlessid.org` |
| `MOBILE_API_RATE_LIMIT` | Requests per hour | `1000` |
| `MOBILE_ISSUER_ADDRESS` | Separate issuer wallet | Falls back to `VITE_APP_WALLET_ADDRESS` |
| `MOBILE_ISSUER_PRIVATE_KEY` | Separate issuer key | Falls back to `ISSUER_PRIVATE_KEY` |

## Use Cases

### 1. Mobile App (Production)

**Request:**
```http
POST /api/verification/start HTTP/1.1
Host: cardlessid.org
Content-Type: application/json
X-API-Key: ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58

{"provider": "mock"}
```

**Result:**
- ✅ Production mode
- Real NFTs minted
- Database records created
- Returns: `"demoMode": false`

### 2. Web UI (Demo)

**Request:**
```http
POST /api/verification/start HTTP/1.1
Host: cardlessid.org
Content-Type: application/json

{"provider": "mock"}
```

**Result:**
- 🎭 Demo mode
- No NFTs created
- No database writes
- Returns: `"demoMode": true`

### 3. Invalid Key

**Request:**
```http
POST /api/verification/start HTTP/1.1
Host: cardlessid.org
Content-Type: application/json
X-API-Key: wrong_key_12345

{"provider": "mock"}
```

**Result:**
- ❌ Error 401
- Returns: `{"error": "Invalid API key"}`
- Logged as security event

## Security Model

### Production Mode (Valid API Key)
- ✅ **Real credentials**: NFTs minted on Algorand blockchain
- ✅ **Persistent**: Database records created
- ✅ **Rate limited**: Default 1000 requests/hour
- ✅ **Tracked**: All operations logged
- ✅ **Accountable**: Linked to specific mobile client

### Demo Mode (No API Key)
- 🎭 **Demonstration only**: Shows credential format
- ❌ **No blockchain**: No NFTs created
- ❌ **No persistence**: No database writes
- ℹ️ **Clearly labeled**: Demo warnings displayed
- ✅ **Safe for testing**: No cost, no spam

### Invalid Key
- ❌ **Rejected**: 401 Unauthorized error
- ⚠️ **Logged**: Security event recorded
- 🔒 **No credentials**: Nothing issued

## Code Locations

### Authentication Logic
[app/utils/api-auth.server.ts](../app/utils/api-auth.server.ts) - Lines 27-86

### Endpoints Using Authentication
1. [app/routes/api/verification/start.ts](../app/routes/api/verification/start.ts) - Line 24
2. [app/routes/api/credentials.ts](../app/routes/api/credentials.ts) - Line 67

### Demo Mode Logic
[app/routes/api/credentials.ts](../app/routes/api/credentials.ts) - Line 75-81

## Setup Instructions

### 1. Generate API Key
```bash
openssl rand -hex 32
# Output: ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58
```

### 2. Add to `.env`
```bash
# Mobile Client API Key
MOBILE_API_KEY=ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58

# Optional: Mobile-specific configuration
MOBILE_API_CONTACT=mobile@cardlessid.org
MOBILE_API_RATE_LIMIT=1000

# Optional: Separate issuer (recommended for production)
# MOBILE_ISSUER_ADDRESS=SEPARATE_ALGORAND_ADDRESS
# MOBILE_ISSUER_PRIVATE_KEY=base64_encoded_private_key
```

### 3. Restart Server
```bash
npm run dev
```

### 4. Test
```bash
# Test with valid key (production mode)
curl -H "X-API-Key: ead6b3d0..." http://localhost:5173/api/verification/start

# Test without key (demo mode)
curl http://localhost:5173/api/verification/start

# Test with wrong key (error)
curl -H "X-API-Key: wrong" http://localhost:5173/api/verification/start
```

See [MOBILE_API_KEY_SIMPLE.md](./MOBILE_API_KEY_SIMPLE.md) for detailed instructions.

## Rate Limiting

Simple in-memory rate limiting:
- **Scope**: Per API key (production mode only)
- **Default**: 1000 requests per hour
- **Configurable**: Set `MOBILE_API_RATE_LIMIT` env var
- **Demo mode**: No rate limit

**Note**: For multi-server deployments, consider Redis-based rate limiting.

## Security Best Practices

### Server-Side (You)
- ✅ Store API key in `.env` (gitignored)
- ✅ Never commit to version control
- ✅ Rotate if compromised
- ✅ Monitor logs for invalid attempts
- ✅ Use separate issuer for mobile in production
- ✅ Keep backups encrypted

### Mobile Client
- ❌ Never hardcode API key in app code
- ✅ Fetch from your backend on app launch
- ✅ Store in device secure storage (iOS Keychain, Android Keystore)
- ✅ Use certificate pinning for API requests
- ✅ Implement key rotation support
- ✅ Obfuscate API requests

## Advantages of This Approach

| Feature | Config File System | **Environment Variable** |
|---------|-------------------|-------------------------|
| Complexity | High (3 files, arrays) | **Low (1 env var)** |
| Setup time | 10+ minutes | **2 minutes** |
| Validation | Array lookup O(n) | **String compare O(1)** |
| Multi-client | Yes | No (not needed) |
| Maintainability | Complex | **Simple** |
| Security | Same | **Same** |
| Debugging | Harder | **Easier** |

## Troubleshooting

### "Invalid API key"
**Cause**: Key doesn't match `MOBILE_API_KEY`

**Fix**:
1. Check `.env` file has correct key
2. Restart server after changing `.env`
3. Verify header is exactly `X-API-Key` (case-sensitive)
4. Check for typos or extra spaces

### "API key authentication is not configured"
**Cause**: `MOBILE_API_KEY` not set in environment

**Fix**:
1. Add `MOBILE_API_KEY=your_key` to `.env`
2. Restart server
3. Verify `.env` file is in project root

### "Missing X-API-Key header"
**Cause**: Mobile client not sending header

**Fix**:
1. Add header to mobile app requests
2. Header name must be exactly `X-API-Key`
3. Check network inspector/logs

### "Rate limit exceeded"
**Cause**: Exceeded `MOBILE_API_RATE_LIMIT` requests/hour

**Fix**:
1. Wait for next hour (limit resets hourly)
2. Or increase limit: `MOBILE_API_RATE_LIMIT=5000`
3. Or set to 0 for unlimited (dev only)

### Demo mode when expecting production
**Cause**: API key not being sent or invalid

**Fix**:
1. Ensure `X-API-Key` header is included
2. Verify key matches `MOBILE_API_KEY` exactly
3. Check server logs for authentication messages

## Future Enhancements

If you need multiple mobile clients later:

**Option 1: Comma-separated keys**
```bash
MOBILE_API_KEY=key1,key2,key3
```

**Option 2: JSON config**
```bash
MOBILE_API_KEYS='{"client1":"key1","client2":"key2"}'
```

**Option 3: Return to config file**
```typescript
// app/config/api-keys.config.ts
export const apiKeys = [...]
```

But for now, **one key is perfect!**

## Related Documentation

- [MOBILE_API_KEY_SIMPLE.md](./MOBILE_API_KEY_SIMPLE.md) - Quick setup guide
- [DEMO_MODE.md](./DEMO_MODE.md) - How demo mode works
- [MOBILE_CLIENT_INTEGRATION.md](./MOBILE_CLIENT_INTEGRATION.md) - Full integration guide

## Summary

**Simple, secure, single-key authentication:**

```
✅ One mobile client
✅ One API key
✅ One environment variable
✅ Simple string comparison
✅ Clear production/demo separation
✅ Easy to maintain
```

No config files, no arrays, no complexity. Just works! 🎉
