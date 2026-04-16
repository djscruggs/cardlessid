# Test Plan: Verification Protocol v2

Tests are organized by layer: pure utilities first (fast, no IO), then API endpoints, then
integration (full flow). The test file convention for this project is
`src/**/__tests__/*.test.ts`.

---

## 1. `app/utils/nonce.server.ts`

Pure functions — no IO, no mocking needed. Highest priority.

### `issueNonce`

| # | Test | Expected |
|---|---|---|
| 1.1 | `issueNonce(21)` returns a string with exactly one `.` separator | pass |
| 1.2 | Decoded payload contains `jti`, `iat`, `exp`, `minAge: 21` | pass |
| 1.3 | `exp - iat` is approximately 300,000ms (5 min) | pass |
| 1.4 | `issueNonce(21, 'my-site')` includes `siteId: 'my-site'` in payload | pass |
| 1.5 | `issueNonce(21)` omits `siteId` key entirely | pass |
| 1.6 | Two calls produce different `jti` values | pass |

### `verifyNonce`

| # | Test | Expected |
|---|---|---|
| 2.1 | Token issued by `issueNonce(21)` verifies successfully | `{ valid: true, payload: { minAge: 21 } }` |
| 2.2 | Token with tampered payload (flip one char) fails | `{ valid: false, error: 'invalid signature' }` |
| 2.3 | Token with tampered signature fails | `{ valid: false, error: 'invalid signature' }` |
| 2.4 | Malformed token (no `.`) fails | `{ valid: false, error: 'malformed nonce' }` |
| 2.5 | Token with `exp` set to past timestamp fails | `{ valid: false, error: 'nonce expired' }` |
| 2.6 | Token issued with different `NONCE_SECRET` fails | `{ valid: false, error: 'invalid signature' }` |
| 2.7 | Empty string fails | `{ valid: false, error: 'malformed nonce' }` |
| 2.8 | Verified payload `minAge` matches what was issued | `payload.minAge === 21` |
| 2.9 | Verified payload `siteId` matches what was issued | `payload.siteId === 'my-site'` |

---

## 2. `app/utils/proof-cache.server.ts`

Pure in-memory logic — no mocking needed, but fake timers help for TTL tests.

| # | Test | Expected |
|---|---|---|
| 3.1 | `storeProof(nonce, proof)` then `getProof(nonce)` returns the proof | proof object |
| 3.2 | `getProof` on unknown nonce returns `null` | `null` |
| 3.3 | `storeProof` overwrites an existing entry | new proof returned |
| 3.4 | After TTL expires (fake timer advance 61s), `getProof` returns `null` | `null` |
| 3.5 | Expired entry is deleted from the map (no memory leak) | `cache.size` decrements |
| 3.6 | Sweep interval clears expired entries without calling `getProof` | map shrinks after 30s tick |

---

## 3. `app/utils/algorand-verify.ts`

Requires a real Algorand keypair for valid-signature tests. Use `algosdk.generateAccount()`.

### Setup (shared across tests)
```ts
const account = algosdk.generateAccount();
const makeProof = (overrides = {}) => {
  const payload = {
    nonce: 'test-nonce',
    walletAddress: algosdk.encodeAddress(account.addr.publicKey),
    minAge: 21,
    meetsRequirement: true,
    timestamp: Date.now(),
    ...overrides,
  };
  const message = Buffer.from(JSON.stringify(payload));
  const sig = algosdk.signBytes(message, account.sk);
  return { payload, signature: Buffer.from(sig).toString('base64url') };
};
```

| # | Test | Expected |
|---|---|---|
| 4.1 | Valid proof (correct keypair, fresh timestamp) verifies | `{ valid: true }` |
| 4.2 | `meetsRequirement: false` proof still verifies (boolean doesn't affect signature check) | `{ valid: true }` |
| 4.3 | Tampered payload field (change `minAge`) fails | `{ valid: false, error: 'signature verification failed' }` |
| 4.4 | Wrong wallet address (different account's address in payload) fails | `{ valid: false, error: 'signature verification failed' }` |
| 4.5 | Invalid Algorand address format fails | `{ valid: false, error: 'invalid walletAddress' }` |
| 4.6 | Malformed base64url signature fails | `{ valid: false, error: ... }` |
| 4.7 | Timestamp in the past > 5 minutes fails | `{ valid: false, error: 'proof timestamp out of acceptable window' }` |
| 4.8 | Timestamp in the future fails | `{ valid: false, error: 'proof timestamp out of acceptable window' }` |
| 4.9 | Timestamp exactly at 5-minute boundary passes | `{ valid: true }` |

---

## 4. `GET /api/v/nonce` endpoint

Use `fetch` against a running dev server, or test the `loader` function directly with a
`Request` object.

| # | Test | Expected |
|---|---|---|
| 5.1 | `GET /api/v/nonce` (no params) returns `{ nonce, expiresIn: 300 }` | 200 |
| 5.2 | `GET /api/v/nonce?minAge=21` embeds `minAge: 21` in nonce payload | 200, payload check |
| 5.3 | `GET /api/v/nonce?minAge=0` rejects | 400 |
| 5.4 | `GET /api/v/nonce?minAge=151` rejects | 400 |
| 5.5 | `GET /api/v/nonce?minAge=abc` rejects | 400 |
| 5.6 | `POST /api/v/nonce` rejects | 405 |
| 5.7 | Request with EEA `CF-IPCountry` header rejects | 451 |
| 5.8 | `?siteId=foo` is embedded in the returned nonce payload | decoded `siteId === 'foo'` |
| 5.9 | Returned nonce is verifiable by `verifyNonce` | `{ valid: true }` |

---

## 5. `POST /api/v/submit` endpoint

Requires a valid nonce from `issueNonce` and a real signed proof from `algosdk`.

| # | Test | Expected |
|---|---|---|
| 6.1 | Valid nonce + valid signed proof returns `{ success: true }` | 200 |
| 6.2 | Missing `nonce` field rejects | 400 |
| 6.3 | Missing `signedProof` field rejects | 400 |
| 6.4 | Invalid JSON body rejects | 400 |
| 6.5 | Expired nonce rejects | 400 `"Invalid nonce: nonce expired"` |
| 6.6 | Tampered nonce (signature mismatch) rejects | 400 |
| 6.7 | Invalid Algorand signature on proof rejects | 400 |
| 6.8 | Proof nonce field doesn't match submitted nonce rejects | 400 |
| 6.9 | Proof `minAge` doesn't match nonce `minAge` rejects | 400 |
| 6.10 | `GET /api/v/submit` rejects | 405 |
| 6.11 | EEA request rejects | 451 |
| 6.12 | After successful submit, proof is retrievable via `getProof(nonce)` | proof object |

---

## 6. `GET /api/v/result/:nonce` endpoint

| # | Test | Expected |
|---|---|---|
| 7.1 | Nonce with no stored proof returns 404 | 404 `"not found"` |
| 7.2 | After `storeProof(nonce, proof)`, returns `{ proof }` | 200 |
| 7.3 | After TTL expiry (61s), returns 404 | 404 |
| 7.4 | `POST /api/v/result/:nonce` rejects | 405 |
| 7.5 | EEA request rejects | 451 |

---

## 7. Full Integration Flow

End-to-end test covering the complete happy path. Requires `NONCE_SECRET` env var set and
a real Algorand keypair (testnet or generated locally).

| # | Test | Steps | Expected |
|---|---|---|---|
| 8.1 | Happy path: meet age requirement | 1. GET nonce (minAge=21) → 2. sign proof (meetsRequirement: true) → 3. POST submit → 4. GET result | result contains proof, `meetsRequirement: true` |
| 8.2 | Happy path: does not meet age requirement | Same as 8.1 but `meetsRequirement: false` | result contains proof, `meetsRequirement: false` |
| 8.3 | Result polling returns 404 before submit, 200 after | GET result → 404 → POST submit → GET result | 404 then 200 |
| 8.4 | Proof is gone after 60s TTL | Submit → wait 61s → GET result | 404 |
| 8.5 | Replayed proof (same nonce submitted twice) — second submit should succeed (nonce is not consumed server-side; TTL cache just overwrites) | Two POSTs with same nonce | both 200 — note this is expected behavior; replay prevention is via nonce expiry, not single-use |

---

## 8. Security / Edge Cases

| # | Test | Expected |
|---|---|---|
| 9.1 | Nonce signed with wrong secret is rejected at submit | 400 |
| 9.2 | minAge in QR (nonce payload) cannot be lowered by tampering with proof payload | submit rejects because signature fails |
| 9.3 | A fresh Algorand keypair (no credential) can sign a valid-looking proof — on-chain check (`checkOnChain: true`) must be used to catch this | proof verifies signature, fails on-chain check |
| 9.4 | Missing `NONCE_SECRET` env var throws at nonce issuance (not silently) | Error thrown |

---

## 9. Not Yet Testable (Phase 2 / TODO)

These require the wallet's real Algorand credential read and `did:algo` resolver, which are
not yet implemented.

- Real on-chain credential check (`checkOnChain: true` path in `verifyProof`)
- `did:algo` DID Document resolution
- SIOP-OID4VP VP construction and validation
- `wallet-verify.tsx` with real ed25519 signing (currently uses mock)

---

## Running Tests

```bash
# Unit tests (utils — no server needed)
npx vitest run app/utils

# Endpoint tests (requires NONCE_SECRET env var)
NONCE_SECRET=test-secret npx vitest run app/routes/api/v

# Full integration (requires dev server)
NONCE_SECRET=test-secret npx vitest run --reporter=verbose
```

Set `NONCE_SECRET` to any non-empty string for testing. In production this must be a
cryptographically random 32-byte value.
