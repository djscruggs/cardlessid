# Cardless ID SDK

Privacy-preserving age verification backed by Algorand blockchain credentials.

## Two Flows, Two Packages

| | Age Verification | Credential Issuance |
|---|---|---|
| **Use case** | Gate content, confirm 18+/21+ | Issue a verifiable credential after KYC |
| **Package** | `@cardlessid/verify` | `@cardlessid/verifier` (legacy) |
| **API key** | Not required | Required |
| **Backend** | Not required | Required |
| **Endpoints** | `/api/v/*` | `/api/verification/*` |

---

## Age Verification — `@cardlessid/verify`

The simplest integration: drop a `<script>` tag, get a verified `true`/`false`.

### Script tag (no build step)

```html
<div id="age-gate"></div>

<script src="https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js"></script>
<script>
  const verify = new CardlessIDVerify({
    minAge: 21,
    onVerified({ meetsRequirement, walletAddress }) {
      if (meetsRequirement) {
        document.getElementById('age-gate').innerHTML = '<p>Access granted.</p>';
      }
    },
  });
  verify.mount('#age-gate');
</script>
```

The widget fetches a nonce, renders a QR code, and polls for the result — all client-side. No backend or API key needed.

### npm

```bash
npm install @cardlessid/verify
```

```js
import { CardlessIDVerify } from '@cardlessid/verify';

const verify = new CardlessIDVerify({
  minAge: 21,
  onVerified({ meetsRequirement, walletAddress }) {
    console.log('Meets requirement:', meetsRequirement);
  },
  onResult(proof) {
    // Optional: send proof to your backend for server-side re-verification
    await fetch('/api/verify', { method: 'POST', body: JSON.stringify(proof) });
  },
});

verify.mount('#container');
```

### Headless API

For custom UI:

```js
const { nonce, deepLink } = await verify.getNonce();
// Render deepLink as QR code yourself

const proof = await verify.pollForResult(nonce);
// proof is a SignedProof — verify client-side or send to backend
```

### How it works

```
1. Snippet calls GET /api/v/nonce?minAge=21
   ← Server returns a signed, expiring nonce (no DB write)

2. Snippet renders QR encoding the deep link:
   https://cardlessid.org/app/wallet-verify?nonce=...&minAge=21

3. User scans QR with Cardless ID wallet

4. Wallet reads credential from Algorand blockchain,
   checks if birthdate satisfies minAge, signs a proof

5. Wallet POSTs signed proof to POST /api/v/submit

6. Snippet polls GET /api/v/result/{nonce}
   ← Returns SignedProof once available

7. onVerified fires with { meetsRequirement, walletAddress }
```

No personal data transits your servers. The proof contains only `meetsRequirement: boolean` and the wallet address.

### Verifying proofs server-side

If you want to re-verify on your backend:

```js
import { verifyProof } from '@cardlessid/verify';

const result = verifyProof(proof);
if (result.valid) {
  console.log('Wallet:', result.payload.walletAddress);
  console.log('Meets requirement:', result.payload.meetsRequirement);
}
```

`verifyProof` checks the Algorand ed25519 signature and timestamp without any network call.

---

## Credential Issuance — `@cardlessid/verifier`

> **Note:** This package wraps the legacy `/api/integrator/challenge/*` endpoints. It is kept for backward compatibility but not recommended for new integrations. Use `@cardlessid/verify` for age verification.

Requires an API key. Contact Cardless ID to obtain one.

```bash
npm install @cardlessid/verifier
```

```js
const CardlessIDVerifier = require('@cardlessid/verifier');

const verifier = new CardlessIDVerifier({
  apiKey: process.env.CARDLESSID_API_KEY,
});

const challenge = await verifier.createChallenge({ minAge: 21 });
console.log('Show QR:', challenge.qrCodeUrl);

const result = await verifier.pollChallenge(challenge.challengeId);
if (result.verified) console.log('Verified');
```

---

## Documentation

- **[Integration Guide](./INTEGRATION_GUIDE.md)** — full API reference and examples
- **[Wallet Developer Guide](./WALLET_README.md)** — building a compatible wallet app
- **[Browser SDK source](./browser/src/index.ts)** — TypeScript source with JSDoc

## Directory Structure

```
sdk/
├── browser/              # @cardlessid/verify — browser/npm package
│   ├── src/index.ts      # TypeScript source
│   ├── dist/             # Built outputs (IIFE, ESM, CJS)
│   ├── build.mjs         # esbuild build script
│   └── package.json
├── node/                 # @cardlessid/verifier — legacy Node.js SDK
│   ├── cardlessid-verifier.js
│   ├── cardlessid-verifier.d.ts
│   └── package.json
├── examples/
│   └── simple-express/   # Express.js integration example
├── README.md             # This file
├── INTEGRATION_GUIDE.md  # Full API and integration docs
└── WALLET_README.md      # Wallet app developer guide
```

## Security

- Proofs are signed with the wallet's Algorand ed25519 key — unforgeable without the private key
- Nonces are single-use with 5-minute expiry — replay attacks are prevented
- No personal data (name, birthdate) is shared — only `meetsRequirement: boolean`
- No API key or backend required for integrators — reduces your attack surface

## Support

- **Issues**: https://github.com/djscruggs/cardlessid/issues
- **Email**: me@derekscruggs.com

## License

MIT
