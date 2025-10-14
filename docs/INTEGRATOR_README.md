# Cardless ID Integrator System

This document describes the secure age verification integration system for Cardless ID.

## Overview

The integrator system allows external companies to integrate Cardless ID's privacy-preserving age verification into their applications. It uses a secure challenge-response flow that prevents users from tampering with age requirements.

## Architecture

### Challenge-Response Flow

```
Company Backend     Cardless ID API      User's Wallet
     |                   |                    |
     |-- Create -------->|                    |
     |   Challenge       |                    |
     |                   |                    |
     |<-- Challenge -----|                    |
     |    ID + QR        |                    |
     |                   |                    |
     | Display QR        |                    |
     |=================================>      |
     |                   |                    |
     |                   |<--- Scan QR -------|
     |                   |                    |
     |                   |<--- Verify --------|
     |                   |    Age >= minAge   |
     |                   |                    |
     |                   |--- Approve ------->|
     |                   |                    |
     |-- Poll/Webhook -->|                    |
     |                   |                    |
     |<-- Verified ------|                    |
     |   Result          |                    |
```

## Security Features

1. **API Key Authentication** - Only authorized integrators can create challenges
2. **Server-Side Validation** - Age requirements stored server-side, not in URL
3. **Single-Use Challenges** - Each challenge can only be used once
4. **Time-Limited** - Challenges expire after 10 minutes
5. **Cryptographic Binding** - Challenge ID is tied to the age requirement
6. **Ownership Verification** - Only the creating integrator can verify results

## Components

### Backend API Endpoints

Located in `app/routes/api/integrator/challenge/`:

1. **`create.ts`** - Create new verification challenge
   - POST `/api/integrator/challenge/create`
   - Requires API key in request body
   - Returns challenge ID and QR code URL

2. **`verify.$challengeId.ts`** - Verify challenge status
   - GET `/api/integrator/challenge/verify/:challengeId`
   - Requires API key in `X-API-Key` header
   - Returns verification result

3. **`details.$challengeId.ts`** - Get challenge details (public)
   - GET `/api/integrator/challenge/details/:challengeId`
   - No authentication required
   - Returns only public info (minAge, status, expiry)

4. **`respond.ts`** - Handle wallet response
   - POST `/api/integrator/challenge/respond`
   - Called by wallet when user approves/rejects
   - Updates challenge status

### Server Utilities

Located in `app/utils/`:

1. **`integrator-challenges.server.ts`**
   - Challenge CRUD operations
   - Firebase Realtime Database integration
   - Challenge expiration logic

2. **`api-keys.server.ts`**
   - API key validation
   - Integrator management
   - Key generation and revocation

### Frontend Components

Updated routes in `app/routes/app/`:

1. **`age-verify.tsx`** - Verification page
   - Supports both demo mode (session) and integrator mode (challenge)
   - Displays QR code for scanning
   - Polls for verification status

2. **`wallet-verify.tsx`** - Wallet response page
   - Handles both demo and integrator flows
   - Allows user to approve/reject verification
   - Submits response to appropriate endpoint

## SDK

### Node.js SDK

Located in `sdk/node/`:

- **`cardlessid-verifier.js`** - Main SDK implementation
- **`cardlessid-verifier.d.ts`** - TypeScript type definitions
- **`package.json`** - NPM package configuration

### Example Applications

Located in `sdk/examples/`:

- **`simple-express/`** - Complete Express.js integration example

## Documentation

### Web Documentation

- **Route**: `/docs/integration-guide`
- **File**: `app/routes/docs/integration-guide.tsx`
- **Features**: Interactive guide with code examples, API reference, best practices

### Markdown Documentation

Located in `sdk/`:

- **`INTEGRATION_GUIDE.md`** - Complete integration guide
- **`README.md`** - SDK overview and quick start

## Database Schema

### Firebase Realtime Database

```
integratorChallenges/
  {challengeId}/
    id: string
    integratorId: string
    minAge: number
    status: "pending" | "approved" | "rejected" | "expired"
    createdAt: number
    expiresAt: number
    callbackUrl?: string
    walletAddress?: string
    respondedAt?: number

integrators/
  {integratorId}/
    name: string
    apiKey: string
    createdAt: number
    active: boolean
    domain?: string
```

## API Reference

### Create Challenge

```http
POST /api/integrator/challenge/create
Content-Type: application/json

{
  "apiKey": "your_api_key",
  "minAge": 21,
  "callbackUrl": "https://yourapp.com/webhook"
}
```

**Response:**

```json
{
  "challengeId": "chal_1234567890_abc123",
  "qrCodeUrl": "https://cardlessid.com/app/age-verify?challenge=chal_...",
  "deepLinkUrl": "cardlessid://verify?challenge=chal_...",
  "createdAt": 1234567890000,
  "expiresAt": 1234568490000
}
```

### Verify Challenge

```http
GET /api/integrator/challenge/verify/:challengeId
X-API-Key: your_api_key
```

**Response:**

```json
{
  "challengeId": "chal_1234567890_abc123",
  "verified": true,
  "status": "approved",
  "minAge": 21,
  "walletAddress": "ALGORAND_ADDRESS...",
  "createdAt": 1234567890000,
  "expiresAt": 1234568490000,
  "respondedAt": 1234568123000
}
```

## Integration Example

```javascript
const Cardless ID = require("@cardlessid/verifier");

const verifier = new CardlessID({
  apiKey: process.env.CARDLESSID_API_KEY,
});

// Create challenge
const challenge = await verifier.createChallenge({ minAge: 21 });

// Show QR code to user
displayQRCode(challenge.qrCodeUrl);

// Poll for result
const result = await verifier.pollChallenge(challenge.challengeId);

if (result.verified) {
  console.log("User verified as 21+");
  console.log("Wallet:", result.walletAddress);
}
```

## Testing

### Local Development

1. Set environment variables:

   ```bash
   export CARDLESSID_API_KEY=test_key
   export CARDLESSID_URL=http://localhost:5173
   ```

2. Request a test API key (via contact form at [cardlessid.org/contact](https://cardlessid.org/contact)):

   ```javascript
   const { createIntegrator } = require("./app/utils/api-keys.server");

   const integrator = await createIntegrator({
     name: "Test Company",
     domain: "localhost",
   });

   console.log("API Key:", integrator.apiKey);
   ```

3. Run the example:
   ```bash
   cd sdk/examples/simple-express
   npm install
   npm start
   ```

### Production Deployment

1. Request a production API key (via contact form at [cardlessid.org/contact](https://cardlessid.org/contact)):
2. Store keys securely (environment variables, secrets manager)
3. Configure HTTPS endpoints
4. Set up webhook URLs
5. Implement rate limiting
6. Add logging and monitoring

## Route Configuration

Routes are defined in `app/routes.ts`:

```typescript
...prefix("integrator/challenge", [
  route("create", "routes/api/integrator/challenge/create.ts"),
  route("respond", "routes/api/integrator/challenge/respond.ts"),
  route("verify/:challengeId", "routes/api/integrator/challenge/verify.$challengeId.ts"),
  route("details/:challengeId", "routes/api/integrator/challenge/details.$challengeId.ts"),
]),
```

## Future Enhancements

- [ ] Admin panel for API key management
- [ ] Rate limiting per integrator
- [ ] Usage analytics and reporting
- [ ] Additional SDKs (Python, Ruby, PHP, Go)
- [ ] CDN-hosted JavaScript widget
- [ ] Webhook signature verification
- [ ] Challenge templates
- [ ] Multi-requirement challenges (age + location, etc.)

## Support

- **Documentation**: https://cardlessid.com/docs/integration-guide
- **GitHub**: https://github.com/djscruggs/cardlessid
- **Email**: me@djscruggs.com

## License

MIT
