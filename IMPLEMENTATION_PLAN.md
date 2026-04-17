# Verification Protocol — Roadmap

## Status

**Phase 1 (custom flow) is complete and live.** The three stateless endpoints are shipped:
- `GET /api/v/nonce` — HMAC-signed nonce, no DB write
- `POST /api/v/submit` — verifies nonce, stores proof in 60s TTL cache
- `GET /api/v/result/:nonce` — reads from TTL cache

The wallet (`app/routes/app/wallet-verify.tsx`), browser SDK (`sdk/browser/`), and anti-spoofing on-chain check (`verifyProofOnChain`) are all live.

---

## Phase 2 — SIOP-OID4VP Wire Format

Replaces the custom nonce/proof format with standard [SIOP-OID4VP](https://github.com/Sphereon-Opensource/SIOP-OID4VP) messages. The TTL cache relay infrastructure from Phase 1 is reused unchanged.

### Motivation

- Standard QR/deep-link format (auth request URI) replaces the custom nonce QR
- Presentation Exchange lets the relying party specify required credential attributes as a structured query rather than a bare `minAge` integer
- Third-party wallet interoperability: any SIOP-compliant wallet can respond to verification requests
- Signed Verifiable Presentation (VP) replaces the custom `signedProof` — same security properties, standard wire format

### The Algorand gap

SIOP-OID4VP expects DID-based identifiers. Algorand addresses are not DIDs natively.
**Solution:** implement a `did:algo` DID resolver.

```
did:algo:XYZAQ5E3...   (the Algorand address)
→ reads account state from Algorand node
→ returns DID Document with ed25519 public key
```

This is a thin read-only adapter (~50 lines). Once plugged into the SIOP-OID4VP resolver chain, Algorand wallets are first-class DIDs.

### Protocol mapping

| Phase 1 | Phase 2 equivalent |
|---|---|
| `GET /api/v/nonce` → signed JWT | `GET /api/v/request` → SIOP auth request URI |
| QR encodes `{ nonce, minAge, returnUrl }` | QR encodes auth request URI |
| Wallet signs custom proof object | Wallet creates signed Verifiable Presentation (VP) |
| `POST /api/v/submit` | `POST /api/v/response` — accepts VP, validates, caches |
| `GET /api/v/result/:nonce` | Unchanged (reads from TTL cache) |

### NPM packages

- `@sphereon/ssi-sdk.siopv2-oid4vp-rp-auth` — relying party (server) side
- `@sphereon/ssi-sdk.siopv2-oid4vp-op-auth` — wallet (holder) side
- `@sphereon/did-resolver-algo` — `did:algo` resolver (may need to be built)

### New files needed

- `app/utils/did-algo-resolver.ts` — `did:algo` DID resolver
- `app/utils/siop-rp.server.ts` — SIOP-OID4VP relying party setup (wraps Sphereon SDK)
- New routes: `app/routes/api/v/request.ts`, `app/routes/api/v/response.ts`
- Wallet changes: `app/routes/app/wallet-verify.tsx` — add VP construction via `siopv2-oid4vp-op-auth`

### Documentation changes needed when Phase 2 ships

1. `app/routes/docs/verification-protocol.tsx` — add "Standards Compatibility" section, update sequence diagram, add `did:algo` explainer
2. Update JS snippet examples: `onResult` proof shape changes from custom JSON to W3C VP
3. Add `verifyVP()` helper example alongside existing `verifyProof()` example

### Phase 2 checklist

- [ ] `did:algo` resolver returns valid DID Document for an Algorand address
- [ ] SIOP auth request URI encodes minAge via Presentation Exchange
- [ ] Wallet constructs valid VP using ed25519 Algorand key
- [ ] RP validates VP signature and on-chain credential check
- [ ] Third-party SIOP wallet (e.g. Sphereon wallet) can complete a verification
- [ ] Docs updated: Standards Compatibility section, updated sequence diagram

---

## Wallet App Registry (DJS-19)

A planned on-chain registry to verify which *app* submitted a proof (not just which *address* holds a credential). See the "Future" section in `docs/MOBILE_CLIENT_INTEGRATION.md` for the full design.
