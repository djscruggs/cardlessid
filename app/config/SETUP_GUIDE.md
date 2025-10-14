# How to Set Up api-keys.config.ts Without Committing Secrets

## The Problem

You want to use the API key system for external mobile clients, but you also need to use it internally in your web app at `/app/verify` without committing secrets to the repository.

## The Solution

**Keep your web app using environment variables (no API key needed)** and only use `api-keys.config.ts` for external mobile clients.

### Step 1: Create an Empty or Minimal Config

Create `app/config/api-keys.config.ts`:

```typescript
import type { ApiKeyConfig } from "./api-keys.example";

/**
 * External mobile client API keys
 *
 * NOTE: Your internal web app (/app/verify) does NOT need an entry here.
 * It will automatically use environment variables (VITE_APP_WALLET_ADDRESS and ISSUER_PRIVATE_KEY).
 */
export const apiKeys: ApiKeyConfig[] = [
  // Add external mobile clients here when you have them
  // Until then, this can be an empty array
  // Example (commented out):
  /*
  {
    key: 'generated_api_key_from_openssl',
    name: 'External Mobile App',
    contactEmail: 'dev@example.com',
    issuerAddress: 'THEIR_ALGORAND_ADDRESS_58_CHARS',
    issuerPrivateKey: 'their_base64_encoded_private_key',
    status: 'active',
    rateLimit: 1000,
    createdAt: '2025-01-15T00:00:00Z',
  },
  */
];
```

### Step 2: Your Web App Automatically Works

Your web app at `/app/verify` will work without any changes because the authentication middleware automatically falls back to environment variables:

```typescript
// In your /app/verify route - NO CHANGES NEEDED
const response = await fetch("/api/verification/start", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // NO X-API-Key header - it will use env vars automatically
  },
  body: JSON.stringify({ provider: "mock" }),
});
```

### Step 3: How It Works

The authentication flow in `app/utils/api-auth.server.ts`:

```
1. Check for X-API-Key header
   ├─ If found: Look up in api-keys.config.ts
   │            Use that client's issuer credentials
   │
   └─ If NOT found: Use environment variables
                     (VITE_APP_WALLET_ADDRESS + ISSUER_PRIVATE_KEY)
                     This is your web app!
```

### Step 4: When You Add External Clients

When you get a request from a mobile app developer:

1. Generate their API key: `openssl rand -hex 32`
2. Generate their Algorand wallet (or use their provided address)
3. Add to `api-keys.config.ts`:

```typescript
export const apiKeys: ApiKeyConfig[] = [
  {
    key: "a1b2c3d4e5f6...", // The generated key
    name: "MobileApp Inc",
    contactEmail: "dev@mobileapp.com",
    issuerAddress: "THEIR_ALGORAND_ADDRESS",
    issuerPrivateKey: "their_base64_key",
    status: "active",
    rateLimit: 1000,
    createdAt: new Date().toISOString(),
  },
];
```

4. This file stays gitignored and secure
5. Your web app continues working with env vars

## What Gets Committed vs What Doesn't

### ✅ Committed to Git:

- `api-keys.example.ts` - Template/documentation
- `README.md` - This guide
- All code files that use the API key system

### ❌ NOT Committed (gitignored):

- `api-keys.config.ts` - Your actual API keys
- `.env` - Your environment variables

## Security Checklist

- [x] `api-keys.config.ts` is in `.gitignore`
- [x] `.env` is in `.gitignore`
- [x] Web app uses environment variables (no hardcoded secrets)
- [x] External clients use API keys from config file
- [x] Config file is backed up securely (encrypted backup)

## Quick Start for Development

If you're just developing and don't have any external clients yet:

```bash
# Create an empty config (or skip this entirely)
echo 'export const apiKeys = [];' > app/config/api-keys.config.ts

# Your web app will automatically use .env variables
npm run dev

# Everything works!
```

## Alternative: Use Internal API Key (Optional)

If you want to be more explicit and track web app usage separately, you can add an entry for your web app that reads from env vars:

```typescript
export const apiKeys: ApiKeyConfig[] = [
  // Internal web app (reads from environment variables)
  {
    key: process.env.INTERNAL_API_KEY || "dev-internal-key",
    name: "Cardless ID Web App (Internal)",
    contactEmail: "internal",
    issuerAddress: process.env.VITE_APP_WALLET_ADDRESS || "",
    issuerPrivateKey: process.env.ISSUER_PRIVATE_KEY || "",
    status: "active",
    rateLimit: 0, // Unlimited
    createdAt: "2025-01-01T00:00:00Z",
  },
];
```

Then in your `.env`:

```bash
INTERNAL_API_KEY=your_generated_internal_key
```

And use it in your web app:

```typescript
const response = await fetch("/api/verification/start", {
  headers: {
    "X-API-Key": import.meta.env.VITE_INTERNAL_API_KEY,
  },
  // ...
});
```

But honestly, **Option 1 (empty array + env vars) is simpler** for your use case!
