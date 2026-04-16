import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import CodeBlock from "~/components/CodeBlock";

export const meta: MetaFunction = () => {
  return [
    { title: "Integration Guide - Cardless ID" },
    {
      name: "description",
      content:
        "Complete guide to integrating Cardless ID age verification into your application",
    },
  ];
};

export default function IntegrationGuide() {
  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/docs"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Cardless ID Age Verification — Integration Guide
        </h1>
        <p className="text-lg text-gray-600">
          Add age verification to any web page with a single script tag. No
          backend required. The signed proof is verified against the Algorand
          blockchain — no API key, no database writes per verification.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Table of Contents
        </h2>
        <ul className="space-y-2 text-blue-700">
          <li><a href="#overview" className="hover:underline">Overview</a></li>
          <li><a href="#quickstart" className="hover:underline">Quick Start</a></li>
          <li><a href="#snippet-api" className="hover:underline">JS Snippet API</a></li>
          <li><a href="#proof-verification" className="hover:underline">Verifying the Proof</a></li>
          <li>
            <a href="#rest-api" className="hover:underline">REST API</a>
            <ul className="ml-4 mt-1 space-y-1">
              <li><a href="#api-nonce" className="hover:underline text-sm">GET /api/v/nonce</a></li>
              <li><a href="#api-submit" className="hover:underline text-sm">POST /api/v/submit</a></li>
              <li><a href="#api-result" className="hover:underline text-sm">GET /api/v/result/:nonce</a></li>
            </ul>
          </li>
          <li><a href="#credential-apis" className="hover:underline">Credential APIs</a></li>
          <li><a href="#best-practices" className="hover:underline">Best Practices</a></li>
        </ul>
      </nav>

      {/* Overview */}
      <section id="overview" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          Cardless ID provides privacy-preserving age verification backed by
          Algorand. Users prove they meet an age requirement without revealing
          their actual birthdate. The integrator receives a cryptographically
          signed proof that can be verified independently against the blockchain.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            Key Properties
          </h3>
          <ul className="space-y-2 text-green-800">
            <li>✅ <strong>No backend required</strong> — drop in a script tag, done</li>
            <li>✅ <strong>No API key in the browser</strong> — security comes from the wallet's cryptographic signature</li>
            <li>✅ <strong>Privacy-preserving</strong> — proof contains only a boolean and a wallet address, never a birthdate</li>
            <li>✅ <strong>Replay-proof</strong> — nonces are signed and expire in 5 minutes</li>
            <li>✅ <strong>Blockchain-verifiable</strong> — integrator can confirm the wallet holds a valid credential on Algorand</li>
          </ul>
        </div>

        <div className="bg-orange-50 border-l-4 border-orange-400 p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">
            Issuer Registry
          </h3>
          <p className="text-orange-800">
            When verifying a proof, the on-chain check confirms the wallet's
            credential was issued by an address registered in the Cardless ID
            issuer registry smart contract. Only credentials from registered
            issuers are valid.{" "}
            <Link to="/docs/smart-contracts" className="underline font-medium">
              Smart Contract Architecture →
            </Link>
          </p>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Start</h2>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          CDN embed (simplest)
        </h3>
        <p className="text-gray-700 mb-4">
          Add one script tag and an element to mount to. No build step, no API
          key.
        </p>
        <div className="mb-6">
          <CodeBlock language="html">{`<script src="https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js"></script>
<div id="age-gate"></div>
<script>
  const verify = new CardlessIDVerify({
    minAge: 21,
    onVerified: function({ meetsRequirement }) {
      if (meetsRequirement) {
        // Age verified — grant access
        document.getElementById('protected-content').hidden = false;
      }
    }
  });
  verify.mount('#age-gate');
</script>`}</CodeBlock>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          npm / ES module
        </h3>
        <div className="mb-6">
          <CodeBlock language="bash">npm install @cardlessid/verify</CodeBlock>
        </div>
        <div className="mb-6">
          <CodeBlock language="typescript">{`import { CardlessIDVerify } from '@cardlessid/verify';

const verify = new CardlessIDVerify({
  minAge: 21,
  onVerified({ meetsRequirement, walletAddress }) {
    if (meetsRequirement) {
      // grant access
    }
  },
});

verify.mount('#age-gate');`}</CodeBlock>
        </div>
      </section>

      {/* JS Snippet API */}
      <section id="snippet-api" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">JS Snippet API</h2>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Option</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Required</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 font-mono text-sm">minAge</td>
                <td className="px-4 py-2">number</td>
                <td className="px-4 py-2">Yes</td>
                <td className="px-4 py-2">Minimum age to verify (1–150)</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-sm">onVerified</td>
                <td className="px-4 py-2">function</td>
                <td className="px-4 py-2">No</td>
                <td className="px-4 py-2">Called with <code className="bg-gray-100 px-1 rounded">{"{ meetsRequirement, walletAddress, proof }"}</code> — the simplified result</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-sm">onResult</td>
                <td className="px-4 py-2">function</td>
                <td className="px-4 py-2">No</td>
                <td className="px-4 py-2">Called with the raw <code className="bg-gray-100 px-1 rounded">SignedProof</code> — use to send proof to your backend for re-verification</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-sm">siteId</td>
                <td className="px-4 py-2">string</td>
                <td className="px-4 py-2">No</td>
                <td className="px-4 py-2">Public site identifier for usage analytics (not a secret)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>No API key needed.</strong> The JS snippet is public. Security
          is provided by the wallet's ed25519 signature and the on-chain
          credential — not by a secret embedded in the page.
        </div>
      </section>

      {/* Proof Verification */}
      <section id="proof-verification" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Verifying the Proof
        </h2>
        <p className="text-gray-700 mb-4">
          The <code className="bg-gray-100 px-1 rounded">onResult</code>{" "}
          callback receives a signed proof. At minimum, check{" "}
          <code className="bg-gray-100 px-1 rounded">
            proof.payload.meetsRequirement
          </code>
          . For higher assurance, verify the Algorand signature and the
          on-chain credential.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Client-side verification
        </h3>
        <div className="mb-6">
          <CodeBlock language="typescript">{`import { verifyProof } from '@cardlessid/verify';

const result = verifyProof(proof);

if (result.valid && result.payload.meetsRequirement) {
  // Age verified — signature and timestamp checked
}`}</CodeBlock>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Server-side verification (Node.js)
        </h3>
        <div className="mb-6">
          <CodeBlock language="typescript">{`import algosdk from 'algosdk';

function verifyProof(proof: SignedProof): boolean {
  const message = Buffer.from(JSON.stringify(proof.payload));
  const sigBytes = Buffer.from(proof.signature, 'base64url');

  // Verify ed25519 signature — algosdk.verifyBytes prepends the Algorand signing prefix
  return algosdk.verifyBytes(message, sigBytes, proof.payload.walletAddress);
}`}</CodeBlock>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Proof structure
        </h3>
        <div className="mb-6">
          <CodeBlock language="json">{`{
  "payload": {
    "nonce":            "eyJhbGciOiJIUzI1NiJ9...",
    "walletAddress":    "XYZAQ5E3EQFWMH3MQVK2BX...",
    "minAge":           21,
    "meetsRequirement": true,
    "timestamp":        1744829470000
  },
  "signature": "base64url-encoded-ed25519-signature"
}`}</CodeBlock>
        </div>
      </section>

      {/* REST API */}
      <section id="rest-api" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">REST API</h2>
        <p className="text-gray-700 mb-6">
          The JS snippet uses these endpoints internally. You only need to call
          them directly if you're building a custom wallet or integration.
        </p>

        <h3 id="api-nonce" className="text-2xl font-semibold text-gray-900 mb-3">
          GET /api/v/nonce
        </h3>
        <p className="text-gray-700 mb-4">
          Issues a signed, expiring nonce. No database write. No authentication
          required.
        </p>
        <div className="mb-4">
          <CodeBlock language="http">{`GET /api/v/nonce?minAge=21&siteId=my-site`}</CodeBlock>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <strong className="text-blue-900">Response:</strong>
          <pre className="mt-2 text-blue-800 text-sm">{`{
  "nonce": "eyJqdGkiOiJ...",
  "expiresIn": 300
}`}</pre>
        </div>

        <h3 id="api-submit" className="text-2xl font-semibold text-gray-900 mb-3">
          POST /api/v/submit
        </h3>
        <p className="text-gray-700 mb-4">
          Called by the wallet after signing a proof. Verifies the nonce and
          stores the proof in a 60-second TTL cache.
        </p>
        <div className="mb-4">
          <CodeBlock language="http">{`POST /api/v/submit
Content-Type: application/json

{
  "nonce": "eyJqdGkiOiJ...",
  "signedProof": {
    "payload": {
      "nonce": "eyJqdGkiOiJ...",
      "walletAddress": "XYZAQ5E3...",
      "minAge": 21,
      "meetsRequirement": true,
      "timestamp": 1744829470000
    },
    "signature": "base64url-encoded-ed25519-signature"
  }
}`}</CodeBlock>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <strong className="text-blue-900">Response:</strong>
          <pre className="mt-2 text-blue-800 text-sm">{`{ "success": true }`}</pre>
        </div>

        <h3 id="api-result" className="text-2xl font-semibold text-gray-900 mb-3">
          GET /api/v/result/:nonce
        </h3>
        <p className="text-gray-700 mb-4">
          Polls for a submitted proof. Returns 404 until the wallet submits.
          The snippet polls this every 1–2 seconds.
        </p>
        <div className="mb-4">
          <CodeBlock language="http">{`GET /api/v/result/eyJqdGkiOiJ...`}</CodeBlock>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <strong className="text-blue-900">Response (200 when found):</strong>
          <pre className="mt-2 text-blue-800 text-sm">{`{
  "proof": {
    "payload": { ... },
    "signature": "..."
  }
}`}</pre>
        </div>
      </section>

      {/* Credential APIs */}
      <section id="credential-apis" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Credential APIs</h2>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-3">
            Advanced / Internal Use
          </h3>
          <p className="text-orange-800">
            The Credential APIs are used by the Cardless ID system during KYC
            to issue credentials to user wallets. Most integrators never call
            these directly — they only receive the signed proof via the JS
            snippet. Only use these if you are an approved trusted issuer.
          </p>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          POST /api/credentials
        </h3>
        <p className="text-gray-700 mb-4">
          Issue a credential NFT to a user's wallet after successful identity
          verification.
        </p>
        <div className="mb-4">
          <CodeBlock language="http">{`POST /api/credentials
Content-Type: application/json

{
  "sessionId": "verification_session_id",
  "walletAddress": "ALGORAND_WALLET_ADDRESS",
  "birthdate": "YYYY-MM-DD",
  "demo": false
}`}</CodeBlock>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <strong className="text-blue-900">Response:</strong>
          <pre className="mt-2 text-blue-800 text-sm">{`{
  "success": true,
  "assetId": "123456789",
  "credentialUrl": "https://cardlessid.com/app/wallet-status/...",
  "explorerUrl": "https://testnet.explorer.perawallet.app/asset/123456789/"
}`}</pre>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          POST /api/credentials/transfer
        </h3>
        <p className="text-gray-700 mb-4">
          Transfer and freeze a credential NFT after the user has opted in.
        </p>
        <div className="mb-4">
          <CodeBlock language="http">{`POST /api/credentials/transfer
Content-Type: application/json

{
  "sessionId": "verification_session_id",
  "assetId": 123456789,
  "walletAddress": "ALGORAND_WALLET_ADDRESS"
}`}</CodeBlock>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <strong className="text-blue-900">Response:</strong>
          <pre className="mt-2 text-blue-800 text-sm">{`{
  "success": true,
  "assetId": "123456789",
  "transferTxId": "TRANSFER_TRANSACTION_ID",
  "freezeTxId": "FREEZE_TRANSACTION_ID"
}`}</pre>
        </div>
      </section>

      {/* Best Practices */}
      <section id="best-practices" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Best Practices
        </h2>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              ✅ Proof Verification
            </h3>
            <ul className="space-y-1 text-green-800">
              <li>• Always verify the Algorand signature server-side for sensitive decisions</li>
              <li>• Use <code className="bg-green-100 px-1 rounded">verifyProof(proof)</code> from <code className="bg-green-100 px-1 rounded">@cardlessid/verify</code> — it checks the ed25519 signature and timestamp</li>
              <li>• Check <code className="bg-green-100 px-1 rounded">proof.payload.timestamp</code> is recent (within 5 minutes)</li>
              <li>• Confirm <code className="bg-green-100 px-1 rounded">proof.payload.minAge</code> matches what you required</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              ✅ UX
            </h3>
            <ul className="space-y-1 text-blue-800">
              <li>• Show a loading state while the snippet polls for the result</li>
              <li>• Handle the case where the user closes the wallet without completing</li>
              <li>• Display a clear "scan with Cardless ID wallet" instruction near the QR code</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              ✅ Analytics
            </h3>
            <ul className="space-y-1 text-purple-800">
              <li>• Pass a <code className="bg-purple-100 px-1 rounded">siteId</code> to the snippet to track usage per site in the Cardless ID dashboard</li>
              <li>• The <code className="bg-purple-100 px-1 rounded">siteId</code> is public — it is not a secret and does not provide access</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Related Documentation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/docs/verification-protocol"
            className="border border-blue-200 bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors block"
          >
            <h3 className="font-semibold text-blue-900 mb-1">Verification Protocol</h3>
            <p className="text-blue-700 text-sm">
              Deep dive into the nonce, signed proof, and TTL cache relay architecture.
            </p>
          </Link>
          <Link
            to="/docs/smart-contracts"
            className="border border-indigo-200 bg-indigo-50 rounded-lg p-4 hover:bg-indigo-100 transition-colors block"
          >
            <h3 className="font-semibold text-indigo-900 mb-1">Smart Contract Architecture</h3>
            <p className="text-indigo-700 text-sm">
              How credentials are anchored to Algorand and the issuer registry.
            </p>
          </Link>
        </div>
      </section>
    </>
  );
}
