# Cardless ID — Express.js Example

A minimal Express.js app showing how to integrate Cardless ID age verification.

**No API key required.** The browser SDK handles QR rendering and polling client-side. The Express server is optional — it only adds server-side proof re-verification.

## Quick Start

```bash
npm install
node index.js
open http://localhost:3000
```

## How It Works

### Frontend (browser SDK)

The page loads `@cardlessid/verify` from the CDN. The SDK:

1. Calls `GET /api/v/nonce` on `cardlessid.org` to get a signed nonce
2. Renders a QR code encoding the deep link
3. Polls `GET /api/v/result/{nonce}` until the wallet submits a proof
4. Calls `onVerified({ meetsRequirement, walletAddress })` with the result

### Backend (optional)

The server exposes `POST /api/verify-proof` to re-verify the Algorand signature server-side. This is useful if you want to record the result in a database. The `verifyProof` logic is implemented inline using `tweetnacl` (no `algosdk` needed).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |

No `CARDLESSID_API_KEY` needed — age verification is public.

## Project Structure

```
.
├── index.js    # Express server + verifyProof helper
├── package.json
└── README.md
```

## Security Notes

- The proof is verified both client-side (in the browser SDK) and server-side (in `/api/verify-proof`)
- `verifyProof` checks the Algorand ed25519 signature and timestamp freshness — no network call
- The walletAddress in the proof is the user's Algorand address — you can use it as a stable identifier
- Never expose private keys or secrets on the frontend

## License

MIT
