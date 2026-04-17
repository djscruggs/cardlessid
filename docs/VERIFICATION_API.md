# Verification API

## Overview

Two API layers exist:

| Layer | Endpoints | Purpose |
|---|---|---|
| **Age Verification** | `/api/v/*` | Stateless QR-code age check; no API key |
| **Credential Issuance** | `/api/verification/*` + `/api/credentials` | One-time KYC; requires API key |

---

## Age Verification (`/api/v/*`)

No API key required. See [MOBILE_CLIENT_INTEGRATION.md](./MOBILE_CLIENT_INTEGRATION.md) for the full flow.

### GET `/api/v/nonce`

Returns a signed, expiring nonce.

```
GET /api/v/nonce?minAge=21&siteId=my-site
```

Response:
```json
{ "nonce": "<hmac-signed-token>", "expiresIn": 300 }
```

### POST `/api/v/submit`

Wallet submits a signed proof.

```json
{ "nonce": "...", "signedProof": { "payload": {...}, "signature": "..." } }
```

Response: `{ "success": true }`

### GET `/api/v/result/:nonce`

Integrator polls for the proof. Returns 404 until wallet submits; auto-expires after 60 seconds.

---

## Credential Issuance (`/api/verification/*`)

Requires `X-API-Key` header on all requests.

### POST `/api/verification/start`

Start a KYC session.

```json
{ "provider": "mock" }
```

Response:
```json
{
  "sessionId": "session_xxx",
  "authToken": "token_for_provider_sdk",
  "expiresAt": "...",
  "provider": "mock",
  "providerSessionId": "..."
}
```

### GET `/api/verification/status/:sessionId`

Poll session status.

```json
{
  "sessionId": "...",
  "status": "pending | approved | rejected | expired",
  "ready": true,
  "provider": "mock",
  "credentialIssued": false
}
```

### POST `/api/verification/webhook?provider=mock`

Called by the verification provider when the user completes KYC (or simulate directly in dev).

```json
{
  "providerSessionId": "mock_session_xxx",
  "status": "approved",
  "firstName": "John",
  "lastName": "Doe",
  "birthDate": "1990-01-15",
  "governmentId": "D1234567",
  "idType": "government_id",
  "state": "CA"
}
```

---

## Credential Issuance (`/api/credentials`)

Requires `X-API-Key` header.

### POST `/api/credentials`

Issue a W3C Verifiable Credential after KYC is approved.

```json
{
  "verificationToken": "signed_token_xyz",
  "walletAddress": "ALGORAND_ADDRESS_58_CHARS",
  "firstName": "John",
  "lastName": "Doe",
  "birthDate": "1990-01-15",
  "governmentId": "D1234567",
  "idType": "drivers_license",
  "state": "CA"
}
```

Response (production mode — valid API key):
```json
{
  "success": true,
  "credential": { "@context": [...], "type": ["VerifiableCredential", "BirthDateCredential"], ... },
  "personalData": { "firstName": "John", "lastName": "Doe", "birthDate": "1990-01-15" },
  "nft": { "assetId": "123456", "requiresOptIn": true },
  "blockchain": { "transaction": { "id": "TX_HASH", "explorerUrl": "..." } }
}
```

Response (demo mode — no API key):
```json
{
  "success": true,
  "demoMode": true,
  "credential": { ... },
  "nft": { "assetId": "DEMO_ASSET_ID", "requiresOptIn": false }
}
```

---

## Dev Testing

### Test age verification end-to-end

```bash
# 1. Get nonce
NONCE=$(curl -s "http://localhost:5173/api/v/nonce?minAge=21" | jq -r '.nonce')

# 2. Submit a signed proof (from wallet)
# (Use algosdk in your wallet app to sign — see MOBILE_CLIENT_INTEGRATION.md)

# 3. Poll result
curl "http://localhost:5173/api/v/result/$NONCE"
```

### Test credential issuance with mock provider

```bash
# 1. Start session
RESPONSE=$(curl -s -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $MOBILE_API_KEY" \
  -d '{"provider": "mock"}')

SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')
PROVIDER_SESSION_ID=$(echo $RESPONSE | jq -r '.providerSessionId')

# 2. Simulate webhook
curl -X POST "http://localhost:5173/api/verification/webhook?provider=mock" \
  -H "Content-Type: application/json" \
  -d "{
    \"providerSessionId\": \"$PROVIDER_SESSION_ID\",
    \"status\": \"approved\",
    \"firstName\": \"John\", \"lastName\": \"Doe\",
    \"birthDate\": \"1990-01-15\", \"governmentId\": \"D1234567\",
    \"idType\": \"government_id\", \"state\": \"CA\"
  }"

# 3. Check status
curl "http://localhost:5173/api/verification/status/$SESSION_ID"

# 4. Issue credential
curl -X POST http://localhost:5173/api/credentials \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $MOBILE_API_KEY" \
  -d "{\"verificationSessionId\": \"$SESSION_ID\", \"walletAddress\": \"YOUR_ALGORAND_ADDRESS\"}"
```
