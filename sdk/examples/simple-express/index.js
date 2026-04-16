/**
 * Cardless ID Age Verification — Express.js example
 *
 * Demonstrates the stateless verification protocol:
 * - No API key required
 * - No backend session storage needed for the happy path
 * - The browser snippet handles QR rendering and polling
 *
 * This server does two things:
 *   1. Serves the HTML page (which loads the Cardless ID browser SDK)
 *   2. Provides an optional /api/verify-proof endpoint for server-side
 *      proof re-verification (useful if you want to record the result)
 *
 * To run:
 *   npm install
 *   node index.js
 *   open http://localhost:3000
 */

const express = require('express');

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Optional: server-side proof verification
//
// The browser SDK verifies the Algorand signature client-side using tweetnacl.
// If you also want to verify on the backend (e.g. to record the result),
// use this endpoint. It re-runs the same verification logic.
// ---------------------------------------------------------------------------

// Algorand base32 alphabet
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(addr) {
  const input = addr.replace(/=+$/, '').toUpperCase();
  let bits = 0, value = 0;
  const output = [];
  for (const char of input) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function algoAddressToPublicKey(address) {
  return base32Decode(address).slice(0, 32);
}

function base64urlToBuffer(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

// Verify an Algorand ed25519 proof without algosdk.
// Requires: npm install tweetnacl
function verifyProof(proof) {
  const nacl = require('tweetnacl');
  const { payload, signature } = proof;

  let sigBytes;
  try {
    sigBytes = base64urlToBuffer(signature);
  } catch {
    return { valid: false, error: 'invalid signature encoding' };
  }

  let publicKey;
  try {
    publicKey = algoAddressToPublicKey(payload.walletAddress);
  } catch {
    return { valid: false, error: 'invalid walletAddress' };
  }

  // algosdk.signBytes prepends [77, 88] ("MX") before signing
  const prefix = Buffer.from([77, 88]);
  const message = Buffer.from(JSON.stringify(payload));
  const toVerify = Buffer.concat([prefix, message]);

  const valid = nacl.sign.detached.verify(
    new Uint8Array(toVerify),
    new Uint8Array(sigBytes),
    new Uint8Array(publicKey)
  );

  if (!valid) return { valid: false, error: 'signature verification failed' };

  const age = Date.now() - payload.timestamp;
  if (age < 0 || age > 5 * 60 * 1000) {
    return { valid: false, error: 'proof timestamp out of acceptable window' };
  }

  return { valid: true, payload };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Serve the verification page
app.get('/', (req, res) => {
  const minAge = 21; // Change to your requirement

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Age Verification Demo</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 480px;
          margin: 60px auto;
          padding: 20px;
          text-align: center;
        }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        p  { color: #6b7280; }
        #age-gate { margin-top: 24px; }
        #result {
          display: none;
          margin-top: 24px;
          padding: 16px;
          border-radius: 8px;
        }
        #result.success { background: #d1fae5; color: #065f46; }
        #result.failure { background: #fee2e2; color: #7f1d1d; }
      </style>
    </head>
    <body>
      <h1>Age Verification Required</h1>
      <p>You must be ${minAge} or older to continue.</p>

      <div id="age-gate"></div>
      <div id="result"></div>

      <!-- Cardless ID browser SDK -->
      <script src="https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js"></script>
      <script>
        const verify = new CardlessIDVerify({
          minAge: ${minAge},

          onVerified({ meetsRequirement, walletAddress, proof }) {
            document.getElementById('age-gate').style.display = 'none';

            const result = document.getElementById('result');
            result.style.display = 'block';

            if (meetsRequirement) {
              result.className = 'success';
              result.textContent = 'Age verified. Access granted.';

              // Optional: send proof to your backend for server-side verification
              fetch('/api/verify-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proof),
              }).then(r => r.json()).then(data => {
                console.log('Backend verification:', data);
              });
            } else {
              result.className = 'failure';
              result.textContent = 'Age requirement not met. Access denied.';
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
  `);
});

// Optional: server-side proof re-verification
app.post('/api/verify-proof', (req, res) => {
  const proof = req.body;

  const result = verifyProof(proof);
  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  const { meetsRequirement, walletAddress, minAge } = result.payload;

  console.log('Verified proof:', { meetsRequirement, walletAddress, minAge });

  // Record the verification result in your database here if needed
  // e.g. db.verifications.insert({ walletAddress, meetsRequirement, minAge, at: new Date() })

  res.json({ meetsRequirement, walletAddress });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cardless ID demo running at http://localhost:${PORT}`);
});
