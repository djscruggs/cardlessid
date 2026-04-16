# Mobile Client Integration Guide

This guide covers two distinct flows for mobile wallet apps integrating with Cardless ID:

1. **Age Verification** — the wallet responds to a QR code challenge, signs a proof, and submits it. No API key required. This is the primary integration for wallet apps.
2. **Credential Issuance** — the user goes through KYC once to receive a W3C Verifiable Credential on Algorand. Requires an API key. Only needed if you are building a delegated issuer app.

> **🚀 Quick Start**: If you are building a wallet app that responds to age verification requests, start with [Age Verification Flow](#age-verification-flow). If you are building an issuer app that issues credentials, see [MOBILE_API_KEY_SIMPLE.md](./MOBILE_API_KEY_SIMPLE.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Age Verification Flow](#age-verification-flow)
   - [How it works](#how-it-works)
   - [QR Code / Deep Link format](#qr-code--deep-link-format)
   - [Signing a proof](#signing-a-proof)
   - [Submitting the proof](#submitting-the-proof)
   - [React Native example](#react-native-example)
3. [Credential Issuance Flow](#credential-issuance-flow)
   - [Getting Started](#getting-started)
   - [Security Requirements](#security-requirements)
   - [API Authentication](#api-authentication)
   - [Step-by-step](#step-by-step)
   - [API Endpoints](#api-endpoints)
   - [Credential Storage](#credential-storage)
4. [Terms of Service & Penalties](#terms-of-service--penalties)
5. [Rate Limits](#rate-limits)
6. [Error Handling](#error-handling)

---

## Overview

Cardless ID separates two operations:

| Operation | Frequency | API Key needed? | What the wallet does |
|---|---|---|---|
| **Age Verification** | Every time a site checks | ❌ No | Read on-chain credential, sign proof, submit to relay |
| **Credential Issuance** | Once per user | ✅ Yes | Capture ID + selfie, receive W3C credential + NFT |

---

## Age Verification Flow

### How it works

When a website with the Cardless ID JS snippet needs to verify a user's age:

1. The site fetches a signed nonce from `GET /api/v/nonce`
2. The site displays a QR code encoding the nonce and `minAge`
3. The user scans the QR with the Cardless ID wallet app
4. The wallet reads the credential NFT from Algorand (read-only, no gas)
5. The wallet checks whether the birthdate in the credential meets `minAge`
6. The wallet signs a proof with the user's Algorand ed25519 private key
7. The wallet POSTs the proof to `POST /api/v/submit`
8. The site polls `GET /api/v/result/:nonce` and receives the proof

The wallet **never sends personal data**. The proof contains only a wallet address and a boolean.

### QR Code / Deep Link format

The QR code encodes a URL in this format:

```
https://cardlessid.org/app/wallet-verify?nonce=<NONCE>&minAge=<MIN_AGE>
```

On mobile, this opens as a deep link directly into the wallet app. Parse the query params to extract `nonce` and `minAge`.

**Example deep link:**
```
https://cardlessid.org/app/wallet-verify?nonce=eyJqdGkiOiJ...&minAge=21
```

The `nonce` is an HMAC-signed token that expires in **5 minutes**. The wallet must sign and submit the proof before it expires.

### Signing a proof

Build the proof payload and sign it with the user's Algorand private key using `algosdk.signBytes`. The Algorand SDK prepends its standard signing prefix before computing the ed25519 signature.

```typescript
import algosdk from 'algosdk';

interface SignedProofPayload {
  nonce: string;          // The nonce from the QR code
  walletAddress: string;  // The user's Algorand wallet address
  minAge: number;         // Must match what was in the QR code
  meetsRequirement: boolean;
  timestamp: number;      // Date.now()
}

interface SignedProof {
  payload: SignedProofPayload;
  signature: string; // base64url-encoded ed25519 signature
}

function signProof(
  nonce: string,
  minAge: number,
  meetsRequirement: boolean,
  account: algosdk.Account
): SignedProof {
  const payload: SignedProofPayload = {
    nonce,
    walletAddress: algosdk.encodeAddress(account.addr.publicKey),
    minAge,
    meetsRequirement,
    timestamp: Date.now(),
  };

  const message = Buffer.from(JSON.stringify(payload));
  const sigBytes = algosdk.signBytes(message, account.sk);

  return {
    payload,
    signature: Buffer.from(sigBytes).toString('base64url'),
  };
}
```

**Important:** The private key never leaves the wallet. The signature proves the holder of that wallet address made the assertion.

### Determining `meetsRequirement`

Before signing, the wallet must read the credential NFT from Algorand and check the birthdate:

```typescript
async function checkAgeRequirement(
  walletAddress: string,
  minAge: number
): Promise<boolean> {
  // Query Algorand for assets held by walletAddress
  // Find the Cardless ID credential NFT (issued by a registered issuer)
  // Read ARC-69 metadata to get the birthdate hash
  // Compute: Date.now().getFullYear() - birthYear >= minAge
  // Return true if requirement is met, false otherwise
  //
  // This is a read-only Algorand node query — no transaction, no gas.
}
```

If the wallet cannot find a valid credential, it should **not** sign a proof — the user needs to complete credential issuance first.

### Submitting the proof

```typescript
async function submitProof(nonce: string, signedProof: SignedProof): Promise<void> {
  const response = await fetch('https://cardlessid.org/api/v/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce, signedProof }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to submit verification');
  }
}
```

**Response on success:**
```json
{ "success": true }
```

The proof is stored in a 60-second TTL cache. The integrator site polls `GET /api/v/result/:nonce` to retrieve it. After 60 seconds the proof evicts automatically — it contains no personal data.

### React Native example

Complete end-to-end handler for handling a Cardless ID deep link:

```typescript
import algosdk from 'algosdk';

// Called when the app receives a deep link:
// cardlessid://verify?nonce=eyJ...&minAge=21
// or https://cardlessid.org/app/wallet-verify?nonce=eyJ...&minAge=21
async function handleVerificationDeepLink(url: string): Promise<void> {
  const params = new URL(url).searchParams;
  const nonce = params.get('nonce');
  const minAge = parseInt(params.get('minAge') ?? '18', 10);

  if (!nonce) throw new Error('Missing nonce in deep link');

  // Load the user's Algorand account from secure storage
  const account = await loadAccountFromSecureStorage();

  // Read credential from Algorand and check age
  const meetsRequirement = await checkAgeRequirement(account.addr, minAge);

  // Build and sign the proof
  const signedProof = signProof(nonce, minAge, meetsRequirement, account);

  // Submit to Cardless ID relay
  await submitProof(nonce, signedProof);

  // Navigate to result screen
  navigation.navigate('VerificationComplete', { meetsRequirement });
}
```

**Error cases to handle:**

| Error | Cause | Recovery |
|---|---|---|
| 400 `invalid nonce` | Nonce expired (>5 min) or tampered | Ask user to re-scan the QR |
| 400 `signature verification failed` | Wrong key or malformed signature | Check signing implementation |
| 400 `minAge mismatch` | Proof minAge doesn't match nonce minAge | Bug — ensure minAge comes from the QR/nonce |
| 451 | EEA geo-blocking | Show "not available in your region" |

---

## Credential Issuance Flow

This section covers the one-time KYC process that gives a user their credential. You only need this if you are building an app that issues credentials (delegated issuer). Most wallet apps simply read a credential that was already issued.

### Getting Started

To integrate Cardless ID credential issuance:

1. Visit our contact page: https://cardlessid.org/contact
2. Provide:
   - **Organization/Application Name**
   - **Primary Contact Email**
   - **Use Case Description**
   - **Expected Monthly Volume**
   - **Algorand Wallet Address** (optional — we'll generate one if needed)
3. We'll provide:
   - API key for authentication
   - Your unique issuer Algorand wallet address
   - Testnet access for development

### Security Requirements

All mobile clients issuing credentials MUST comply with:

#### Credential Storage

**REQUIREMENT**: Credentials MUST be stored securely and be tamper-proof.

**iOS** — use Keychain:
```swift
import Security

func storeCredential(_ credential: Data, forKey key: String) {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: key,
        kSecValueData as String: credential,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]
    SecItemDelete(query as CFDictionary)
    SecItemAdd(query as CFDictionary, nil)
}
```

**Android** — use EncryptedSharedPreferences:
```kotlin
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val sharedPreferences = EncryptedSharedPreferences.create(
    context, "cardless_credentials", masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
sharedPreferences.edit().putString("credential_id", credentialJson).apply()
```

**What NOT to do:**
- ❌ Store credentials in plain text
- ❌ Use unencrypted UserDefaults or SharedPreferences
- ❌ Log credential contents or API keys

#### Network Security

- All API calls MUST use HTTPS
- Never log API keys in production builds
- Implement certificate pinning (recommended)

#### User Consent

- Obtain explicit consent before identity verification
- Clearly explain what data is collected and how it's used
- Allow users to delete their credentials

### API Authentication

All credential issuance requests require an API key in the `X-API-Key` header:

```http
POST /api/verification/start
Content-Type: application/json
X-API-Key: your_api_key_here
```

> **Note:** The age verification endpoints (`/api/v/*`) do **not** require an API key.

### Step-by-step

#### 1. Start Verification Session

```javascript
const startSession = async () => {
  const response = await fetch('https://cardlessid.org/api/verification/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': YOUR_API_KEY,
    },
    body: JSON.stringify({ provider: 'mock' }), // 'aws-rekognition' in production
  });

  const { sessionId, authToken, expiresAt } = await response.json();
  return { sessionId, authToken };
};
```

#### 2. Capture ID & Selfie

Use the verification provider SDK with the `authToken`. The exact implementation depends on the provider:

```javascript
// Pseudo-code — actual SDK depends on provider
const captureIdentity = async (authToken) => {
  const verificationSDK = new VerificationSDK({ authToken });
  await verificationSDK.captureIDPhoto();
  await verificationSDK.captureSelfie();
  await verificationSDK.submit();
};
```

#### 3. Poll Verification Status

```javascript
const pollStatus = async (sessionId) => {
  const response = await fetch(
    `https://cardlessid.org/api/verification/status/${sessionId}`,
    { headers: { 'X-API-Key': YOUR_API_KEY } }
  );
  const status = await response.json();

  if (status.status === 'completed') {
    return { verificationToken: status.verificationToken, extractedData: status.extractedData };
  } else if (status.status === 'failed') {
    throw new Error(status.error);
  }
  await new Promise((r) => setTimeout(r, 2000));
  return pollStatus(sessionId);
};
```

#### 4. Request Credential

```javascript
const requestCredential = async (verificationToken, extractedData, walletAddress) => {
  const response = await fetch('https://cardlessid.org/api/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': YOUR_API_KEY,
    },
    body: JSON.stringify({
      verificationToken,
      walletAddress,
      firstName: extractedData.firstName,
      lastName: extractedData.lastName,
      birthDate: extractedData.birthDate,
      governmentId: extractedData.governmentId,
      idType: extractedData.idType,
      state: extractedData.state,
    }),
  });

  return response.json(); // { credential, personalData, nft }
};
```

#### 5. Store Credential Securely

```javascript
const storeCredential = async (credential, personalData) => {
  const credentialPackage = {
    credential,      // W3C Verifiable Credential (public)
    personalData,    // Personal data (private — keep encrypted)
    storedAt: new Date().toISOString(),
  };
  await secureStorage.setItem('cardless_credential', credentialPackage);
};
```

### API Endpoints

#### POST /api/verification/start

Start a new KYC verification session.

**Request:**
```json
{ "provider": "mock" }
```

**Response:**
```json
{
  "sessionId": "session_12345",
  "authToken": "auth_token_for_provider_sdk",
  "expiresAt": "2025-01-15T10:30:00Z",
  "provider": "mock",
  "providerSessionId": "provider_session_id"
}
```

#### GET /api/verification/status/:sessionId

**Response (completed):**
```json
{
  "status": "completed",
  "verificationToken": "signed_token_xyz",
  "extractedData": {
    "firstName": "John",
    "lastName": "Doe",
    "birthDate": "1990-01-15",
    "governmentId": "D1234567",
    "idType": "drivers_license",
    "state": "CA"
  }
}
```

#### POST /api/credentials

Issue a W3C Verifiable Credential.

**Request:**
```json
{
  "verificationToken": "signed_token_xyz",
  "walletAddress": "ALGORAND_WALLET_ADDRESS_58_CHARS",
  "firstName": "John",
  "lastName": "Doe",
  "birthDate": "1990-01-15",
  "governmentId": "D1234567",
  "idType": "drivers_license",
  "state": "CA"
}
```

**Response:**
```json
{
  "success": true,
  "credential": {
    "@context": ["https://www.w3.org/ns/credentials/v2", "https://cardlessid.org/credentials/v1"],
    "id": "urn:uuid:...",
    "type": ["VerifiableCredential", "BirthDateCredential"],
    "issuer": { "id": "did:algo:YOUR_ISSUER_ADDRESS" },
    "credentialSubject": { ... },
    "proof": { ... }
  },
  "personalData": { "firstName": "John", "lastName": "Doe", "birthDate": "1990-01-15" },
  "nft": { "assetId": "123456", "requiresOptIn": true }
}
```

### Credential Storage

What to store in secure encrypted storage:

```
Secure Storage
├── credential (W3C VC — safe to share with verifiers)
│   ├── @context, id, type
│   ├── issuer { id: "did:algo:ISSUER" }
│   ├── credentialSubject
│   │   ├── id: "did:algo:USER_WALLET"
│   │   └── compositeHash: "..."
│   └── proof
├── personalData (KEEP PRIVATE — never share without user consent)
│   ├── firstName, lastName, birthDate
│   ├── governmentId, state
└── nft
    └── assetId  (Algorand ASA ID — safe to share)
```

---

## Anti-Spoofing Architecture

The protocol uses two independent layers to prevent a rogue wallet from faking a verification.

### Layer 1 — Cryptographic signature

Every proof is ed25519-signed with the wallet's Algorand private key. The signature covers the full payload including `nonce`, `walletAddress`, `minAge`, `meetsRequirement`, and `timestamp`. Any tampering (e.g. flipping `meetsRequirement` after signing) invalidates the signature.

The server verifies this before storing the proof. The integrator's SDK (`verifyProof`) verifies it again when the proof is picked up.

**What this prevents:** A rogue wallet cannot forge a proof for an address it doesn't control, and cannot tamper with the payload after signing.

**What this does NOT prevent:** A wallet that controls its own private key can sign `meetsRequirement: true` regardless of whether it holds a real credential.

### Layer 2 — On-chain credential check

The integrator's `verifyProofOnChain()` function calls `GET /api/wallet/status/:address` after the signature check. This queries the Algorand blockchain to confirm the wallet holds a valid Cardless ID credential NFT — an ARC-69 NFT issued only after real KYC.

```typescript
import { verifyProofOnChain } from '@cardlessid/verify';

const result = await verifyProofOnChain(proof);
// valid only if: signature valid + timestamp fresh + wallet holds credential NFT
if (result.valid && result.payload.meetsRequirement) {
  grantAccess();
}
```

**What this prevents:** A wallet that generates a fresh keypair and signs `meetsRequirement: true` — it won't have a credential NFT, so the check fails.

### Attack/defense summary

| Attack | Layer 1 (signature) | Layer 2 (on-chain) |
|--------|--------------------|--------------------|
| Tamper payload after signing | Blocks | — |
| Sign with wrong key for claimed address | Blocks | — |
| Sign `meetsRequirement: true` with own key, no credential | Passes | Blocks |
| Replay a proof to a different site | Blocks (nonce mismatch) | — |
| Replay the same proof twice | Blocked by nonce TTL (5 min) | — |

The credential NFT is permanent and public on Algorand — there is no way to fake ownership without controlling the wallet's private key AND having passed real KYC.

---

## Terms of Service & Penalties

### Your Responsibilities

1. **Security**: Implement all required credential storage security measures
2. **Privacy**: Comply with GDPR, CCPA, and applicable data protection laws
3. **User Consent**: Obtain explicit consent before verification
4. **Honest Proofs**: Wallet apps must never sign a false `meetsRequirement`
5. **Reporting**: Report security incidents immediately

### Issuer Registry & Revocation

Each issuer receives their own Algorand wallet address registered in the on-chain Issuer Registry. This enables:

- **Selective Revocation**: Only your issuer can be revoked without affecting others
- **Independent Identity**: Credentials issued under your issuer address
- **Vouching**: Cardless ID vouches for you when you're registered

#### Soft Revocation

- Your API key is revoked; you cannot issue new credentials
- Existing credentials remain valid
- Can be reinstated after issue resolution

#### Hard Revocation (Severe Violations)

- API key and issuer address permanently revoked from the Issuer Registry
- All credentials ever issued by your issuer are invalidated
- Used for: fraud, major security breaches, severe TOS violations

---

## Rate Limits

- **Testnet**: 1000 requests/hour (generous for development)
- **Mainnet**: Varies by plan

> **Note:** The age verification endpoints (`/api/v/*`) are not rate-limited by API key since they require no authentication. Contact us for high-volume usage.

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Invalid request data |
| 401 | Missing or invalid API key |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 451 | Service unavailable in EEA region |
| 500 | Server error |

### Common Errors

```json
{ "error": "Missing X-API-Key header." }           // 401
{ "error": "Invalid API key" }                      // 401
{ "error": "API key has been revoked." }            // 401
{ "error": "invalid nonce" }                        // 400 — nonce expired or tampered
{ "error": "signature verification failed" }        // 400 — bad ed25519 signature
{ "error": "Service not available in your region" } // 451
```

---

## Support

- **Documentation**: https://cardlessid.org/docs
- **Verification Protocol**: https://cardlessid.org/docs/verification-protocol
- **Contact**: https://cardlessid.org/contact

---

## Sample Code

Complete sample implementations:

- iOS (Swift): https://github.com/cardlessid/ios-sdk
- Android (Kotlin): https://github.com/cardlessid/android-sdk
- React Native: https://github.com/cardlessid/react-native-sdk

(Links are placeholders — replace with actual repositories when available)
