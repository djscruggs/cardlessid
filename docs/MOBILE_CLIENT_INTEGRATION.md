# Mobile Client Integration Guide

This guide explains how to integrate CardlessID's identity verification and credential issuance into your mobile application.

> **🚀 Quick Start**: We use a simple single API key system. See [MOBILE_API_KEY_SIMPLE.md](./MOBILE_API_KEY_SIMPLE.md) for 2-minute setup.

## Overview

CardlessID provides a complete identity verification and credential issuance system that mobile apps can integrate via REST API. You'll receive an API key that allows you to issue verifiable credentials on the Algorand blockchain.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Security Requirements](#security-requirements)
3. [API Authentication](#api-authentication)
4. [Integration Flow](#integration-flow)
5. [API Endpoints](#api-endpoints)
6. [Credential Storage](#credential-storage)
7. [Terms of Service & Penalties](#terms-of-service--penalties)
8. [Rate Limits](#rate-limits)
9. [Error Handling](#error-handling)

---

## Getting Started

### Request an API Key

To integrate Cardless ID into your mobile application:

1. Visit our contact page: https://cardlessid.org/contact
2. Provide the following information:
   - **Organization/Application Name**: Your company or app name
   - **Primary Contact Email**: Technical contact email
   - **Use Case Description**: How you plan to use Cardless ID
   - **Expected Monthly Volume**: Estimated number of verifications per month
   - **Algorand Wallet Address** (optional): If you have an existing Algorand wallet, provide the address. Otherwise, we'll generate one for you.

3. We'll review your application and provide:
   - API key for authentication
   - Your unique issuer Algorand wallet address
   - Access to testnet for development
   - Documentation and sample code

### Development & Testing

- **Testnet**: Use testnet for development and testing (free)
- **Mainnet**: Contact us when ready to deploy to production

---

## Security Requirements

All mobile clients MUST comply with these security requirements:

### 1. Credential Storage Security

**REQUIREMENT**: Credentials MUST be stored securely and be tamper-proof.

#### iOS Implementation:

```swift
// Use iOS Keychain for secure storage
import Security

func storeCredential(_ credential: Data, forKey key: String) {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: key,
        kSecValueData as String: credential,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]

    SecItemDelete(query as CFDictionary) // Remove old credential
    let status = SecItemAdd(query as CFDictionary, nil)

    guard status == errSecSuccess else {
        print("Error storing credential: \\(status)")
        return
    }
}
```

#### Android Implementation:

```kotlin
// Use Android Keystore for secure storage
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val sharedPreferences = EncryptedSharedPreferences.create(
    context,
    "cardless_credentials",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

// Store credential
sharedPreferences.edit()
    .putString("credential_id", credentialJson)
    .apply()
```

#### Tamper Detection:

```javascript
// Verify credential integrity using HMAC
const crypto = require("crypto");

function verifyCredentialIntegrity(credential, expectedHmac, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(credential));
  const calculatedHmac = hmac.digest("hex");

  if (calculatedHmac !== expectedHmac) {
    throw new Error("Credential has been tampered with!");
  }

  return true;
}
```

**What NOT to do:**

- ❌ Store credentials in plain text files
- ❌ Store credentials in UserDefaults (iOS) or SharedPreferences (Android) without encryption
- ❌ Store credentials in app sandbox without encryption
- ❌ Transmit credentials over unencrypted connections
- ❌ Log credential contents

### 2. Network Security

- All API calls MUST use HTTPS
- Implement certificate pinning (recommended)
- Never log API keys in production builds
- Implement request/response encryption for sensitive data

### 3. User Consent

- Obtain explicit user consent before identity verification
- Clearly explain what data is collected and how it's used
- Provide privacy policy and terms of service
- Allow users to delete their credentials

---

## API Authentication

All API requests must include your API key in the `X-API-Key` header.

### Request Headers:

```http
POST /api/verification/start
Host: cardlessid.org
Content-Type: application/json
X-API-Key: your_api_key_here
```

### Example (cURL):

```bash
curl -X POST https://cardlessid.org/api/verification/start \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{"provider": "mock"}'
```

### Example (JavaScript/React Native):

```javascript
const response = await fetch("https://cardlessid.org/api/verification/start", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": YOUR_API_KEY,
  },
  body: JSON.stringify({ provider: "mock" }),
});

const data = await response.json();
```

---

## Integration Flow

### Complete Verification & Credential Issuance Flow:

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│ Mobile App  │      │  Cardless ID │      │  Verification│
│             │      │     API     │      │   Provider   │
└──────┬──────┘      └──────┬──────┘      └──────┬───────┘
       │                    │                     │
       │ 1. Start Session   │                     │
       ├───────────────────>│                     │
       │  X-API-Key header  │                     │
       │                    │                     │
       │ 2. Session Info    │                     │
       │<───────────────────┤                     │
       │  sessionId,        │                     │
       │  authToken         │                     │
       │                    │                     │
       │ 3. User captures ID photo & selfie       │
       │    (using provider SDK with authToken)   │
       ├──────────────────────────────────────────>
       │                    │                     │
       │ 4. Provider processes & verifies         │
       │                    │<────────────────────┤
       │                    │  Webhook callback   │
       │                    │                     │
       │ 5. Poll status     │                     │
       ├───────────────────>│                     │
       │                    │                     │
       │ 6. Verified data   │                     │
       │<───────────────────┤                     │
       │  + verificationToken                     │
       │                    │                     │
       │ 7. Request credential with wallet address│
       ├───────────────────>│                     │
       │  verificationToken,│                     │
       │  walletAddress,    │                     │
       │  identity data     │                     │
       │                    │                     │
       │ 8. W3C Credential  │                     │
       │<───────────────────┤                     │
       │  + NFT on blockchain                     │
       │                    │                     │
       │ 9. Store securely  │                     │
       │  (encrypted)       │                     │
       │                    │                     │
```

### Step-by-Step:

#### 1. Start Verification Session

```javascript
const startSession = async () => {
  const response = await fetch(
    "https://cardlessid.org/api/verification/start",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": YOUR_API_KEY,
      },
      body: JSON.stringify({
        provider: "mock", // or 'aws-rekognition' in production
      }),
    }
  );

  const { sessionId, authToken, expiresAt } = await response.json();
  return { sessionId, authToken };
};
```

#### 2. Capture ID & Selfie

Use the verification provider's SDK with the `authToken`:

```javascript
// Example pseudo-code (actual implementation depends on provider)
const captureIdentity = async (authToken) => {
  // Initialize provider SDK
  const verificationSDK = new VerificationSDK({ authToken });

  // Guide user to capture ID photo
  const idPhoto = await verificationSDK.captureIDPhoto();

  // Guide user to capture selfie
  const selfie = await verificationSDK.captureSelfie();

  // SDK uploads to provider and triggers processing
  await verificationSDK.submit();
};
```

#### 3. Poll Verification Status

```javascript
const pollStatus = async (sessionId) => {
  const response = await fetch(
    `https://cardlessid.org/api/verification/status/${sessionId}`,
    {
      headers: { "X-API-Key": YOUR_API_KEY },
    }
  );

  const status = await response.json();

  if (status.status === "completed") {
    return {
      verificationToken: status.verificationToken,
      extractedData: status.extractedData,
    };
  } else if (status.status === "failed") {
    throw new Error(status.error);
  } else {
    // Still processing, poll again in 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return pollStatus(sessionId);
  }
};
```

#### 4. Request Credential

```javascript
const requestCredential = async (
  verificationToken,
  extractedData,
  walletAddress
) => {
  const response = await fetch("https://cardlessid.org/api/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": YOUR_API_KEY,
    },
    body: JSON.stringify({
      verificationToken,
      walletAddress,
      // Re-submit extracted data for anti-tampering verification
      firstName: extractedData.firstName,
      lastName: extractedData.lastName,
      birthDate: extractedData.birthDate,
      governmentId: extractedData.governmentId,
      idType: extractedData.idType,
      state: extractedData.state,
    }),
  });

  const { credential, personalData, nft } = await response.json();

  return { credential, personalData, nft };
};
```

#### 5. Store Credential Securely

```javascript
const storeCredential = async (credential, personalData) => {
  // Create credential package
  const credentialPackage = {
    credential, // W3C Verifiable Credential (public)
    personalData, // Unhashed personal data (private)
    storedAt: new Date().toISOString(),
  };

  // Generate HMAC for tamper detection
  const hmac = generateHMAC(credentialPackage, SECRET_KEY);

  // Store encrypted in secure storage
  await secureStorage.setItem("cardless_credential", {
    data: credentialPackage,
    hmac,
  });
};
```

---

## API Endpoints

### POST /api/verification/start

Start a new verification session.

**Headers:**

- `X-API-Key`: Your API key (required)
- `Content-Type`: application/json

**Request Body:**

```json
{
  "provider": "mock"
}
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

### GET /api/verification/status/:sessionId

Check verification status.

**Headers:**

- `X-API-Key`: Your API key (required)

**Response (pending):**

```json
{
  "status": "pending",
  "message": "Verification in progress"
}
```

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

### POST /api/credentials

Issue a W3C Verifiable Credential.

**Headers:**

- `X-API-Key`: Your API key (required)
- `Content-Type`: application/json

**Request Body:**

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
    "@context": [...],
    "id": "urn:uuid:...",
    "type": ["VerifiableCredential", "BirthDateCredential"],
    "issuer": { "id": "did:algo:YOUR_ISSUER_ADDRESS" },
    "credentialSubject": { ... },
    "proof": { ... }
  },
  "personalData": {
    "firstName": "John",
    "lastName": "Doe",
    "birthDate": "1990-01-15"
  },
  "nft": {
    "assetId": "123456",
    "requiresOptIn": true
  }
}
```

---

## Credential Storage

### What to Store:

1. **W3C Verifiable Credential** (public portion)
   - Contains issuer DID, subject DID, composite hash
   - Can be shared with verifiers
   - Includes cryptographic proof

2. **Personal Data** (private portion)
   - Full name, birth date, etc.
   - Keep encrypted in secure storage
   - Only share when user explicitly consents

3. **NFT Asset ID**
   - Algorand blockchain asset ID
   - Proves credential authenticity on-chain
   - Can be queried by verifiers

### Storage Architecture:

```
Secure Storage (Encrypted)
├── credential
│   ├── @context
│   ├── id
│   ├── issuer { id: "did:algo:YOUR_ISSUER" }
│   ├── credentialSubject
│   │   ├── id: "did:algo:USER_WALLET"
│   │   └── compositeHash: "..."
│   └── proof
├── personalData (KEEP PRIVATE)
│   ├── firstName
│   ├── lastName
│   ├── birthDate
│   ├── governmentId
│   └── state
└── nft
    └── assetId
```

---

## Terms of Service & Penalties

### Your Responsibilities:

1. **Security**: Implement all required security measures for credential storage
2. **Privacy**: Comply with data protection regulations (GDPR, CCPA, etc.)
3. **User Consent**: Obtain explicit consent before verification
4. **Compliance**: Follow Cardless ID Terms of Service
5. **Reporting**: Report security incidents immediately

### Issuer Registry & Revocation:

Each mobile client receives their own **issuer address** registered in the on-chain **Issuer Registry**. This allows:

- **Independent Identity**: Your credentials are issued under your issuer address
- **Vouching System**: Cardless ID vouches for your issuer when you're added
- **Selective Revocation**: Only your issuer can be revoked without affecting others

### Penalty System:

If you violate Terms of Service or experience security breaches:

#### Soft Revocation:

- Your API key is revoked
- You cannot issue new credentials
- **Existing credentials remain valid**
- Can be reinstated after issue resolution

#### Hard Revocation (Severe Violations):

- Your API key is permanently revoked
- Your issuer address is revoked in the Issuer Registry
- **ALL credentials ever issued by your issuer are invalidated**
- Cannot be easily reversed (requires new issuer address)
- Used for: fraud, major security breaches, severe TOS violations

### Examples of Violations:

- Storing credentials in plain text
- Sharing API keys
- Issuing fraudulent credentials
- Violating user privacy
- Data breaches due to negligence
- Not implementing required security measures

**We will notify you before hard revocation except in cases of active fraud or severe security incidents.**

---

## Rate Limits

Rate limits are configured per API key. Default limits:

- **Testnet**: 1000 requests per hour (generous for development)
- **Mainnet**: Varies by plan (contact us for custom limits)

### Rate Limit Headers:

Response headers include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642089600
```

### Rate Limit Exceeded:

```json
{
  "error": "Rate limit exceeded. Maximum 1000 requests per hour."
}
```

**HTTP Status**: 429 Too Many Requests

---

## Error Handling

### HTTP Status Codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Errors:

#### Missing API Key:

```json
{
  "error": "Missing X-API-Key header. Mobile clients must provide an API key."
}
```

#### Invalid API Key:

```json
{
  "error": "Invalid API key"
}
```

#### Revoked API Key:

```json
{
  "error": "API key has been revoked. Reason: Security violation. Contact support for assistance."
}
```

#### Verification Failed:

```json
{
  "error": "Identity verification failed",
  "details": "Face match confidence too low"
}
```

---

## Support

- **Documentation**: https://cardlessid.org/docs
- **Contact**: https://cardlessid.org/contact
- **Status Page**: https://status.cardlessid.org (coming soon)

---

## Sample Code

Complete sample implementations are available:

- iOS (Swift): https://github.com/cardlessid/ios-sdk
- Android (Kotlin): https://github.com/cardlessid/android-sdk
- React Native: https://github.com/cardlessid/react-native-sdk

(Links are placeholders - replace with actual repositories when available)
