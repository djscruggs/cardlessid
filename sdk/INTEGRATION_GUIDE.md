# Cardless ID Integration Guide

Full API reference and integration examples for age verification.

## Table of Contents

- [Overview](#overview)
- [Age Verification — No Backend Required](#age-verification--no-backend-required)
- [Age Verification — With Backend Proof Verification](#age-verification--with-backend-proof-verification)
- [API Reference](#api-reference)
- [Proof Verification](#proof-verification)
- [Framework Examples](#framework-examples)

---

## Overview

Cardless ID lets any website verify a user's age against their blockchain-backed credential — without collecting or storing personal data.

**What happens:**

1. Your page requests a nonce from the Cardless ID API
2. The user scans a QR code with the Cardless ID wallet app
3. The wallet reads the credential from Algorand, signs a proof, and submits it
4. Your page receives a `{ meetsRequirement: boolean, walletAddress: string }` result

No API key. No backend required. No personal data shared with your servers.

---

## Age Verification — No Backend Required

### Script tag

The fastest path: one `<script>` tag, no npm, no build step.

```html
<!DOCTYPE html>
<html>
<head>
  <title>Age Verification</title>
</head>
<body>
  <div id="age-gate"></div>

  <script src="https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js"></script>
  <script>
    const verify = new CardlessIDVerify({
      minAge: 21,
      onVerified({ meetsRequirement, walletAddress }) {
        if (meetsRequirement) {
          document.getElementById('age-gate').innerHTML =
            '<h2>Access granted</h2><p>Wallet: ' + walletAddress + '</p>';
        } else {
          document.getElementById('age-gate').innerHTML =
            '<h2>Access denied</h2><p>Age requirement not met.</p>';
        }
      },
      onError(err) {
        console.error('Verification error:', err.message);
      },
    });

    verify.mount('#age-gate');
  </script>
</body>
</html>
```

### npm + bundler

```bash
npm install @cardlessid/verify
```

```js
import { CardlessIDVerify } from '@cardlessid/verify';

const verify = new CardlessIDVerify({
  minAge: 21,
  siteId: 'my-site',          // optional — used for analytics
  pollInterval: 1500,          // optional — ms between polls (default 1500)
  onVerified({ meetsRequirement, walletAddress }) {
    // Called once, with the simplified result
    grantAccess(meetsRequirement, walletAddress);
  },
  onResult(proof) {
    // Optional — called with the raw SignedProof
    // Use this if you want to send the proof to your backend for re-verification
    sendToBackend(proof);
  },
  onError(err) {
    console.error(err.message);
  },
});

verify.mount('#container');

// Later, clean up:
verify.destroy();
```

### Constructor options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `minAge` | `number` | Yes | Age requirement (1–150) |
| `baseUrl` | `string` | No | API base URL (default: `https://cardlessid.org`) |
| `siteId` | `string` | No | Public identifier for analytics — safe to embed in client JS |
| `pollInterval` | `number` | No | Polling interval in ms (default: 1500) |
| `onVerified` | `function` | No | Called with `{ meetsRequirement, walletAddress, proof }` |
| `onResult` | `function` | No | Called with the raw `SignedProof` object |
| `onError` | `function` | No | Called on unrecoverable errors |

### Methods

#### `mount(selector)`

Mount the widget into a DOM element. Fetches a nonce, renders a QR code, and starts polling.

```js
verify.mount('#container');      // CSS selector
verify.mount(document.getElementById('container')); // or Element
```

#### `destroy()`

Stop polling and clear the widget.

#### `getNonce()` — headless

Fetch a nonce and QR content without rendering anything. Use this for custom UI.

```js
const { nonce, deepLink } = await verify.getNonce();
// deepLink = 'https://cardlessid.org/app/wallet-verify?nonce=...&minAge=21'
// Render deepLink as a QR code with your own library
```

#### `pollForResult(nonce, timeoutMs?)` — headless

Poll until a proof arrives for the given nonce.

```js
const proof = await verify.pollForResult(nonce, 300_000); // 5-minute timeout
```

---

## Age Verification — With Backend Proof Verification

If you want to verify the Algorand signature on your server instead of in the browser:

### Frontend

```js
const verify = new CardlessIDVerify({
  minAge: 21,
  onResult(proof) {
    // Send the raw proof to your backend
    fetch('/api/verify-age', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    })
    .then(res => res.json())
    .then(({ meetsRequirement }) => {
      if (meetsRequirement) grantAccess();
    });
  },
});
verify.mount('#container');
```

### Backend (Node.js)

Install the verification helper from the browser package (works in Node too):

```bash
npm install @cardlessid/verify
```

```js
import { verifyProof } from '@cardlessid/verify';

app.post('/api/verify-age', (req, res) => {
  const proof = req.body;
  const result = verifyProof(proof);

  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  const { meetsRequirement, walletAddress, minAge } = result.payload;

  // Optional: check minAge matches your requirement
  if (minAge !== 21) {
    return res.status(400).json({ error: 'Unexpected minAge in proof' });
  }

  res.json({ meetsRequirement, walletAddress });
});
```

`verifyProof` performs:
1. Algorand ed25519 signature verification (no network call)
2. Timestamp freshness check (5-minute window)

---

## API Reference

All endpoints are on `https://cardlessid.org`. No authentication required.

### GET /api/v/nonce

Issue a signed, expiring nonce. No database write.

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `minAge` | No | Age requirement (default: 18, range: 1–150) |
| `siteId` | No | Public integrator identifier for analytics |

**Response:**

```json
{
  "nonce": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 300
}
```

The nonce is a signed token that encodes `minAge`, `siteId`, and expiry. It cannot be forged or modified.

---

### POST /api/v/submit

Submit a signed proof from the wallet. Called by the wallet app — not directly by integrators.

**Request body:**

```json
{
  "nonce": "eyJhbGciOiJIUzI1NiJ9...",
  "signedProof": {
    "payload": {
      "nonce": "eyJhbGciOiJIUzI1NiJ9...",
      "walletAddress": "ALGORAND_ADDRESS...",
      "minAge": 21,
      "meetsRequirement": true,
      "timestamp": 1714000000000
    },
    "signature": "base64url-encoded-ed25519-signature"
  }
}
```

**Response:**

```json
{ "success": true }
```

**Error responses:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid nonce, expired nonce, bad signature, minAge mismatch |
| 451 | Service not available in your region (EEA) |

---

### GET /api/v/result/:nonce

Poll for a submitted proof. Returns 404 until the wallet submits.

**Response (found):**

```json
{
  "proof": {
    "payload": {
      "nonce": "...",
      "walletAddress": "ALGORAND_ADDRESS...",
      "minAge": 21,
      "meetsRequirement": true,
      "timestamp": 1714000000000
    },
    "signature": "base64url-encoded-ed25519-signature"
  }
}
```

**Response (not yet submitted):** `404`

Proofs are evicted from the cache 60 seconds after submission. The nonce itself expires after 5 minutes.

---

## Proof Verification

The `SignedProof` structure:

```ts
interface SignedProof {
  payload: {
    nonce: string;           // The nonce issued by /api/v/nonce
    walletAddress: string;   // Algorand wallet address (base32)
    minAge: number;          // Age requirement from the nonce
    meetsRequirement: boolean;
    timestamp: number;       // Unix ms — must be within 5 minutes of now
  };
  signature: string;         // Base64url ed25519 signature over JSON.stringify(payload)
}
```

The signature is produced by `algosdk.signBytes(Buffer.from(JSON.stringify(payload)), sk)`, which prepends the Algorand domain prefix `"MX"` before signing. `verifyProof` from `@cardlessid/verify` handles this prefix correctly.

**Things to check in your own verifier:**
1. `algosdk.verifyBytes(Buffer.from(JSON.stringify(proof.payload)), sigBytes, proof.payload.walletAddress)`
2. `proof.payload.nonce` matches the nonce you issued
3. `proof.payload.minAge` matches your requirement
4. `proof.payload.timestamp` is within an acceptable window (recommended: 5 minutes)

---

## Framework Examples

### React

```tsx
import { useEffect, useRef } from 'react';
import { CardlessIDVerify } from '@cardlessid/verify';

function AgeGate({ minAge, onVerified }) {
  const containerRef = useRef(null);
  const verifyRef = useRef(null);

  useEffect(() => {
    verifyRef.current = new CardlessIDVerify({
      minAge,
      onVerified,
    });
    verifyRef.current.mount(containerRef.current);

    return () => verifyRef.current?.destroy();
  }, [minAge]);

  return <div ref={containerRef} />;
}
```

### Vue 3

```vue
<template>
  <div ref="container" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { CardlessIDVerify } from '@cardlessid/verify';

const props = defineProps({ minAge: Number });
const emit = defineEmits(['verified']);
const container = ref(null);
let verify;

onMounted(() => {
  verify = new CardlessIDVerify({
    minAge: props.minAge,
    onVerified: (result) => emit('verified', result),
  });
  verify.mount(container.value);
});

onUnmounted(() => verify?.destroy());
</script>
```

### Next.js (App Router)

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { CardlessIDVerify } from '@cardlessid/verify';

export function AgeVerification({ minAge }: { minAge: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const verify = new CardlessIDVerify({
      minAge,
      onVerified({ meetsRequirement }) {
        if (meetsRequirement) window.location.href = '/protected';
      },
    });
    verify.mount(ref.current);
    return () => verify.destroy();
  }, []);

  return <div ref={ref} />;
}
```
