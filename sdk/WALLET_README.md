# Building a Cardless ID-Compatible Wallet App

Quick reference for wallet app developers integrating with the stateless verification protocol.

## What You're Building

A mobile wallet that:

1. Stores the user's age credential (issued during KYC, stored on Algorand)
2. Handles deep links / QR scans from age verification requests
3. Reads the credential from Algorand, checks if the age requirement is met
4. Signs a cryptographic proof with the wallet's Algorand private key
5. Submits the signed proof to the Cardless ID API

The Cardless ID server is stateless in this flow. No challenge ID, no polling a database — the wallet signs a proof and posts it directly.

---

## Deep Link Format

The QR code and universal link encode:

```
https://cardlessid.org/app/wallet-verify?nonce=<NONCE>&minAge=<MIN_AGE>
```

| Parameter | Description |
|-----------|-------------|
| `nonce` | Signed expiring token issued by `GET /api/v/nonce` (5-minute TTL) |
| `minAge` | Age requirement (integer, 1–150) |

Your app must handle this URL via universal links (iOS) or app links (Android).

---

## Verification Flow

```
1. User scans QR or taps deep link

2. Wallet decodes nonce and minAge from the URL

3. Wallet reads the credential from Algorand:
   - Look up the ARC-69 NFT in the user's wallet
   - Extract the birthdate from the metadata
   - Check: age >= minAge?

4. Wallet builds a proof payload:
   {
     nonce,
     walletAddress,   // base32 Algorand address
     minAge,
     meetsRequirement: boolean,
     timestamp: Date.now()
   }

5. Wallet signs the payload with the Algorand private key:
   signature = algosdk.signBytes(Buffer.from(JSON.stringify(payload)), sk)

6. Wallet POSTs to POST /api/v/submit:
   {
     nonce,
     signedProof: { payload, signature: base64url(signature) }
   }

7. Server verifies the nonce and signature, stores proof in 60s TTL cache

8. Integrator snippet picks up the proof from GET /api/v/result/{nonce}
```

---

## Signing a Proof

The signing must use `algosdk.signBytes`, which prepends the Algorand domain prefix `"MX"` (bytes `[77, 88]`) before the ed25519 operation. Any Algorand-compatible ed25519 library that applies the same prefix will work.

### TypeScript / React Native

```typescript
import algosdk from 'algosdk';

interface ProofPayload {
  nonce: string;
  walletAddress: string;
  minAge: number;
  meetsRequirement: boolean;
  timestamp: number;
}

interface SignedProof {
  payload: ProofPayload;
  signature: string; // base64url
}

function signProof(
  nonce: string,
  minAge: number,
  meetsRequirement: boolean,
  account: algosdk.Account
): SignedProof {
  const payload: ProofPayload = {
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

async function submitProof(proof: SignedProof): Promise<void> {
  const res = await fetch('https://cardlessid.org/api/v/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nonce: proof.payload.nonce,
      signedProof: proof,
    }),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}
```

### Deep link handler (React Native)

```typescript
import { Linking } from 'react-native';

function useDeepLinkHandler(account: algosdk.Account) {
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      const parsed = new URL(url);
      const nonce = parsed.searchParams.get('nonce');
      const minAge = parseInt(parsed.searchParams.get('minAge') ?? '18', 10);

      if (!nonce) return;

      // 1. Read credential from Algorand and check age
      const meetsRequirement = await checkAgeRequirement(account.addr, minAge);

      // 2. Sign and submit proof
      const proof = signProof(nonce, minAge, meetsRequirement, account);
      await submitProof(proof);
    };

    Linking.addEventListener('url', handleUrl);
    return () => Linking.removeEventListener('url', handleUrl);
  }, [account]);
}
```

---

## API Endpoints

### POST /api/v/submit

Submit a signed proof. No API key required.

**Request:**

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
    "signature": "base64url-encoded-signature"
  }
}
```

**Success response:**

```json
{ "success": true }
```

**Error responses:**

| Status | `error` | Meaning |
|--------|---------|---------|
| 400 | `Invalid nonce: expired` | Nonce older than 5 minutes — ask user to retry |
| 400 | `Invalid nonce: ...` | Nonce tampered or malformed |
| 400 | `Invalid proof: signature verification failed` | Signature doesn't match walletAddress |
| 400 | `Proof nonce does not match submitted nonce` | Payload nonce ≠ request nonce |
| 400 | `Proof minAge does not match nonce minAge` | Don't modify minAge between nonce and proof |
| 451 | `Service not available in your region` | EEA geo-block |

---

## Anti-Spoofing Architecture

The protocol uses two independent layers to prevent a rogue wallet from faking a verification:

### Layer 1 — Cryptographic signature

Every proof is ed25519-signed with the wallet's Algorand private key. The signature covers the full payload including `nonce`, `walletAddress`, `minAge`, `meetsRequirement`, and `timestamp`. Any tampering (e.g. flipping `meetsRequirement` after signing) invalidates the signature.

The server verifies this before storing the proof. The integrator's SDK (`verifyProof`) verifies it again client-side when the proof is picked up.

**What this prevents:** A rogue wallet cannot forge a proof for a wallet address it doesn't control, and cannot tamper with the payload after signing.

**What this does NOT prevent:** A wallet that controls its own private key can sign `meetsRequirement: true` regardless of whether it holds a real credential.

### Layer 2 — On-chain credential check

The integrator's `verifyProofOnChain()` function calls `GET /api/wallet/status/:address` after the signature check. This queries the Algorand blockchain (via Algonode indexer) to confirm the wallet holds a valid Cardless ID credential NFT — an ARC-69 NFT issued only after identity verification via KYC.

```typescript
import { verifyProofOnChain } from '@cardlessid/verify';

const result = await verifyProofOnChain(proof);
// result.valid is only true if:
//   1. Signature is valid
//   2. Timestamp is fresh (< 5 min)
//   3. Wallet holds a credential NFT on Algorand
if (result.valid && result.payload.meetsRequirement) {
  grantAccess();
}
```

**What this prevents:** A wallet that generates a fresh keypair and signs `meetsRequirement: true` — it won't have a credential NFT, so the check fails.

### Why both layers together are robust

| Attack | Layer 1 (sig) | Layer 2 (chain) |
|--------|--------------|-----------------|
| Tamper payload after signing | Blocks | — |
| Sign with wrong key for claimed address | Blocks | — |
| Sign `meetsRequirement: true` with own key, no credential | Passes | Blocks |
| Replay a captured proof to a different site | Blocks (nonce mismatch) | — |
| Replay the same proof twice | Blocked by nonce TTL (5 min) | — |

The credential NFT is permanent and public on Algorand — there is no way to fake ownership without controlling the wallet's private key AND having passed real KYC.

---

## Requirements

Your wallet app must:

- Only share `meetsRequirement: boolean` — never expose the actual birthdate in the proof
- Get explicit user consent before submitting a proof
- Display the `minAge` requirement to the user before they approve
- Handle the `nonce` as opaque — do not parse or modify it
- Use HTTPS for all API calls
- Handle the 400/expired error gracefully — prompt the user to scan again

---

## Future: Wallet App Registry (Planned)

The current protocol verifies that a wallet *address* holds a real credential, but does not verify which *app* submitted the proof. A rogue wallet app could theoretically sign `meetsRequirement: true` on behalf of a user who does hold a credential.

To close this gap, a future on-chain wallet app registry is planned:

- Each approved wallet app registers a **dedicated signing keypair** (separate from user keys) in an Algorand smart contract app box
- The wallet app signs the proof submission request with this app key
- `/api/v/submit` verifies both the user's wallet signature and the wallet app's registration signature
- Revocation: removing the app key from the registry immediately blocks all submissions from that app

When this is enforced, wallet apps will need to:
1. Register with Cardless ID to receive an app signing keypair
2. Include an `X-Wallet-App-Signature` header on all `POST /api/v/submit` requests

This is not yet enforced — watch for updates or contact me@derekscruggs.com to get early access.

---

## Testing

1. Navigate to `https://cardlessid.org/app/wallet-verify?nonce=test&minAge=21` in a browser
2. Or use the verification demo at `https://cardlessid.org/app/demo`
3. Scan the QR code with your wallet under development
4. Check the server logs for `[API /v/submit] proof stored`

For unit tests, use `algosdk.generateAccount()` to create a test account and sign proofs locally — the server only verifies the signature and nonce, so generated accounts work fine.

---

## Support

- **GitHub**: https://github.com/djscruggs/cardlessid/issues
- **Email**: me@derekscruggs.com
