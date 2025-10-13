# CardlessID Age Verification - Integration Guide

This guide explains how to integrate CardlessID age verification into your application using the backend-required secure flow.

## Table of Contents

- [Overview](#overview)
- [Security Model](#security-model)
- [Getting Started](#getting-started)
- [Node.js SDK](#nodejs-sdk)
- [REST API](#rest-api)
- [Example Integrations](#example-integrations)

## Overview

CardlessID provides zero-knowledge age verification using decentralized identity credentials on the Algorand blockchain. Users prove they meet an age requirement without revealing their actual birthdate.

**Key Features:**

- ✅ Privacy-preserving (only returns true/false)
- ✅ Secure challenge-response flow
- ✅ Single-use verification tokens
- ✅ 10-minute expiration
- ✅ Optional webhook callbacks

## Security Model

The verification flow uses a **challenge-response pattern** to prevent tampering:

1. **Your backend** creates a challenge with your required age
2. CardlessID generates a unique, single-use challenge ID
3. User scans QR code with their wallet
4. Wallet verifies age requirement and responds to CardlessID
5. **Your backend** polls or receives webhook to confirm verification
6. Challenge cannot be reused or modified

**Why this is secure:**

- Challenge ID is cryptographically tied to your minAge requirement
- User cannot modify the age requirement (it's stored server-side)
- Challenge is single-use and expires after 10 minutes
- Only you (with your API key) can verify the challenge result

## Getting Started

### 1. Get Your API Key

Contact Cardless ID to receive your API key. For development, you can create a test key:

```bash
# In production, this would be done via admin panel
# For now, use the createIntegrator function
```

### 2. Install the SDK

**Node.js:**

```bash
npm install @cardlessid/verifier
```

### 3. Basic Usage

```javascript
const CardlessID = require("@cardlessid/verifier");

const verifier = new CardlessID({
  apiKey: process.env.CARDLESSID_API_KEY,
});

// Create challenge
const challenge = await verifier.createChallenge({ minAge: 21 });

// Show QR code to user
console.log("Scan this:", challenge.qrCodeUrl);

// Poll for result
const result = await verifier.pollChallenge(challenge.challengeId);

if (result.verified) {
  console.log("User is 21+");
}
```

## Node.js SDK

### Installation

```bash
npm install @cardlessid/verifier
```

### API Reference

#### Constructor

```javascript
const verifier = new CardlessID({
  apiKey: "your_api_key",
  baseUrl: "https://cardlessid.com", // optional
});
```

#### createChallenge(params)

Creates a new age verification challenge.

**Parameters:**

- `minAge` (number, required): Age requirement (1-150)
- `callbackUrl` (string, optional): Webhook URL for notifications

**Returns:**

```javascript
{
  challengeId: 'chal_1234567890_abc123',
  qrCodeUrl: 'https://cardlessid.com/app/age-verify?challenge=chal_...',
  deepLinkUrl: 'cardlessid://verify?challenge=chal_...',
  createdAt: 1234567890000,
  expiresAt: 1234568490000
}
```

#### verifyChallenge(challengeId)

Checks the current status of a challenge.

**Parameters:**

- `challengeId` (string, required): Challenge ID

**Returns:**

```javascript
{
  challengeId: 'chal_1234567890_abc123',
  verified: true,
  status: 'approved', // pending | approved | rejected | expired
  minAge: 21,
  walletAddress: 'ALGORAND_ADDRESS...',
  createdAt: 1234567890000,
  expiresAt: 1234568490000,
  respondedAt: 1234568123000
}
```

#### pollChallenge(challengeId, options)

Polls a challenge until completed or expired.

**Parameters:**

- `challengeId` (string, required): Challenge ID
- `options.interval` (number, optional): Polling interval in ms (default: 2000)
- `options.timeout` (number, optional): Total timeout in ms (default: 600000)

**Returns:** Same as `verifyChallenge()`

## REST API

### Authentication

All API requests require your API key:

**Header:**

```
X-API-Key: your_api_key_here
```

**Or in request body:**

```json
{
  "apiKey": "your_api_key_here",
  ...
}
```

### Endpoints

#### POST /api/integrator/challenge/create

Create a new verification challenge.

**Request:**

```json
{
  "apiKey": "your_api_key",
  "minAge": 21,
  "callbackUrl": "https://yourapp.com/verify-callback"
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

#### GET /api/integrator/challenge/verify/:challengeId

Verify a challenge status.

**Headers:**

```
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

## Example Integrations

### Express.js Example

```javascript
const express = require("express");
const CardlessID = require("@cardlessid/verifier");

const app = express();
const verifier = new CardlessID({
  apiKey: process.env.CARDLESSID_API_KEY,
});

// Temporary storage (use Redis/DB in production)
const pendingVerifications = new Map();

// Start verification
app.post("/verify-age", async (req, res) => {
  const sessionId = generateSessionId();

  // Create challenge
  const challenge = await verifier.createChallenge({
    minAge: 21,
    callbackUrl: `https://yourapp.com/verify-callback`,
  });

  pendingVerifications.set(sessionId, {
    challengeId: challenge.challengeId,
    status: "pending",
  });

  res.json({
    sessionId,
    qrCodeUrl: challenge.qrCodeUrl,
  });
});

// Check verification status
app.get("/verify-status/:sessionId", async (req, res) => {
  const pending = pendingVerifications.get(req.params.sessionId);

  if (!pending) {
    return res.status(404).json({ error: "Session not found" });
  }

  const result = await verifier.verifyChallenge(pending.challengeId);

  if (result.status !== "pending") {
    pendingVerifications.delete(req.params.sessionId);
  }

  res.json({
    verified: result.verified,
    status: result.status,
  });
});

// Optional: Webhook callback
app.post("/verify-callback", express.json(), (req, res) => {
  const { challengeId, approved, walletAddress } = req.body;

  console.log("Verification completed:", {
    challengeId,
    approved,
    walletAddress,
  });

  // Update your database, trigger next steps, etc.

  res.sendStatus(200);
});

app.listen(3000);
```

### Next.js API Route Example

```typescript
// pages/api/verify-age.ts
import type { NextApiRequest, NextApiResponse } from "next";
import CardlessID from "@cardlessid/verifier";

const verifier = new CardlessID({
  apiKey: process.env.CARDLESSID_API_KEY!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    // Create challenge
    const challenge = await verifier.createChallenge({
      minAge: 21,
    });

    return res.json(challenge);
  }

  if (req.method === "GET") {
    // Check status
    const { challengeId } = req.query;
    const result = await verifier.verifyChallenge(challengeId as string);

    return res.json(result);
  }

  res.status(405).end();
}
```

### Frontend Integration

```javascript
// React example
async function startAgeVerification() {
  // Call your backend to create challenge
  const response = await fetch("/api/verify-age", {
    method: "POST",
  });

  const { challengeId, qrCodeUrl } = await response.json();

  // Show QR code to user
  showQRCode(qrCodeUrl);

  // Poll for completion
  const pollInterval = setInterval(async () => {
    const statusRes = await fetch(`/api/verify-status/${challengeId}`);
    const status = await statusRes.json();

    if (status.status === "approved") {
      clearInterval(pollInterval);
      onVerificationSuccess();
    } else if (status.status === "rejected" || status.status === "expired") {
      clearInterval(pollInterval);
      onVerificationFailed();
    }
  }, 2000);
}
```

## Best Practices

1. **Store API keys securely** - Use environment variables, never commit to git
2. **Use webhooks when possible** - More efficient than polling
3. **Set appropriate timeouts** - Challenges expire in 10 minutes
4. **Handle all status states** - pending, approved, rejected, expired
5. **Use HTTPS** - Always use secure connections in production
6. **Rate limit verification attempts** - Prevent abuse
7. **Log verification events** - For audit and compliance

## Support

For questions or issues:

- GitHub: https://github.com/djscruggs/cardlessid
- Email: me@djscruggs.com
