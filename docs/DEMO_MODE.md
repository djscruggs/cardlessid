# Demo Mode for Web UI

## Overview

The web-based credential creation interface at `/app/create-credential` now operates in **Demo Mode** to prevent abuse while still demonstrating the credential format.

## What Changed

### Before:
- Web UI created real NFTs on the Algorand blockchain
- Anyone could create unlimited credentials
- Risk of blockchain spam and abuse
- Wasted transaction fees

### After:
- **Web UI**: Demo mode only - shows credential format without creating NFTs
- **Mobile clients with API keys**: Create real credentials on blockchain
- Clear visual indicators that web UI is demonstration only
- No blockchain transactions or database writes in demo mode

## How It Works

### Demo Mode (Web UI without API key)

When a request comes without an `X-API-Key` header (i.e., from the web UI):

1. ✅ **Identity verification still works** (user experience intact)
2. ✅ **Credential JSON is generated** (shows proper format)
3. ✅ **Cryptographic signature is created** (demonstrates signing)
4. ❌ **No NFT minted on blockchain** (prevents abuse)
5. ❌ **No database writes** (prevents spam)
6. ℹ️ **Demo notice displayed** (clear user communication)

### Production Mode (Mobile clients with API key)

When a request includes a valid `X-API-Key` header:

1. ✅ **Full identity verification**
2. ✅ **Credential JSON generated**
3. ✅ **Cryptographic signature created**
4. ✅ **NFT minted on Algorand blockchain**
5. ✅ **Database records created**
6. ✅ **Real, usable credential issued**

## Code Changes

### API Endpoint ([app/routes/api/credentials.ts](../app/routes/api/credentials.ts))

```typescript
// Detect demo vs production mode
const isDemoMode = source === "env"; // No API key = demo mode

if (isDemoMode) {
  console.log(`[Credentials] DEMO MODE: No real credentials issued`);
  // Skip NFT minting
  assetId = "DEMO_ASSET_ID";
  // Skip database writes
} else {
  console.log(`[Credentials] PRODUCTION MODE: ${issuer.name}`);
  // Full NFT minting and database operations
}
```

### Response Format

**Demo Mode Response:**
```json
{
  "success": true,
  "demoMode": true,
  "demoNotice": "This is a DEMONSTRATION only. No real credentials were created...",
  "credential": { /* Full W3C credential format */ },
  "personalData": { /* User's data */ },
  "nft": {
    "assetId": "DEMO_ASSET_ID",
    "requiresOptIn": false,
    "demoNotice": "No NFT was created - this is a demonstration"
  }
}
```

**Production Mode Response:**
```json
{
  "success": true,
  "credential": { /* Full W3C credential format */ },
  "personalData": { /* User's data */ },
  "nft": {
    "assetId": "123456",
    "requiresOptIn": true,
    "instructions": { /* How to opt-in and receive */ }
  },
  "blockchain": {
    "transaction": {
      "id": "TX_HASH",
      "explorerUrl": "https://..."
    }
  }
}
```

### Web UI ([app/routes/app/create-credential.tsx](../app/routes/app/create-credential.tsx))

Visual changes:

1. **Page title**: "Create Credential (Demo)"
2. **Warning banner**: Yellow banner at top explaining demo mode
3. **Button text**: "Generate Demo Credential"
4. **Success message**: Shows demo notice when credential generated
5. **Contact link**: Directs users to contact page for API keys

## User Experience

### For Developers Testing Web UI:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Demonstration Mode                              │
│  This page demonstrates the credential format.      │
│  No real NFTs will be created on the blockchain.    │
│  Mobile apps must register for an API key.          │
│  [Contact us]                                        │
└─────────────────────────────────────────────────────┘

[Wallet Address Input]

[Generate Demo Credential Button]

┌─────────────────────────────────────────────────────┐
│  🎭 Demo Credential Generated                        │
│  No real credentials were created on the blockchain. │
│  Contact us to get an API key for production use.   │
└─────────────────────────────────────────────────────┘

Demo Credential Format:
{
  "credential": { ... },
  "personalData": { ... }
}
```

### For Mobile App Developers:

Mobile clients with API keys get the full production experience:
- Real NFTs minted
- Credentials registered on-chain
- Blockchain transaction URLs
- Full opt-in instructions

## Benefits

### Security
- ✅ Prevents blockchain spam from web UI
- ✅ Prevents database bloat from test credentials
- ✅ Requires registration (API key) for real credentials
- ✅ Rate limiting on production credentials

### User Experience
- ✅ Web demo still shows full credential format
- ✅ Clear communication about demo vs production
- ✅ Low friction for testing/exploring
- ✅ Easy path to production (contact for API key)

### Cost Savings
- ✅ No wasted transaction fees on demo requests
- ✅ No blockchain storage for test data
- ✅ Preserves Algorand wallet balance

## Testing

### Test Demo Mode (Web UI):

```bash
# Start dev server
npm run dev

# Visit http://localhost:5173/app/create-credential
# Complete verification
# Enter any wallet address
# Click "Generate Demo Credential"

# Should see:
# - Yellow demo warning
# - Credential JSON generated
# - "DEMO_ASSET_ID" in response
# - No blockchain transaction
```

### Test Production Mode (API Key):

```bash
# Add test API key to api-keys.config.ts
curl -X POST http://localhost:5173/api/credentials \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_test_key" \
  -d '{
    "verificationToken": "...",
    "walletAddress": "...",
    ...
  }'

# Should see:
# - Real asset ID
# - Blockchain transaction hash
# - Explorer URL
# - Database records created
```

## Logs

### Demo Mode Logs:
```
[Credentials] Authenticated via env: Web App (Internal)
[Credentials] DEMO MODE: Web UI demonstration (no real credentials issued)
[Credentials] Demo mode - skipping NFT creation
[Credentials] Demo mode - skipping database writes
```

### Production Mode Logs:
```
[API Auth] ✓ Authenticated: Mobile App Inc (ABCD1234...)
[Credentials] PRODUCTION MODE: Mobile App Inc (API key)
[Credentials] Using issuer: Mobile App Inc (ABCD1234...)
✓ Created NFT credential: Asset ID 123456, Tx: XYZ...
```

## Migration Path

For existing integrations:

1. **Internal web app**: No changes needed - automatically uses demo mode
2. **Mobile clients**: Must add `X-API-Key` header to get production credentials
3. **Testing**: Can still test full flow with API keys in development

## Related Documentation

- [API Key Setup](./API_KEY_SETUP.md) - How to create API keys for mobile clients
- [Mobile Client Integration](./MOBILE_CLIENT_INTEGRATION.md) - Full integration guide
- [API Authentication Policy](./API_AUTHENTICATION_POLICY.md) - Authentication architecture

## Summary

The demo mode achieves the goal of preventing abuse while maintaining a great demonstration experience. Users can see exactly what a credential looks like without creating real blockchain transactions, and mobile apps get full production credentials with API keys.
