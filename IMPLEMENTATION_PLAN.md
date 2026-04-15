# Plan: Verification Protocol — Intended Architecture

## Context

The current verification flow is Firebase-backed: `integrator-challenges.server.ts` writes a
challenge record to Firebase on every age check, and the wallet polls status by challenge ID.
This creates a server bottleneck and doesn't match the intended design goal: **rely 100% on the
blockchain for age verification, with the Cardless ID server stateless and out of the critical
path.**

This plan documents the intended architecture, the implementation work to get there, and the
documentation changes needed. It also captures a decision to adopt the SIOP-OID4VP protocol
to maximize interoperability with the broader SSI ecosystem (see § SIOP-OID4VP below).

---

## Intended Architecture

### Core design goals
- Integrators embed a JS snippet (via CDN or npm) — no backend required
- Every age verification is proven on-chain — the Cardless ID server never queries Algorand
- The server is stateless in the verification path — no database writes per verification
- Signed cryptographic proofs replace polling a DB record
- Partner wallet apps are allowed but require audit/review before deployment

### The flow

```
1. Integrator drops <script> tag on their page, configured with minAge

2. JS snippet calls GET /api/v/nonce
   → Server returns a signed, expiring nonce (JWT-style, no DB write)

3. Snippet renders QR code encoding: { nonce, minAge, returnUrl }

4. User opens Cardless ID wallet app and scans QR

5. Wallet queries Algorand directly:
   - Reads credential NFT from user's wallet address
   - Checks ARC-69 metadata: does birthdate satisfy minAge?

6. If yes, wallet signs a proof:
   { nonce, walletAddress, minAge, meetsRequirement: true, timestamp }
   signed with wallet's Algorand private key

7. Wallet POSTs signed proof to Cardless ID API:
   POST /api/v/submit  { nonce, signedProof, walletAddress }
   → Server verifies the nonce signature (stateless check)
   → Server stores { nonce → signedProof } in TTL cache (60s, in-memory or Redis)
   → Returns { success: true }

8. JS snippet polls GET /api/v/result/{nonce}  (every 1-2s)
   → Once found, returns signedProof to the snippet

9. Snippet delivers proof to the integrator page
   Integrator verifies (client-side or server-side):
   - Algorand signature on the proof is valid for walletAddress
   - walletAddress holds a valid credential on Algorand (direct read)
   - nonce matches the one issued in step 2
   - timestamp is fresh (not replayed)
```

### Why this scales
| Operation | Where | Frequency | Storage |
|---|---|---|---|
| Credential issuance (KYC) | Third-party provider + Algorand | Once per user | On-chain permanent |
| Nonce generation | Cardless ID API (stateless) | Every verification | None — signed JWT |
| Algorand credential read | Wallet → Algorand node | Every verification | None |
| Proof submission | Cardless ID API | Every verification | TTL cache, 60s |
| Result polling | Cardless ID API | Every verification | TTL cache read |

No persistent DB writes on the verification path. The TTL cache evicts automatically.
Cardless ID server load = nonce generation + proof relay. Both are stateless and horizontally
scalable.

### Security properties
- **Replay prevention**: nonce is single-use (signed with server key + expiry)
- **Forgery prevention**: proof is signed by wallet's Algorand key — can't be faked without
  the private key
- **No personal data in transit**: proof contains only walletAddress + meetsRequirement boolean
- **Integrator backend optional**: pure frontend integration possible
- **Partner wallets**: allowed after audit — signing key is on-chain, so a rogue wallet app
  can't fake proofs without a valid credential

### Comparison to current code
| | Current (Firebase) | Intended |
|---|---|---|
| Server storage per verification | Firebase write (`integratorChallenges`) | TTL cache (60s) |
| Algorand queried by | Not queried (status field only) | Wallet (production) |
| Server queries Algorand? | No | No |
| Integrator needs backend? | Yes (API key, polling) | No |
| Proof signed cryptographically? | No | Yes |
| Replay protection | Firebase status field | Nonce + signature |

---

## SIOP-OID4VP Integration

### Decision
Adopt [Sphereon's SIOP-OID4VP](https://github.com/Sphereon-Opensource/SIOP-OID4VP) protocol
as the standard request/response envelope for age verification. This makes Cardless ID
interoperable with the broader W3C SSI ecosystem and positions the product for participation
in SSI pilot programs (e.g. eIDAS 2.0 wallet interop pilots).

### What SIOP-OID4VP adds
- Standardized QR/deep-link format (auth request URI) replacing the custom nonce QR
- Presentation Exchange: the relying party specifies required credential attributes as a
  structured query rather than a bare `minAge` integer
- Third-party wallet interoperability: any SIOP-compliant wallet can respond to verification
  requests, not just the Cardless ID app
- Signed Verifiable Presentation (VP) envelope replaces the custom `signedProof` object —
  same security properties, standard wire format

### The Algorand gap and how to close it
SIOP-OID4VP expects DID-based identifiers (`did:key`, `did:web`, `did:ethr`, etc.). Algorand
wallet addresses are not DIDs natively. **Solution: implement a `did:algo` DID resolver.**

A `did:algo` DID looks like `did:algo:XYZAQ5E3...` (the Algorand address). The resolver:
1. Takes the address portion
2. Reads the account state from an Algorand node
3. Returns a DID Document with the ed25519 public key extracted from the address

This is a thin read-only adapter (~50 lines). Once plugged into the SIOP-OID4VP resolver
chain, Algorand wallets are first-class DIDs.

### Protocol mapping
| Custom flow | SIOP-OID4VP equivalent |
|---|---|
| `GET /api/v/nonce` → signed JWT | RP creates signed Auth Request with nonce/state |
| QR encodes `{ nonce, minAge, returnUrl }` | QR encodes auth request URI |
| Wallet signs custom proof object | Wallet creates signed Verifiable Presentation (VP) |
| `POST /api/v/submit` | Wallet POSTs VP to `redirect_uri` |
| `GET /api/v/result/{nonce}` | RP validates VP; TTL cache relay unchanged |

The TTL cache relay pattern is unchanged. The difference is in the message format
(standard VP instead of custom JSON) and the request format (auth request URI instead of
bare nonce QR).

### NPM packages
- `@sphereon/ssi-sdk.siopv2-oid4vp-rp-auth` — relying party (server) side
- `@sphereon/ssi-sdk.siopv2-oid4vp-op-auth` — wallet (holder) side
- `@sphereon/did-resolver-algo` — `did:algo` resolver (may need to be built)

---

## Implementation Plan

### Phase 1 — Custom flow (ship first, no external deps)

These are the minimum changes to implement the intended architecture without SIOP.
Can be shipped independently; Phase 2 replaces the wire format but not the infrastructure.

#### New endpoints
- `GET /api/v/nonce` — stateless, returns signed nonce JWT (no DB)
  - Accepts optional `?siteId=` query param for integrator attribution
  - Logs `{ siteId, origin: Origin header, timestamp }` for usage analytics
- `POST /api/v/submit` — verifies nonce, stores `{nonce → signedProof}` in TTL cache
  - Logs `{ siteId (from nonce payload), origin, timestamp }` on successful submission
- `GET /api/v/result/:nonce` — reads from TTL cache, returns proof or 404

#### New utilities
- `app/utils/nonce.server.ts` — sign/verify nonce with HMAC-SHA256, 5-min expiry
  - Nonce payload includes `siteId` (if provided) so it's available at submit time without
    a DB lookup
- `app/utils/proof-cache.server.ts` — in-memory TTL Map (or Redis adapter), 60s eviction
- `app/utils/algorand-verify.ts` — verify Algorand ed25519 signature on proof

#### New client artifact
- `sdk/browser/cardlessid-verify.js` — CDN-loadable snippet
  - `new CardlessIDVerify({ minAge, onResult, siteId? })`
  - `siteId` is a public (non-secret) identifier — safe to embed in client JS
  - Falls back to `Origin` header server-side if `siteId` is omitted
  - Fetches nonce, renders QR, polls for result, calls `onResult(proof)`
  - ~5KB minified

#### Wallet changes
- `app/routes/app/wallet-verify.tsx` — replace mock `checkUserAge()` with real
  `getWalletCredentials()` call + ed25519 signing

#### Deprecate (keep for backward compat)
- `/api/integrator/challenge/*` — keep working, document as legacy
- `app/utils/integrator-challenges.server.ts` — keep writing to Firebase but mark as legacy;
  not required by new flow

### Phase 2 — SIOP-OID4VP wire format

Replaces the custom nonce/proof format with standard SIOP-OID4VP messages.
Infrastructure (TTL cache, proof relay endpoints) from Phase 1 is reused.

#### New utilities
- `app/utils/did-algo-resolver.ts` — `did:algo` DID resolver
  - Input: Algorand address
  - Output: W3C DID Document with ed25519 verification key
  - Reads account public key from Algorand node (stateless)
- `app/utils/siop-rp.server.ts` — SIOP-OID4VP relying party setup
  - Wraps `@sphereon/ssi-sdk.siopv2-oid4vp-rp-auth`
  - Registers `did:algo` resolver
  - Creates auth requests (replaces nonce JWT)
  - Validates VP responses (replaces custom proof verification)

#### Endpoint changes (Phase 2 replaces Phase 1 endpoints)
- `GET /api/v/nonce` → `GET /api/v/request` — returns SIOP auth request URI
- `POST /api/v/submit` → `POST /api/v/response` — accepts VP response, validates, caches
- `GET /api/v/result/:nonce` — unchanged (reads from TTL cache)

#### Wallet changes (additional)
- `app/routes/app/wallet-verify.tsx` — add SIOP VP construction using
  `@sphereon/ssi-sdk.siopv2-oid4vp-op-auth`; wrap existing ed25519 signing in VP envelope

### Instrumentation strategy
Goal: know which sites use the library and measure attempt → completion rates, without
requiring integrators to have a backend or keep a secret in the browser.

| Signal | How collected | Spoofable? | Notes |
|---|---|---|---|
| `siteId` query param | Snippet → `/api/v/nonce?siteId=` | Yes (client JS) | Sufficient for dashboards; not a security signal |
| `Origin` header | Browser enforces on cross-origin requests | Hard in browser | Reliable fallback for unregistered integrators |
| Nonce issued count | Log on `GET /api/v/nonce` | — | Measures verification attempts per site |
| Proof submitted count | Log on `POST /api/v/submit` | — | Measures completions; divide by nonce count = funnel |

Implementation: structured log line at nonce issuance and proof submission. No DB write.
A log aggregator (Datadog, CloudWatch, etc.) can group by `siteId` or `origin`.

---

## Documentation Changes

### File: `app/routes/docs/verification-protocol.tsx`

The page already reflects the intended custom flow (Phase 1). Changes needed for SIOP-OID4VP:

1. **Add a "Standards Compatibility" section** after the current "Partner Wallet Apps" section:
   - Explain that the verification protocol implements SIOP-OID4VP
   - Note that any SIOP-compliant wallet can participate after audit/review
   - Link to the W3C SIOPv2 and OID4VP specs

2. **Update the JS snippet examples** when Phase 2 ships:
   - The `onResult` proof shape changes from custom JSON to a W3C Verifiable Presentation
   - Add a `verifyVP()` helper example alongside the existing `verifyProof()` example

3. **Add a `did:algo` explainer** (short, in the Partner Wallet Apps section or a new section):
   - Algorand wallet addresses as DIDs
   - How the resolver maps address → DID Document

4. **Update the sequence diagram** when Phase 2 ships:
   - Step 2: "Snippet calls GET /api/v/request" (was `/api/v/nonce`)
   - Step 7: "Wallet POSTs Verifiable Presentation" (was `signedProof`)
   - Add SIOP-OID4VP label to the diagram

No other sections need changes for Phase 1. Phase 1 docs are already correct.

---

## Verification checklist

### Phase 1
- [ ] `npx tsc --noEmit` — no new errors
- [ ] `GET /api/v/nonce` returns signed JWT, no DB write
- [ ] `POST /api/v/submit` stores proof in TTL cache, evicts after 60s
- [ ] `GET /api/v/result/:nonce` returns proof or 404
- [ ] Snippet renders QR, polls, calls `onResult`
- [ ] No mention of Firebase in the new `/api/v/*` routes
- [ ] Structured logs appear at nonce issuance and proof submission
- [ ] Legacy `/api/integrator/challenge/*` still works

### Phase 2
- [ ] `did:algo` resolver returns valid DID Document for an Algorand address
- [ ] SIOP auth request URI encodes minAge via Presentation Exchange
- [ ] Wallet constructs valid VP using ed25519 Algorand key
- [ ] RP validates VP signature and on-chain credential check
- [ ] Third-party SIOP wallet (e.g. Sphereon wallet) can complete a verification
- [ ] Docs updated: Standards Compatibility section, updated sequence diagram
