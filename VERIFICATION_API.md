# Verification API Documentation

## Overview

The verification system uses a session-based flow with pluggable identity verification providers.

## Architecture

```
Mobile App → Start Session → Provider SDK → Webhook → Issue Credential
```

## API Endpoints

### 1. Start Verification Session

**POST** `/api/verification/start`

Create a new verification session and get auth token for mobile SDK.

```json
// Request (optional)
{
  "provider": "mock" | "idenfy" | "stripe_identity"
}

// Response
{
  "sessionId": "session_1727890123_abc123",
  "authToken": "mock_token_...",
  "expiresAt": "2025-10-01T16:30:00.000Z",
  "provider": "mock"
}
```

### 2. Check Session Status

**GET** `/api/verification/status/:sessionId`

Poll to check if verification is complete.

```json
// Response
{
  "sessionId": "session_1727890123_abc123",
  "status": "pending" | "approved" | "rejected" | "expired",
  "provider": "mock",
  "ready": true,  // true if can issue credential
  "expiresAt": "2025-10-01T16:30:00.000Z",
  "credentialIssued": false
}
```

### 3. Webhook (Provider → Server)

**POST** `/api/verification/webhook?provider=mock`

Verification provider calls this when verification completes.

```json
// Request (provider-specific format)
{
  "providerSessionId": "mock_session_xxx",
  "status": "approved",
  "firstName": "John",
  "lastName": "Doe",
  "birthDate": "1990-01-01",
  "governmentId": "D1234567",
  "idType": "government_id",
  "state": "CA"
}

// Response
{
  "success": true,
  "sessionId": "session_1727890123_abc123",
  "status": "approved"
}
```

### 4. Issue Credential

**POST** `/api/credentials`

Issue credential after verification is approved.

```json
// Request
{
  "verificationSessionId": "session_1727890123_abc123",
  "walletAddress": "ALGORAND_ADDRESS_HERE"
}

// Response
{
  "success": true,
  "credential": { ... },
  "personalData": { ... },
  "blockchain": { ... },
  "duplicateDetection": { ... }
}
```

## Testing with Mock Provider

### Step 1: Start Session

```bash
curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -d '{"provider": "mock"}'
```

Response:
```json
{
  "sessionId": "session_1727890123_abc123",
  "authToken": "mock_token_...",
  "expiresAt": "2025-10-01T16:30:00.000Z",
  "provider": "mock"
}
```

### Step 2: Simulate Webhook (Approve Verification)

```bash
curl -X POST 'http://localhost:5173/api/verification/webhook?provider=mock' \
  -H "Content-Type: application/json" \
  -d '{
    "providerSessionId": "mock_session_session_1727890123_abc123",
    "status": "approved",
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "birthDate": "1990-01-15",
    "governmentId": "D1234567",
    "idType": "government_id",
    "state": "CA"
  }'
```

### Step 3: Check Status

```bash
curl http://localhost:5173/api/verification/status/session_1727890123_abc123
```

Response:
```json
{
  "sessionId": "session_1727890123_abc123",
  "status": "approved",
  "ready": true,
  "provider": "mock"
}
```

### Step 4: Issue Credential

```bash
curl -X POST http://localhost:5173/api/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "verificationSessionId": "session_1727890123_abc123",
    "walletAddress": "YOUR_ALGORAND_ADDRESS_HERE"
  }'
```

## Mobile App Flow

```typescript
// 1. Start verification
const { sessionId, authToken } = await fetch('/api/verification/start', {
  method: 'POST',
  body: JSON.stringify({ provider: 'idenfy' })
}).then(r => r.json());

// 2. Launch provider SDK (e.g., iDenfy React Native SDK)
await IdenfyReactNative.start({ authToken });

// 3. Poll for completion
let status;
do {
  const response = await fetch(`/api/verification/status/${sessionId}`);
  status = await response.json();
  await new Promise(r => setTimeout(r, 2000)); // Wait 2s
} while (status.status === 'pending');

// 4. If approved, issue credential
if (status.ready) {
  const credential = await fetch('/api/credentials', {
    method: 'POST',
    body: JSON.stringify({
      verificationSessionId: sessionId,
      walletAddress: myWalletAddress
    })
  }).then(r => r.json());
}
```

## Adding New Providers

1. Create provider class in `app/utils/verification-providers/`
2. Implement `IVerificationProvider` interface
3. Register in `app/utils/verification-providers/index.ts`
4. Set environment variable: `VERIFICATION_PROVIDER=your_provider`

See `mock.ts` for reference implementation.
