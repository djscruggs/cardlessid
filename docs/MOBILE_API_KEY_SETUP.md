# Mobile API Key Setup (Environment Variables)

## Quick Setup

Your mobile client API key is now configured through environment variables for simplicity.

### Step 1: Generate an API Key

```bash
openssl rand -hex 32
```

Example output: `a1b2c3d4e5f6789...` (64 characters)

### Step 2: Add to Your `.env` File

Add these lines to your `.env` file (which is gitignored):

```bash
# Mobile Client API Key
MOBILE_API_KEY=a1b2c3d4e5f6789...  # Your generated key from step 1
MOBILE_API_CONTACT=mobile@cardlessid.org
MOBILE_API_RATE_LIMIT=1000

# Option 2: Use same issuer as web app (for testing/development)
# No additional config needed - it will use VITE_APP_WALLET_ADDRESS and ISSUER_PRIVATE_KEY
```

### Step 3: Test It

```bash
# Start your dev server
npm run dev

# Test the API key with curl
curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: a1b2c3d4e5f6789..." \
  -d '{"provider": "mock"}'

# Should return session info and log:
# [API Auth] ✓ Authenticated: CardlessID Mobile App (ABCD1234...)
# [Credentials] PRODUCTION MODE: CardlessID Mobile App (API key)
```

### Step 4: Use in Your Mobile App

```swift
// iOS Swift example
let apiKey = "a1b2c3d4e5f6789..." // Store securely!

var request = URLRequest(url: URL(string: "https://cardlessid.org/api/verification/start")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")

let body = ["provider": "mock"]
request.httpBody = try? JSONSerialization.data(withJSONObject: body)

// Make request...
```

## Configuration Options

### Option 1: Use Same Issuer as Web App (Simple)

**Best for**: Development, testing, or if you want mobile and web to issue from the same identity

Just set the API key:
```bash
MOBILE_API_KEY=your_generated_key
```

The mobile client will use the same issuer address as your web app (`VITE_APP_WALLET_ADDRESS` and `ISSUER_PRIVATE_KEY`).

### Option 2: Use Separate Issuer for Mobile (Recommended for Production)

**Best for**: Production, or when you want separate identities for mobile vs web

```bash
MOBILE_API_KEY=your_generated_key
MOBILE_ISSUER_ADDRESS=DIFFERENT_ALGORAND_ADDRESS_58_CHARS
MOBILE_ISSUER_PRIVATE_KEY=different_base64_private_key
```

This gives your mobile app its own issuer identity, allowing you to:
- Track mobile vs web credentials separately
- Revoke mobile issuer independently if needed
- Have different rate limits or policies

#### Creating a Separate Mobile Issuer:

```javascript
// Generate new wallet for mobile issuer
const algosdk = require('algosdk');
const account = algosdk.generateAccount();

console.log('Mobile Issuer Address:', account.addr);
console.log('Mobile Issuer Private Key:', Buffer.from(account.sk).toString('base64'));
```

Then:
1. Fund the wallet (testnet: use faucet, mainnet: send ALGO)
2. Register in Issuer Registry (see docs/API_KEY_SETUP.md)
3. Add to `.env` file

## How It Works

The API key configuration loads from environment variables:

```typescript
// app/config/api-keys.config.ts
{
  key: process.env.MOBILE_API_KEY,           // Required
  issuerAddress: process.env.MOBILE_ISSUER_ADDRESS ||
                 process.env.VITE_APP_WALLET_ADDRESS,  // Fallback to web app issuer
  issuerPrivateKey: process.env.MOBILE_ISSUER_PRIVATE_KEY ||
                    process.env.ISSUER_PRIVATE_KEY,      // Fallback to web app key
  rateLimit: Number(process.env.MOBILE_API_RATE_LIMIT) || 1000,
}
```

## Testing

### Test Production Mode (Real Credentials):

```bash
curl -X POST http://localhost:5173/api/credentials \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_MOBILE_API_KEY" \
  -d '{
    "verificationToken": "...",
    "walletAddress": "ALGORAND_ADDRESS_58_CHARS",
    "firstName": "John",
    "lastName": "Doe",
    "birthDate": "1990-01-15",
    "governmentId": "D1234567",
    "idType": "drivers_license",
    "state": "CA"
  }'
```

Should return:
- Real NFT asset ID
- Blockchain transaction hash
- Explorer URL
- **No** `demoMode` flag

### Test Demo Mode (Web UI):

```bash
curl -X POST http://localhost:5173/api/credentials \
  -H "Content-Type: application/json" \
  -d '{...}'  # No X-API-Key header
```

Should return:
- `"demoMode": true`
- `"assetId": "DEMO_ASSET_ID"`
- Demo notice

## Security Best Practices

### Development:
- ✅ Store API key in `.env` (gitignored)
- ✅ Use same issuer as web app (simpler)
- ✅ Test with mock provider

### Production:
- ✅ Use separate issuer for mobile
- ✅ Store API key securely (never in code)
- ✅ Use environment variables or secrets manager
- ✅ Enable rate limiting
- ✅ Monitor usage
- ✅ Use production verification provider

### Mobile App:
- ❌ **Never hardcode API key in app code**
- ✅ Fetch API key from your backend on app launch
- ✅ Store in device secure storage (Keychain/Keystore)
- ✅ Implement certificate pinning
- ✅ Obfuscate/encrypt in memory

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MOBILE_API_KEY` | Yes | API key for mobile client | `a1b2c3d4e5f6...` |
| `MOBILE_API_CONTACT` | No | Contact email | `mobile@cardlessid.org` |
| `MOBILE_API_RATE_LIMIT` | No | Requests per hour (0=unlimited) | `1000` |
| `MOBILE_ISSUER_ADDRESS` | No | Separate issuer address for mobile | `ABCD...` |
| `MOBILE_ISSUER_PRIVATE_KEY` | No | Separate issuer private key | `base64...` |

If `MOBILE_ISSUER_ADDRESS` and `MOBILE_ISSUER_PRIVATE_KEY` are not set, it will use `VITE_APP_WALLET_ADDRESS` and `ISSUER_PRIVATE_KEY`.

## Troubleshooting

### "Invalid API key"

Check:
1. Is `MOBILE_API_KEY` set in your `.env` file?
2. Did you restart the dev server after adding it?
3. Is the key correct in your request header?

### "Issuer wallet address is missing"

Check:
1. Is `VITE_APP_WALLET_ADDRESS` set in your `.env` file?
2. OR is `MOBILE_ISSUER_ADDRESS` set if using separate issuer?

### Demo mode when expecting production

Check:
1. Are you sending the `X-API-Key` header?
2. Is the header name exactly `X-API-Key` (case-sensitive)?

### Rate limit exceeded

Check:
1. Have you exceeded `MOBILE_API_RATE_LIMIT` requests per hour?
2. Wait for the next hour or increase the limit in `.env`

## Summary

Your mobile API key is now configured!

**Quick start:**
```bash
# 1. Generate key
openssl rand -hex 32

# 2. Add to .env
echo "MOBILE_API_KEY=your_generated_key" >> .env

# 3. Restart server
npm run dev

# 4. Test it
curl -H "X-API-Key: your_key" http://localhost:5173/api/verification/start
```

Done! 🎉
