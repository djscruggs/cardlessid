# Delegated Verification Guide

## Overview

**Delegated verification** allows trusted issuers (banks, government agencies, employers, universities, etc.) to issue Cardless ID credentials to their users without requiring them to go through a full identity verification flow.

This is ideal for organizations that have already verified their users' identities and want to provide them with portable, privacy-preserving digital credentials.

---

## How It Works

```
┌─────────────┐                           ┌──────────────┐
│   Bank/DMV  │                           │  Cardless ID  │
│   (Issuer)  │                           │   Platform   │
└─────────────┘                           └──────────────┘
       │                                          │
       │  1. Request API Key                     │
       │─────────────────────────────────────────>│
       │                                          │
       │  2. Receive API Key                     │
       │<─────────────────────────────────────────│
       │                                          │
       │                                          │
       │  3. POST /api/delegated-verification/issue
       │     - API Key                            │
       │     - User's wallet address              │
       │     - Identity data                      │
       │─────────────────────────────────────────>│
       │                                          │
       │                              4. Verify API key
       │                              5. Generate credential
       │                              6. Store on Algorand
       │                                          │
       │  7. Return credential ID                 │
       │<─────────────────────────────────────────│
       │                                          │
       │  8. Notify user                          │
       │     "Your Cardless ID is ready!"          │
       │                                          │
```

---

## Use Cases

### 1. Banks (KYC Completed)

Banks that have completed Know Your Customer (KYC) verification can issue Cardless ID credentials to their account holders.

**Benefits:**

- Users don't need to verify again
- Bank maintains trust relationship
- Users get portable identity credential
- Privacy-preserving age verification

**Example:** Chase Bank issues Cardless ID to verified customers, allowing them to prove age for online purchases without sharing banking information.

### 2. Government Agencies (DMV, Social Security)

Government agencies that issue identity documents can directly issue digital credentials.

**Benefits:**

- Highest level of trust
- No duplicate verification needed
- Instant issuance
- Reduces fraud

**Example:** California DMV issues Cardless ID when renewing driver's license, providing digital age verification.

### 3. Universities (Student Credentials)

Universities can issue credentials to enrolled students for age verification and student discounts.

**Benefits:**

- Verify student status
- Age verification for events
- Privacy-preserving
- Works off-campus

**Example:** Stanford issues Cardless ID to all students, used for campus events and online student discounts.

### 4. Employers (Employee Verification)

Employers can issue credentials to employees for workplace access and benefits.

**Benefits:**

- Prove employment status
- Access control
- Benefits verification
- Privacy-preserving

**Example:** Google issues Cardless ID to employees for building access and corporate discounts.

### 5. Healthcare Providers

Healthcare organizations can issue credentials to patients for age-gated services.

**Benefits:**

- HIPAA-compliant age verification
- No sharing of health data
- Portable credential
- Privacy-preserving

**Example:** Kaiser Permanente issues Cardless ID to patients for prescription refills requiring age verification.

---

## Getting Started

### Step 1: Request API Key

Contact Cardless ID to request an API key for your organization:

- **Email:** partnerships@cardlessid.com
- **Subject:** "Delegated Verification API Key Request"

Include:

- Organization name
- Organization type (bank, government, employer, etc.)
- Contact email
- Website
- Use case description
- Expected volume

### Step 2: Receive Credentials

You'll receive:

- **API Key:** `sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Documentation:** This guide
- **Sandbox API Key:** For testing

### Step 3: Integrate API

Use the API endpoint to issue credentials to your users.

---

## API Reference

### Endpoint

```
POST https://cardlessid.com/api/delegated-verification/issue
```

### Authentication

Include your API key in the request body.

### Request Body

```json
{
  "apiKey": "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "walletAddress": "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
  "identity": {
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-15",
    "documentNumber": "D1234567",
    "documentType": "drivers_license",
    "issuingCountry": "US",
    "issuingState": "CA"
  }
}
```

### Request Fields

| Field                     | Type   | Required | Description                                             |
| ------------------------- | ------ | -------- | ------------------------------------------------------- |
| `apiKey`                  | string | Yes      | Your API key from Cardless ID                           |
| `walletAddress`           | string | Yes      | User's Algorand wallet address (58 characters)          |
| `identity.firstName`      | string | Yes      | User's first name                                       |
| `identity.lastName`       | string | Yes      | User's last name                                        |
| `identity.dateOfBirth`    | string | Yes      | User's date of birth (YYYY-MM-DD format)                |
| `identity.documentNumber` | string | No       | ID document number                                      |
| `identity.documentType`   | string | No       | Type: `drivers_license`, `passport`, or `government_id` |
| `identity.issuingCountry` | string | No       | Two-letter country code (default: US)                   |
| `identity.issuingState`   | string | No       | Two-letter state code (e.g., CA, NY)                    |

### Response (Success)

```json
{
  "success": true,
  "credentialId": "cred_1234567890_abc123",
  "walletAddress": "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
  "compositeHash": "a1b2c3d4e5f6...",
  "sessionId": "session_1234567890",
  "issuer": {
    "name": "Example Bank",
    "type": "bank"
  }
}
```

### Response Fields

| Field           | Type    | Description                                         |
| --------------- | ------- | --------------------------------------------------- |
| `success`       | boolean | Whether credential was issued successfully          |
| `credentialId`  | string  | Unique credential identifier                        |
| `walletAddress` | string  | User's wallet address                               |
| `compositeHash` | string  | Unique hash for this identity (prevents duplicates) |
| `sessionId`     | string  | Verification session ID                             |
| `issuer.name`   | string  | Your organization name                              |
| `issuer.type`   | string  | Your organization type                              |

### Error Responses

#### 401 Unauthorized

```json
{
  "error": "Invalid API key"
}
```

#### 400 Bad Request

```json
{
  "error": "Invalid Algorand wallet address. Must be 58 characters."
}
```

```json
{
  "error": "Missing required identity fields: firstName, lastName, dateOfBirth"
}
```

```json
{
  "error": "dateOfBirth must be in YYYY-MM-DD format"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Failed to issue credential",
  "details": "Error message"
}
```

---

## Implementation Examples

### Node.js / TypeScript

```typescript
import fetch from "node-fetch";

async function issueCardlessId(
  walletAddress: string,
  userData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  }
) {
  const response = await fetch(
    "https://cardlessid.com/api/delegated-verification/issue",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: process.env.CARDLESSID_API_KEY,
        walletAddress,
        identity: userData,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to issue credential: ${error.error}`);
  }

  const result = await response.json();
  console.log("Credential issued:", result.credentialId);

  return result;
}

// Usage
await issueCardlessId(
  "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
  {
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-01-15",
  }
);
```

### Python

```python
import requests
import os

def issue_cardless_id(wallet_address, user_data):
    response = requests.post(
        'https://cardlessid.com/api/delegated-verification/issue',
        json={
            'apiKey': os.environ['CARDLESSID_API_KEY'],
            'walletAddress': wallet_address,
            'identity': user_data
        }
    )

    response.raise_for_status()
    result = response.json()

    print(f"Credential issued: {result['credentialId']}")
    return result

# Usage
issue_cardless_id(
    'MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM',
    {
        'firstName': 'Jane',
        'lastName': 'Doe',
        'dateOfBirth': '1990-01-15'
    }
)
```

### cURL

```bash
curl -X POST https://cardlessid.com/api/delegated-verification/issue \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "walletAddress": "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
    "identity": {
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15",
      "documentNumber": "D1234567",
      "documentType": "drivers_license",
      "issuingCountry": "US",
      "issuingState": "CA"
    }
  }'
```

---

## User Flow Integration

### Option 1: QR Code Scan

1. User logs into your app/website
2. Generate QR code with user's wallet address
3. User scans QR code with Cardless ID wallet
4. Wallet sends address to your backend
5. Backend calls delegated verification API
6. User receives credential in wallet

### Option 2: Deep Link

1. User taps "Get Cardless ID" button in your app
2. App opens Cardless ID wallet via deep link
3. Wallet provides address to your app
4. App calls delegated verification API
5. User receives credential in wallet

### Option 3: Manual Entry

1. User provides their wallet address in your app
2. Your backend validates address format
3. Backend calls delegated verification API
4. User receives credential in wallet
5. App confirms issuance

---

## Best Practices

### Security

1. **Protect API Keys**
   - Store in environment variables
   - Never commit to version control
   - Rotate regularly (every 90 days)
   - Use separate keys for dev/staging/production

2. **Validate User Identity**
   - Only issue to verified users
   - Verify wallet ownership
   - Log all issuance events
   - Implement rate limiting

3. **Data Minimization**
   - Only send required fields
   - Don't include sensitive data
   - Use document numbers sparingly
   - Follow GDPR/CCPA guidelines

### Operations

1. **Error Handling**
   - Retry failed requests with exponential backoff
   - Log all errors for debugging
   - Provide clear error messages to users
   - Monitor API usage and errors

2. **Rate Limiting**
   - Implement rate limiting on your side
   - Respect Cardless ID rate limits
   - Batch issuance when possible
   - Handle 429 responses gracefully

3. **Monitoring**
   - Track successful issuances
   - Monitor error rates
   - Alert on API key issues
   - Review logs regularly

### User Experience

1. **Clear Communication**
   - Explain what Cardless ID is
   - Show benefits to users
   - Provide support links
   - Handle opt-out gracefully

2. **Wallet Setup**
   - Help users download wallet app
   - Guide wallet address retrieval
   - Verify address before issuance
   - Confirm successful issuance

3. **Privacy**
   - Explain privacy benefits
   - Show what data is shared
   - Allow users to decline
   - Provide revocation option

---

## Testing

### Sandbox Environment

Use test API key for development:

```
sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Sandbox URL:**

```
POST https://sandbox.cardlessid.com/api/delegated-verification/issue
```

### Test Wallet Addresses

Use these test wallet addresses in sandbox:

```
TESTADDRESS1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456
TESTADDRESS2234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456
TESTADDRESS3234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456
```

### Test Data

```json
{
  "apiKey": "sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "walletAddress": "TESTADDRESS1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
  "identity": {
    "firstName": "Test",
    "lastName": "User",
    "dateOfBirth": "1990-01-01"
  }
}
```

---

## Compliance

### GDPR (European Union)

- Right to access: Users can request credential data
- Right to erasure: Users can request credential revocation
- Data minimization: Only required fields are transmitted
- Lawful basis: Legitimate interest or consent

### CCPA (California)

- Data disclosure: Users can request information about data collection
- Right to delete: Users can request credential deletion
- No sale of data: Credentials are not sold to third parties

### HIPAA (Healthcare)

- Protected Health Information (PHI) is not stored in credentials
- Only age/identity information is included
- Credentials are encrypted on blockchain
- Audit logs track all issuance

---

## Support

### Documentation

- **API Docs:** https://cardlessid.com/docs/integration-guide
- **Custom Verification Guide:** https://cardlessid.com/docs/custom-verification-guide
- **Credential Schema:** https://cardlessid.com/docs/credential-schema

### Contact

- **Email:** support@cardlessid.com
- **Partnerships:** partnerships@cardlessid.com
- **Technical Support:** dev@cardlessid.com
- **Emergency:** security@cardlessid.com (security issues only)

### SLA

- **Uptime:** 99.9% guaranteed
- **Response Time:** < 200ms (p95)
- **Support Response:** < 24 hours
- **Critical Issues:** < 2 hours

---

## Pricing

Contact partnerships@cardlessid.com for pricing information.

**Factors:**

- Monthly volume
- Organization type
- Support level
- Custom features

---

## License

Cardless ID API is proprietary. Contact us for licensing terms.

---

## Changelog

### v1.0.0 (2025-01-13)

- Initial release of delegated verification API
- Support for banks, government, employers, universities, healthcare
- API key authentication
- Sandbox environment

---

## FAQ

### Q: Can I issue credentials for users under 18?

**A:** Yes, Cardless ID credentials store date of birth and can verify any age threshold.

### Q: How long do credentials last?

**A:** Credentials are permanent on the Algorand blockchain. However, you can implement revocation.

### Q: Can I revoke a credential?

**A:** Yes, Cardless ID supports revocation. Contact us for implementation details.

### Q: What if a user loses their wallet?

**A:** Users can recover wallets using seed phrases. If permanently lost, issue a new credential to a new wallet.

### Q: Can I customize the credential schema?

**A:** The base schema is standardized, but you can add custom fields. Contact us for details.

### Q: How much does it cost per credential?

**A:** Contact partnerships@cardlessid.com for pricing.

### Q: Is this compliant with [regulation]?

**A:** We work with legal experts to ensure compliance. Contact us to discuss your specific requirements.

### Q: Can I bulk issue credentials?

**A:** Yes, you can make parallel API calls. Respect rate limits or contact us for bulk discounts.

---

**Ready to get started?** Contact partnerships@cardlessid.com to request your API key.
