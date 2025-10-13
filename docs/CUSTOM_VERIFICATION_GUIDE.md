# Custom Verification Provider Guide

## Overview

Cardless ID uses a **verification provider architecture** that allows you to implement custom identity verification flows. This guide explains how to build your own verification provider to issue Cardless ID credentials using your preferred verification method.

## Table of Contents

1. [What is a Verification Provider?](#what-is-a-verification-provider)
2. [Provider Types](#provider-types)
3. [Architecture Overview](#architecture-overview)
4. [Building a Full Verification Provider](#building-a-full-verification-provider)
5. [Building a Delegated Verification Provider](#building-a-delegated-verification-provider)
6. [API Reference](#api-reference)
7. [Examples](#examples)

---

## What is a Verification Provider?

A verification provider is a module that handles the identity verification process and returns verified identity data. Cardless ID then uses this data to issue a W3C Verifiable Credential on the Algorand blockchain.

**Key responsibilities:**

- Verify user identity through your chosen method
- Return standardized identity data
- Provide verification quality metrics
- Handle errors and edge cases

---

## Provider Types

### 1. Full Verification Provider

A **full verification provider** implements a complete identity verification flow, similar to the default custom verification flow. This typically includes:

- **Document capture** - Photo of government ID (driver's license, passport, etc.)
- **OCR/Data extraction** - Extract name, date of birth, document number
- **Fraud detection** - Check for fake or altered documents
- **Biometric verification** - Selfie capture and face matching
- **Liveness detection** - Ensure real person, not a photo

**Use cases:**

- Cloud-based verification (e.g., Stripe Identity, Persona, Onfido)
- Custom ML-based verification
- Hardware-based verification (NFC passport readers)
- Manual review workflows

### 2. Delegated Verification Provider

A **delegated verification provider** issues credentials based on existing verification from a trusted authority. The provider trusts that verification has already occurred and simply signs the credential.

**Use cases:**

- Banks issuing credentials for their customers
- Government agencies (DMV, Social Security Administration)
- Universities issuing student credentials
- Employers issuing employee credentials
- Healthcare providers issuing patient credentials

**Authentication:**

- API key-based authentication
- OAuth/OIDC integration
- Mutual TLS
- IP allowlisting

---

## Architecture Overview

### Provider Interface

All verification providers must implement the `VerificationProvider` interface:

```typescript
interface VerificationProvider {
  name: string;

  // Create a new verification session
  createSession(sessionId: string): Promise<{
    authToken: string;
    providerSessionId: string;
  }>;

  // Process verification results
  processVerification(
    sessionId: string,
    providerData: any
  ): Promise<VerifiedIdentity>;

  // Optional: Handle webhooks from provider
  handleWebhook?(payload: any): Promise<void>;
}

interface VerifiedIdentity {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  documentNumber?: string;
  documentType?: "drivers_license" | "passport" | "government_id";
  issuingCountry?: string;
  issuingState?: string;
  compositeHash: string; // Unique identifier for this person

  // Verification quality metrics
  evidence: {
    fraudDetection?: {
      performed: boolean;
      passed: boolean;
      signals: string[];
    };
    documentAnalysis?: {
      bothSidesAnalyzed: boolean;
      lowConfidenceFields: string[];
      qualityLevel: "high" | "medium" | "low";
    };
    biometricVerification?: {
      performed: boolean;
      faceMatch: boolean;
      faceMatchConfidence?: number;
      liveness: boolean;
      livenessConfidence?: number;
    };
  };
}
```

### Directory Structure

```
app/
├── utils/
│   └── verification-providers/
│       ├── index.ts                    # Provider registry
│       ├── base-provider.ts            # Base class (optional)
│       ├── mock-provider.ts            # Development/testing provider
│       ├── custom-provider.ts          # Default custom verification
│       ├── stripe-identity-provider.ts # Example: Stripe Identity
│       └── delegated-provider.ts       # Example: Delegated auth
└── routes/
    └── api/
        ├── verification/
        │   ├── start.ts                # Create session
        │   ├── webhook.ts              # Handle provider webhooks
        │   └── status.$id.ts           # Check verification status
        └── custom-verification/
            ├── upload-id.ts            # Custom flow: ID upload
            └── upload-selfie.ts        # Custom flow: Selfie upload
```

---

## Building a Full Verification Provider

### Step 1: Create Provider File

Create a new file in `app/utils/verification-providers/your-provider.ts`:

```typescript
import type {
  VerificationProvider,
  VerifiedIdentity,
} from "~/types/verification";
import { generateCompositeHash } from "~/utils/composite-hash.server";

export class YourVerificationProvider implements VerificationProvider {
  name = "your-provider";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.YOUR_PROVIDER_API_KEY || "";
    if (!this.apiKey) {
      console.warn("[YourProvider] API key not configured");
    }
  }

  async createSession(sessionId: string): Promise<{
    authToken: string;
    providerSessionId: string;
  }> {
    // Call your provider's API to create a verification session
    const response = await fetch("https://api.yourprovider.com/verifications", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Your provider's required fields
        callback_url: `${process.env.BASE_URL}/api/verification/webhook`,
        metadata: { cardless_session_id: sessionId },
      }),
    });

    const data = await response.json();

    return {
      authToken: data.client_secret, // Token for mobile SDK
      providerSessionId: data.id,
    };
  }

  async processVerification(
    sessionId: string,
    providerData: any
  ): Promise<VerifiedIdentity> {
    // Fetch verification results from your provider
    const response = await fetch(
      `https://api.yourprovider.com/verifications/${providerData.verification_id}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );

    const verification = await response.json();

    // Map provider data to Cardless ID format
    const identity: VerifiedIdentity = {
      firstName: verification.user.first_name,
      lastName: verification.user.last_name,
      dateOfBirth: verification.user.date_of_birth,
      documentNumber: verification.document.number,
      documentType: this.mapDocumentType(verification.document.type),
      issuingCountry: verification.document.country,
      compositeHash: generateCompositeHash(
        verification.user.first_name,
        verification.user.last_name,
        verification.user.date_of_birth
      ),
      evidence: {
        fraudDetection: {
          performed: true,
          passed: verification.fraud_check.passed,
          signals: verification.fraud_check.signals || [],
        },
        documentAnalysis: {
          bothSidesAnalyzed: verification.document.sides_captured === 2,
          lowConfidenceFields: [],
          qualityLevel: verification.document.quality,
        },
        biometricVerification: {
          performed: true,
          faceMatch: verification.biometric.match,
          faceMatchConfidence: verification.biometric.confidence,
          liveness: verification.biometric.liveness_passed,
          livenessConfidence: verification.biometric.liveness_confidence,
        },
      },
    };

    return identity;
  }

  async handleWebhook(payload: any): Promise<void> {
    // Handle webhook from your provider
    console.log("[YourProvider] Webhook received:", payload.type);

    if (payload.type === "verification.completed") {
      // Update verification session in database
      const sessionId = payload.metadata.cardless_session_id;
      const identity = await this.processVerification(sessionId, payload);

      // Store in database
      await updateVerificationSession(sessionId, {
        status: "completed",
        verifiedData: identity,
      });
    }
  }

  private mapDocumentType(
    providerType: string
  ): "drivers_license" | "passport" | "government_id" {
    // Map your provider's document types to Cardless ID types
    const mapping: Record<string, any> = {
      driving_license: "drivers_license",
      passport: "passport",
      id_card: "government_id",
    };
    return mapping[providerType] || "government_id";
  }
}
```

### Step 2: Register Provider

Add your provider to `app/utils/verification-providers/index.ts`:

```typescript
import { YourVerificationProvider } from "./your-provider";

const providers = {
  mock: new MockProvider(),
  custom: new CustomProvider(),
  "your-provider": new YourVerificationProvider(),
};

export function getProvider(name?: string): VerificationProvider {
  const providerName = name || "mock";
  const provider = providers[providerName];

  if (!provider) {
    console.warn(`Provider "${providerName}" not found, using mock`);
    return providers.mock;
  }

  return provider;
}
```

### Step 3: Configure Environment

Add your provider's credentials to `.env`:

```bash
YOUR_PROVIDER_API_KEY=sk_live_xxxxxxxxxxxxx
```

### Step 4: Use Provider

Update your frontend to specify the provider:

```typescript
// Start verification with your provider
const response = await fetch("/api/verification/start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ provider: "your-provider" }),
});

const { authToken, sessionId } = await response.json();

// Use authToken with your provider's SDK
```

---

## Building a Delegated Verification Provider

Delegated providers trust that identity verification has already occurred through another system (e.g., bank KYC, DMV records).

### Step 1: Create Delegated Provider

```typescript
import type {
  VerificationProvider,
  VerifiedIdentity,
} from "~/types/verification";
import { generateCompositeHash } from "~/utils/composite-hash.server";
import { verifyApiKey } from "~/utils/auth.server";

export class DelegatedVerificationProvider implements VerificationProvider {
  name = "delegated";

  // No session needed - verification is instant
  async createSession(sessionId: string): Promise<{
    authToken: string;
    providerSessionId: string;
  }> {
    return {
      authToken: "", // Not used
      providerSessionId: sessionId,
    };
  }

  async processVerification(
    sessionId: string,
    providerData: any
  ): Promise<VerifiedIdentity> {
    // Verify API key from trusted issuer
    const apiKey = providerData.apiKey;
    const issuer = await verifyApiKey(apiKey);

    if (!issuer) {
      throw new Error("Invalid API key");
    }

    // Trust the provided identity data
    const { firstName, lastName, dateOfBirth, documentNumber } = providerData;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth) {
      throw new Error("Missing required identity fields");
    }

    // Generate composite hash
    const compositeHash = generateCompositeHash(
      firstName,
      lastName,
      dateOfBirth
    );

    // Return verified identity
    const identity: VerifiedIdentity = {
      firstName,
      lastName,
      dateOfBirth,
      documentNumber,
      documentType: providerData.documentType || "government_id",
      issuingCountry: providerData.issuingCountry || "US",
      compositeHash,
      evidence: {
        // Delegated verification - trust the issuer
        fraudDetection: {
          performed: false,
          passed: true,
          signals: [],
        },
        documentAnalysis: {
          bothSidesAnalyzed: false,
          lowConfidenceFields: [],
          qualityLevel: "high", // Assume high quality from trusted issuer
        },
        biometricVerification: {
          performed: false,
          faceMatch: false,
          liveness: false,
        },
      },
    };

    return identity;
  }
}
```

### Step 2: Create API Endpoint

Create `app/routes/api/delegated-verification/issue.ts`:

```typescript
import type { ActionFunctionArgs } from "react-router";
import { getProvider } from "~/utils/verification-providers";
import {
  createVerificationSession,
  updateVerificationSession,
} from "~/utils/verification.server";
import { issueCredential } from "~/utils/credential-issuance.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { apiKey, walletAddress, identity } = body;

    // Validate API key
    if (!apiKey) {
      return Response.json({ error: "API key required" }, { status: 401 });
    }

    // Validate wallet address
    if (!walletAddress || !/^[A-Z2-7]{58}$/.test(walletAddress)) {
      return Response.json(
        { error: "Invalid Algorand wallet address" },
        { status: 400 }
      );
    }

    // Create session
    const session = await createVerificationSession(
      "delegated",
      `delegated_${Date.now()}`
    );

    // Process verification
    const provider = getProvider("delegated");
    const verifiedIdentity = await provider.processVerification(session.id, {
      apiKey,
      ...identity,
    });

    // Update session
    await updateVerificationSession(session.id, {
      status: "completed",
      verifiedData: verifiedIdentity,
    });

    // Issue credential to wallet
    const credential = await issueCredential(
      walletAddress,
      verifiedIdentity,
      session.id
    );

    return Response.json({
      success: true,
      credentialId: credential.id,
      walletAddress,
      compositeHash: verifiedIdentity.compositeHash,
    });
  } catch (error) {
    console.error("[Delegated Verification] Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### Step 3: Create API Keys for Issuers

Create a utility to manage API keys for trusted issuers:

```typescript
// app/utils/auth.server.ts
import { getDatabase, ref, get } from "firebase/database";
import { firebaseApp } from "~/firebase.config";

interface Issuer {
  id: string;
  name: string;
  type: "bank" | "government" | "employer" | "university" | "healthcare";
  apiKey: string;
  active: boolean;
  createdAt: number;
}

export async function verifyApiKey(apiKey: string): Promise<Issuer | null> {
  const db = getDatabase(firebaseApp);
  const issuersRef = ref(db, "issuers");
  const snapshot = await get(issuersRef);

  if (!snapshot.exists()) {
    return null;
  }

  const issuers: Record<string, Issuer> = snapshot.val();
  const issuer = Object.values(issuers).find(
    (i) => i.apiKey === apiKey && i.active
  );

  return issuer || null;
}
```

### Step 4: Usage Example

```typescript
// Bank or DMV issues credential
const response = await fetch(
  "https://cardlessid.com/api/delegated-verification/issue",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey: "sk_live_bank_xxxxxxxxxxxxxx",
      walletAddress:
        "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
      identity: {
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: "1990-01-15",
        documentNumber: "D1234567",
        documentType: "drivers_license",
        issuingCountry: "US",
        issuingState: "CA",
      },
    }),
  }
);

const result = await response.json();
console.log("Credential issued:", result.credentialId);
```

---

## API Reference

### POST /api/verification/start

Create a new verification session.

**Request:**

```json
{
  "provider": "your-provider" // optional, defaults to "mock"
}
```

**Response:**

```json
{
  "sessionId": "session_1234567890_abc123",
  "authToken": "client_secret_xxx",
  "expiresAt": "2025-01-15T10:30:00Z",
  "provider": "your-provider"
}
```

### GET /api/verification/status/:sessionId

Check verification session status.

**Response:**

```json
{
  "sessionId": "session_1234567890_abc123",
  "status": "pending" | "completed" | "failed",
  "provider": "your-provider",
  "verifiedData": { /* VerifiedIdentity if completed */ }
}
```

### POST /api/delegated-verification/issue

Issue credential via delegated verification.

**Request:**

```json
{
  "apiKey": "sk_live_xxxxxxxxxxxxx",
  "walletAddress": "ALGORAND_ADDRESS_58_CHARS",
  "identity": {
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-15",
    "documentNumber": "D1234567"
  }
}
```

**Response:**

```json
{
  "success": true,
  "credentialId": "cred_1234567890",
  "walletAddress": "ALGORAND_ADDRESS",
  "compositeHash": "hash_value"
}
```

---

## Examples

### Example 1: Stripe Identity Provider

See `app/utils/verification-providers/stripe-identity-provider.ts` for a complete implementation using Stripe Identity.

### Example 2: Manual Review Provider

See `app/utils/verification-providers/manual-review-provider.ts` for an implementation with admin review workflow.

### Example 3: Bank Delegated Provider

See `app/utils/verification-providers/bank-delegated-provider.ts` for an example of bank-issued credentials.

---

## Security Considerations

1. **API Key Management**
   - Store API keys in environment variables
   - Rotate keys regularly
   - Use separate keys for dev/staging/production

2. **Webhook Verification**
   - Verify webhook signatures from providers
   - Use HTTPS for all webhook endpoints
   - Implement replay protection

3. **Data Retention**
   - Delete ID photos after verification
   - Store only minimal PII
   - Comply with GDPR/CCPA requirements

4. **Fraud Prevention**
   - Implement rate limiting
   - Monitor for duplicate composite hashes
   - Log all verification attempts

5. **Delegated Verification Security**
   - Whitelist trusted issuer IP addresses
   - Require mutual TLS for high-value issuers
   - Audit all credential issuance
   - Implement revocation mechanisms

---

## Testing

### Test with Mock Provider

```bash
# Use mock provider for development
curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -d '{"provider": "mock"}'
```

### Test Delegated Verification

```bash
# Create test API key in Firebase
# Then issue credential
curl -X POST http://localhost:5173/api/delegated-verification/issue \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "test_api_key",
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "identity": {
      "firstName": "Test",
      "lastName": "User",
      "dateOfBirth": "1990-01-01"
    }
  }'
```

---

## Support

For questions or issues:

- GitHub Issues: https://github.com/your-repo/cardlessid/issues
- Email: support@cardlessid.com
- Docs: https://cardlessid.com/docs

---

## License

MIT License - See LICENSE file for details
