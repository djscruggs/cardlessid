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
          Cardless ID Age Verification - Integration Guide
        </h1>
        <p className="text-lg text-gray-600">
          Complete guide to integrating secure, privacy-preserving age
          verification into your application
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Table of Contents
        </h2>
        <ul className="space-y-2 text-blue-700">
          <li>
            <a href="#overview" className="hover:underline">
              Overview
            </a>
          </li>
          <li>
            <a href="#security" className="hover:underline">
              Security Model
            </a>
          </li>
          <li>
            <a href="#getting-started" className="hover:underline">
              Getting Started
            </a>
          </li>
          <li>
            <a href="#nodejs-sdk" className="hover:underline">
              Node.js SDK
            </a>
          </li>
          <li>
            <a href="#rest-api" className="hover:underline">
              REST API
            </a>
            <ul className="ml-4 mt-1 space-y-1">
              <li>
                <a href="#integrator-apis" className="hover:underline text-sm">
                  Integrator APIs
                </a>
              </li>
              <li>
                <a href="#credential-apis" className="hover:underline text-sm">
                  Credential APIs
                </a>
              </li>
            </ul>
          </li>
          <li>
            <a href="#examples" className="hover:underline">
              Example Integrations
            </a>
          </li>
          <li>
            <a href="#best-practices" className="hover:underline">
              Best Practices
            </a>
          </li>
        </ul>
      </nav>

      {/* Overview */}
      <section id="overview" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          Cardless ID provides zero-knowledge age verification using
          decentralized identity credentials on the Algorand blockchain. Users
          prove they meet an age requirement without revealing their actual
          birthdate.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            Key Features
          </h3>
          <ul className="space-y-2 text-green-800">
            <li>
              ✅ <strong>Privacy-preserving</strong> - Only returns true/false
            </li>
            <li>
              ✅ <strong>Secure challenge-response flow</strong> - Prevents
              tampering
            </li>
            <li>
              ✅ <strong>Single-use verification tokens</strong> - Cannot be
              replayed
            </li>
            <li>
              ✅ <strong>10-minute expiration</strong> - Time-limited challenges
            </li>
            <li>
              ✅ <strong>Optional webhook callbacks</strong> - Real-time
              notifications
            </li>
          </ul>
        </div>
      </section>

      {/* Security Model */}
      <section id="security" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Security Model
        </h2>
        <p className="text-gray-700 mb-4">
          The verification flow uses a{" "}
          <strong>challenge-response pattern</strong> to prevent tampering:
        </p>
        <ol className="space-y-3 text-gray-700 mb-6 list-decimal list-inside">
          <li>
            <strong>Your backend</strong> creates a challenge with your required
            age
          </li>
          <li>Cardless ID generates a unique, single-use challenge ID</li>
          <li>User scans QR code with their wallet</li>
          <li>Wallet verifies age requirement and responds to Cardless ID</li>
          <li>
            <strong>Your backend</strong> polls or receives webhook to confirm
            verification
          </li>
          <li>Challenge cannot be reused or modified</li>
        </ol>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            Why This Is Secure
          </h3>
          <ul className="space-y-2 text-yellow-800">
            <li>
              • Challenge ID is cryptographically tied to your minAge
              requirement
            </li>
            <li>
              • User cannot modify the age requirement (it's stored server-side)
            </li>
            <li>• Challenge is single-use and expires after 10 minutes</li>
            <li>
              • Only you (with your API key) can verify the challenge result
            </li>
          </ul>
        </div>

        {/* Issuer Registry Note */}
        <div className="bg-orange-50 border-l-4 border-orange-400 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                Credential Verification & Issuer Registry
              </h3>
              <p className="text-orange-800 mb-3">
                When verifying a user's credential, the Cardless ID system
                checks that the credential was issued by a trusted source. An{" "}
                <strong>Algorand smart contract</strong> maintains a registry of
                approved issuer addresses. Only credentials from registered
                issuers are considered valid.
              </p>
              <p className="text-orange-800">
                This ensures that all credentials in the ecosystem meet Cardless
                ID's security and verification standards. If you're building
                your own verification system, see the{" "}
                <Link
                  to="/docs/custom-verification-guide"
                  className="underline font-medium"
                >
                  Custom Verification Provider Guide
                </Link>{" "}
                for information about the registry approval process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section id="getting-started" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Getting Started
        </h2>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          1. Get Your API Key
        </h3>
        <p className="text-gray-700 mb-6">
          <Link to="/contact">Contact Cardless ID</Link> to receive your API key
          for production use.
        </p>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          2. Install the SDK
        </h3>
        <div className="mb-6">
          <CodeBlock language="bash">
            npm install @cardlessid/verifier
          </CodeBlock>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          3. Basic Usage
        </h3>
        <div className="mb-6">
          <CodeBlock language="javascript">{`const Cardless ID = require('@cardlessid/verifier');

const verifier = new CardlessID({
  apiKey: process.env.CARDLESSID_API_KEY
});

// Create challenge
const challenge = await verifier.createChallenge({ minAge: 21 });

// Show QR code to user
console.log('Scan this:', challenge.qrCodeUrl);

// Poll for result
const result = await verifier.pollChallenge(challenge.challengeId);

if (result.verified) {
  console.log('User is 21+');
}`}</CodeBlock>
        </div>
      </section>

      {/* Node.js SDK */}
      <section id="nodejs-sdk" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Node.js SDK</h2>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          Constructor
        </h3>
        <div className="mb-6">
          <CodeBlock language="javascript">{`const verifier = new Cardless ID({
  apiKey: 'your_api_key',
  baseUrl: 'https://cardlessid.com' // optional
});`}</CodeBlock>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          createChallenge(params)
        </h3>
        <p className="text-gray-700 mb-4">
          Creates a new age verification challenge.
        </p>
        <div className="mb-4">
          <CodeBlock language="javascript">{`const challenge = await verifier.createChallenge({
  minAge: 21,
  callbackUrl: 'https://yourapp.com/webhook' // optional
});`}</CodeBlock>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <strong className="text-blue-900">Returns:</strong>
          <pre className="mt-2 text-blue-800 text-sm">{`{
  challengeId: 'chal_1234567890_abc123',
  qrCodeUrl: 'https://cardlessid.com/app/age-verify?challenge=...',
  deepLinkUrl: 'cardlessid://verify?challenge=...',
  createdAt: 1234567890000,
  expiresAt: 1234568490000
}`}</pre>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          verifyChallenge(challengeId)
        </h3>
        <p className="text-gray-700 mb-4">
          Checks the current status of a challenge.
        </p>
        <div className="mb-4">
          <CodeBlock language="javascript">{`const result = await verifier.verifyChallenge(challengeId);`}</CodeBlock>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <strong className="text-blue-900">Returns:</strong>
          <pre className="mt-2 text-blue-800 text-sm">{`{
  challengeId: 'chal_1234567890_abc123',
  verified: true,
  status: 'approved', // pending | approved | rejected | expired
  minAge: 21,
  walletAddress: 'ALGORAND_ADDRESS...',
  createdAt: 1234567890000,
  expiresAt: 1234568490000,
  respondedAt: 1234568123000
}`}</pre>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          pollChallenge(challengeId, options)
        </h3>
        <p className="text-gray-700 mb-4">
          Polls a challenge until completed or expired.
        </p>
        <div className="mb-6">
          <CodeBlock language="javascript">{`const result = await verifier.pollChallenge(challengeId, {
  interval: 2000,  // Poll every 2 seconds
  timeout: 600000  // 10 minute timeout
});`}</CodeBlock>
        </div>
      </section>

      {/* REST API */}
      <section id="rest-api" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">REST API</h2>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          Authentication
        </h3>
        <p className="text-gray-700 mb-4">
          All API requests require your API key in the{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">X-API-Key</code>{" "}
          header or request body.
        </p>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">
            API Categories
          </h3>
          <ul className="space-y-2 text-purple-800">
            <li>
              <strong>Integrator APIs</strong> - For verifying users' existing credentials (challenge/response)
            </li>
            <li>
              <strong>Credential APIs</strong> - For issuing new credentials to users (internal/advanced use)
            </li>
          </ul>
        </div>

        <h2 id="integrator-apis" className="text-3xl font-bold text-gray-900 mb-6">Integrator APIs</h2>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          POST /api/integrator/challenge/create
        </h3>
        <p className="text-gray-700 mb-4">
          Create a new verification challenge.
        </p>
        <div className="mb-4">
          <CodeBlock language="http">{`POST /api/integrator/challenge/create
Content-Type: application/json

{
  "apiKey": "your_api_key",
  "minAge": 21,
  "callbackUrl": "https://yourapp.com/verify-callback"
}`}</CodeBlock>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <strong className="text-blue-900">Response:</strong>
          <pre className="mt-2 text-blue-800 text-sm">{`{
  "challengeId": "chal_1234567890_abc123",
  "qrCodeUrl": "https://cardlessid.com/app/age-verify?challenge=...",
  "deepLinkUrl": "cardlessid://verify?challenge=...",
  "createdAt": 1234567890000,
  "expiresAt": 1234568490000
}`}</pre>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          GET /api/integrator/challenge/verify/:challengeId
        </h3>
        <p className="text-gray-700 mb-4">Verify a challenge status.</p>
        <div className="mb-4">
          <CodeBlock language="http">{`GET /api/integrator/challenge/verify/:challengeId
X-API-Key: your_api_key`}</CodeBlock>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <strong className="text-blue-900">Response:</strong>
          <pre className="mt-2 text-blue-800 text-sm">{`{
  "challengeId": "chal_1234567890_abc123",
  "verified": true,
  "status": "approved",
  "minAge": 21,
  "walletAddress": "ALGORAND_ADDRESS...",
  "createdAt": 1234567890000,
  "expiresAt": 1234568490000,
  "respondedAt": 1234568123000
}`}</pre>
        </div>

        <h2 id="credential-apis" className="text-3xl font-bold text-gray-900 mb-6 mt-12">Credential APIs</h2>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-3">
            Advanced Use Only
          </h3>
          <p className="text-orange-800">
            The Credential APIs are used internally by the Cardless ID system to issue new credentials.
            Most integrators should use the Integrator APIs above. Only use these endpoints if you're
            building a custom verification flow or have been approved as a trusted issuer.
          </p>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          POST /api/credentials
        </h3>
        <p className="text-gray-700 mb-4">
          Issue a new credential NFT to a user's wallet after successful verification.
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
  "optInUrl": "https://cardlessid.com/app/optin/...",
  "explorerUrl": "https://testnet.explorer.perawallet.app/asset/123456789/"
}`}</pre>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-yellow-900 mb-2">Security Notes:</h4>
          <ul className="space-y-2 text-yellow-800 text-sm">
            <li>• Session validation ensures only verified users receive credentials</li>
            <li>• AssetId is stored in the session for transfer validation</li>
            <li>• Each session can only issue one credential (prevents replay attacks)</li>
            <li>• Birthdate is never stored - only used to generate the credential hash</li>
          </ul>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          POST /api/credentials/transfer
        </h3>
        <p className="text-gray-700 mb-4">
          Transfer and freeze credential NFT after user has opted in to receive it.
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
  "freezeTxId": "FREEZE_TRANSACTION_ID",
  "explorerUrls": {
    "transfer": "https://testnet.explorer.perawallet.app/tx/...",
    "freeze": "https://testnet.explorer.perawallet.app/tx/..."
  }
}`}</pre>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-red-900 mb-2">Important Security Features:</h4>
          <ul className="space-y-2 text-red-800 text-sm">
            <li>• <strong>Session Validation:</strong> Only transfers to the wallet that completed verification</li>
            <li>• <strong>Asset Validation:</strong> Only transfers the assetId that was issued in this session</li>
            <li>• <strong>Single Use:</strong> Each session can only transfer once (prevents replay attacks)</li>
            <li>• <strong>NFT Freeze:</strong> Credential is frozen after transfer to prevent tampering</li>
          </ul>
          <p className="mt-3 text-red-800 font-medium">
            These security measures were added to prevent unauthorized credential transfers and ensure
            that credentials can only be issued to verified users.
          </p>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Example Integrations
        </h2>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          Express.js Example
        </h3>
        <div className="mb-6">
          <CodeBlock language="javascript">{`const express = require('express');
const Cardless ID = require('@cardlessid/verifier');

const app = express();
const verifier = new CardlessID({
  apiKey: process.env.CARDLESSID_API_KEY
});

// Start verification
app.post('/verify-age', async (req, res) => {
  const challenge = await verifier.createChallenge({
    minAge: 21
  });

  res.json({
    qrCodeUrl: challenge.qrCodeUrl,
    challengeId: challenge.challengeId
  });
});

// Check verification status
app.get('/verify-status/:challengeId', async (req, res) => {
  const result = await verifier.verifyChallenge(req.params.challengeId);

  res.json({
    verified: result.verified,
    status: result.status
  });
});

app.listen(3000);`}</CodeBlock>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          Frontend Integration (React)
        </h3>
        <div className="mb-6">
          <CodeBlock language="javascript">{`async function startAgeVerification() {
  // Create challenge via your backend
  const response = await fetch('/verify-age', {
    method: 'POST'
  });

  const { challengeId, qrCodeUrl } = await response.json();

  // Show QR code to user
  showQRCode(qrCodeUrl);

  // Poll for completion
  const pollInterval = setInterval(async () => {
    const statusRes = await fetch(\`/verify-status/\${challengeId}\`);
    const status = await statusRes.json();

    if (status.status === 'approved') {
      clearInterval(pollInterval);
      onVerificationSuccess();
    } else if (status.status === 'rejected' || status.status === 'expired') {
      clearInterval(pollInterval);
      onVerificationFailed();
    }
  }, 2000);
}`}</CodeBlock>
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
              ✅ Security
            </h3>
            <ul className="space-y-1 text-green-800">
              <li>• Store API keys securely (use environment variables)</li>
              <li>• Never commit API keys to version control</li>
              <li>• Use HTTPS in production</li>
              <li>• Validate all inputs on your backend</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              ✅ Performance
            </h3>
            <ul className="space-y-1 text-blue-800">
              <li>• Use webhooks instead of polling when possible</li>
              <li>• Set appropriate polling intervals (2-5 seconds)</li>
              <li>
                • Handle all status states: pending, approved, rejected, expired
              </li>
              <li>• Implement proper timeout handling</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              ✅ Reliability
            </h3>
            <ul className="space-y-1 text-purple-800">
              <li>• Log verification events for audit trails</li>
              <li>• Rate limit verification attempts</li>
              <li>• Handle network errors gracefully</li>
              <li>• Use database/Redis for session storage (not in-memory)</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
