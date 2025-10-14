# Testing API Authentication

## Current Setup

✅ `api-keys.config.ts` has been created with an empty array
✅ The file is properly gitignored (won't be committed)
✅ Your web app at `/app/verify` will automatically use environment variables

## How to Test

### 1. Test Your Web App (No API Key)

Your existing web app should continue to work without any changes:

```bash
# Start the dev server
npm run dev

# Visit http://localhost:5173/app/verify
# Complete the verification flow - it should work!
```

**What happens behind the scenes:**
- Your web app makes requests to `/api/verification/start` and `/api/credentials`
- No `X-API-Key` header is sent
- Middleware checks for API key, doesn't find one
- Falls back to environment variables (`VITE_APP_WALLET_ADDRESS` + `ISSUER_PRIVATE_KEY`)
- Everything works as before!

### 2. Test with cURL (Simulating Your Web App)

```bash
# Without API key - uses environment variables
curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -d '{"provider": "mock"}'

# Should return session info successfully
```

### 3. Test with a Mobile Client API Key (When You Have One)

First, add a test API key to `api-keys.config.ts`:

```typescript
export const apiKeys: ApiKeyConfig[] = [
  {
    key: 'test_key_12345',
    name: 'Test Mobile App',
    contactEmail: 'test@example.com',
    issuerAddress: process.env.VITE_APP_WALLET_ADDRESS || '',
    issuerPrivateKey: process.env.ISSUER_PRIVATE_KEY || '',
    status: 'active',
    rateLimit: 100,
    createdAt: new Date().toISOString(),
  },
];
```

Then test with the API key:

```bash
curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_key_12345" \
  -d '{"provider": "mock"}'

# Should return session info and log:
# [API Auth] ✓ Authenticated: Test Mobile App
```

### 4. Test with Invalid API Key

```bash
curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: invalid_key" \
  -d '{"provider": "mock"}'

# Should return 401:
# {"error": "Invalid API key"}
```

## What You Should See in Logs

### Web App (No API Key):
```
[API Auth] ✓ Using environment variables for internal web app: ABCD1234...
[VERIFICATION] Session start requested
   Authenticated via env: Web App (Internal)
   Provider: mock
```

### Mobile Client (With API Key):
```
[API Auth] ✓ Authenticated: Test Mobile App (ABCD1234...)
[VERIFICATION] Session start requested
   Authenticated via api-key: Test Mobile App
   Provider: mock
```

## Verify Security

Double-check that sensitive data is not committed:

```bash
# This should show api-keys.config.ts is ignored
git status --ignored app/config/

# This should NOT show api-keys.config.ts
git status

# Try to add it (should fail or warn)
git add app/config/api-keys.config.ts
# Should say: "The following paths are ignored by one of your .gitignore files"
```

## Summary

- ✅ Your web app at `/app/verify` works without changes (uses env vars)
- ✅ Mobile clients can use API keys with their own issuer addresses
- ✅ Secrets stay out of git repository
- ✅ You can add external clients to `api-keys.config.ts` as needed
- ✅ Each client can be tracked and rate-limited independently

All set! 🎉
