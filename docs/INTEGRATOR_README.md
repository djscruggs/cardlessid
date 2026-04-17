# Cardless ID Integrator System

This document describes the age verification integration system for Cardless ID.

## Overview

Integrators embed a JS snippet (or use the Node SDK) to verify a user's age on their site. The wallet app scans a QR code, signs a cryptographic proof, and the integrator receives a verified result — no personal data transmitted.

## Current Architecture (`/api/v/*`)

The current flow is stateless. The server issues a signed nonce; the wallet signs and submits a proof; the integrator polls for the result.

```
Integrator Page          Cardless ID API       User's Wallet
     |                        |                     |
     |-- GET /api/v/nonce --->|                     |
     |<-- signed nonce -------|                     |
     |                        |                     |
     | Display QR code        |                     |
     |=====================================>        |
     |                        |                     |
     |                        |<-- POST /api/v/submit (signed proof)
     |                        |                     |
     |-- GET /api/v/result -->|                     |
     |<-- signedProof --------|                     |
     |                        |                     |
     | Verify proof locally   |                     |
```

### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v/nonce` | GET | Issue a signed nonce (no API key needed) |
| `/api/v/submit` | POST | Wallet submits signed proof |
| `/api/v/result/:nonce` | GET | Integrator polls for proof |

### Verifying the proof

Use `@cardlessid/verify` to verify the proof on the integrator side:

```typescript
import { verifyProofOnChain } from '@cardlessid/verify';

const result = await verifyProofOnChain(proof);
if (result.valid && result.payload.meetsRequirement) {
  grantAccess();
}
```

`verifyProofOnChain` checks both the ed25519 signature **and** that the wallet holds a valid credential NFT on Algorand. See [MOBILE_CLIENT_INTEGRATION.md](./MOBILE_CLIENT_INTEGRATION.md) for the full anti-spoofing architecture.

---

## Legacy System (`/api/integrator/challenge/*`)

The challenge-response system backed by Firebase Realtime Database is still operational but is no longer the recommended integration path. It is maintained for backwards compatibility.

### Legacy endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/integrator/challenge/create` | POST | Create challenge (requires API key in body) |
| `/api/integrator/challenge/verify/:id` | GET | Poll result (requires `X-API-Key` header) |
| `/api/integrator/challenge/details/:id` | GET | Public challenge info |
| `/api/integrator/challenge/respond` | POST | Wallet submits response |

New integrations should use `/api/v/*` instead.

---

## Credential Structure

Each verified credential on-chain includes:

- `credentialSubject.compositeHash` — unique identity hash (for duplicate detection)
- `evidence` — W3C verification metadata (fraud detection, OCR confidence, biometric scores)
- `proof` — ed25519 cryptographic signature

### System Attestation

Credentials issued after October 2025 include a `service` array:

```json
"service": [{
  "id": "#system-attestation",
  "type": "SystemAttestation",
  "serviceEndpoint": "https://github.com/owner/repo/commit/abc123"
}]
```

This links the credential to the exact code version that issued it.

---

## Node.js SDK

Located in `sdk/node/`:

- `cardlessid-verifier.js` — main SDK
- `cardlessid-verifier.d.ts` — TypeScript types

```javascript
const CardlessID = require('@cardlessid/verifier');

const verifier = new CardlessID({
  apiKey: process.env.CARDLESSID_API_KEY,
});

const challenge = await verifier.createChallenge({ minAge: 21 });
displayQRCode(challenge.qrCodeUrl);

const result = await verifier.pollChallenge(challenge.challengeId);
if (result.verified) {
  console.log('User verified as 21+');
}
```

See `sdk/examples/simple-express/` for a complete Express.js example.

---

## Support

- Docs: https://cardlessid.org/docs
- Contact: https://cardlessid.org/contact
- GitHub: https://github.com/djscruggs/cardlessid
