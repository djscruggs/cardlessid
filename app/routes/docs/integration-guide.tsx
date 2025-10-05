import type { MetaFunction } from "react-router";
import { Link } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Integration Guide - CardlessID" },
    {
      name: "description",
      content: "Complete guide to integrating CardlessID age verification into your application",
    },
  ];
};

export default function IntegrationGuide() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <Link to="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
              ← Back to Documentation
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              CardlessID Age Verification - Integration Guide
            </h1>
            <p className="text-lg text-gray-600">
              Complete guide to integrating secure, privacy-preserving age verification into your application
            </p>
          </div>

          {/* Table of Contents */}
          <nav className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Table of Contents</h2>
            <ul className="space-y-2 text-blue-700">
              <li><a href="#overview" className="hover:underline">Overview</a></li>
              <li><a href="#security" className="hover:underline">Security Model</a></li>
              <li><a href="#getting-started" className="hover:underline">Getting Started</a></li>
              <li><a href="#nodejs-sdk" className="hover:underline">Node.js SDK</a></li>
              <li><a href="#rest-api" className="hover:underline">REST API</a></li>
              <li><a href="#examples" className="hover:underline">Example Integrations</a></li>
              <li><a href="#best-practices" className="hover:underline">Best Practices</a></li>
            </ul>
          </nav>

          {/* Overview */}
          <section id="overview" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Overview</h2>
            <p className="text-gray-700 mb-4">
              CardlessID provides zero-knowledge age verification using decentralized identity credentials on the Algorand blockchain. Users prove they meet an age requirement without revealing their actual birthdate.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Key Features</h3>
              <ul className="space-y-2 text-green-800">
                <li>✅ <strong>Privacy-preserving</strong> - Only returns true/false</li>
                <li>✅ <strong>Secure challenge-response flow</strong> - Prevents tampering</li>
                <li>✅ <strong>Single-use verification tokens</strong> - Cannot be replayed</li>
                <li>✅ <strong>10-minute expiration</strong> - Time-limited challenges</li>
                <li>✅ <strong>Optional webhook callbacks</strong> - Real-time notifications</li>
              </ul>
            </div>
          </section>

          {/* Security Model */}
          <section id="security" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Security Model</h2>
            <p className="text-gray-700 mb-4">
              The verification flow uses a <strong>challenge-response pattern</strong> to prevent tampering:
            </p>
            <ol className="space-y-3 text-gray-700 mb-6 list-decimal list-inside">
              <li><strong>Your backend</strong> creates a challenge with your required age</li>
              <li>CardlessID generates a unique, single-use challenge ID</li>
              <li>User scans QR code with their wallet</li>
              <li>Wallet verifies age requirement and responds to CardlessID</li>
              <li><strong>Your backend</strong> polls or receives webhook to confirm verification</li>
              <li>Challenge cannot be reused or modified</li>
            </ol>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3">Why This Is Secure</h3>
              <ul className="space-y-2 text-yellow-800">
                <li>• Challenge ID is cryptographically tied to your minAge requirement</li>
                <li>• User cannot modify the age requirement (it's stored server-side)</li>
                <li>• Challenge is single-use and expires after 10 minutes</li>
                <li>• Only you (with your API key) can verify the challenge result</li>
              </ul>
            </div>
          </section>

          {/* Getting Started */}
          <section id="getting-started" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Getting Started</h2>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">1. Get Your API Key</h3>
            <p className="text-gray-700 mb-6">
              Contact CardlessID to receive your API key for production use.
            </p>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">2. Install the SDK</h3>
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-6 font-mono text-sm overflow-x-auto">
              npm install @cardlessid/verifier
            </div>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">3. Basic Usage</h3>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 font-mono text-sm overflow-x-auto">
              <pre>{`const CardlessID = require('@cardlessid/verifier');

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
}`}</pre>
            </div>
          </section>

          {/* Node.js SDK */}
          <section id="nodejs-sdk" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Node.js SDK</h2>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Constructor</h3>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 font-mono text-sm overflow-x-auto">
              <pre>{`const verifier = new CardlessID({
  apiKey: 'your_api_key',
  baseUrl: 'https://cardlessid.com' // optional
});`}</pre>
            </div>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">createChallenge(params)</h3>
            <p className="text-gray-700 mb-4">Creates a new age verification challenge.</p>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-4 font-mono text-sm overflow-x-auto">
              <pre>{`const challenge = await verifier.createChallenge({
  minAge: 21,
  callbackUrl: 'https://yourapp.com/webhook' // optional
});`}</pre>
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

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">verifyChallenge(challengeId)</h3>
            <p className="text-gray-700 mb-4">Checks the current status of a challenge.</p>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-4 font-mono text-sm overflow-x-auto">
              <pre>{`const result = await verifier.verifyChallenge(challengeId);`}</pre>
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

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">pollChallenge(challengeId, options)</h3>
            <p className="text-gray-700 mb-4">Polls a challenge until completed or expired.</p>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 font-mono text-sm overflow-x-auto">
              <pre>{`const result = await verifier.pollChallenge(challengeId, {
  interval: 2000,  // Poll every 2 seconds
  timeout: 600000  // 10 minute timeout
});`}</pre>
            </div>
          </section>

          {/* REST API */}
          <section id="rest-api" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">REST API</h2>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Authentication</h3>
            <p className="text-gray-700 mb-4">
              All API requests require your API key in the <code className="bg-gray-100 px-2 py-1 rounded">X-API-Key</code> header or request body.
            </p>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">POST /api/integrator/challenge/create</h3>
            <p className="text-gray-700 mb-4">Create a new verification challenge.</p>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-4 font-mono text-sm overflow-x-auto">
              <pre>{`POST /api/integrator/challenge/create
Content-Type: application/json

{
  "apiKey": "your_api_key",
  "minAge": 21,
  "callbackUrl": "https://yourapp.com/verify-callback"
}`}</pre>
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

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">GET /api/integrator/challenge/verify/:challengeId</h3>
            <p className="text-gray-700 mb-4">Verify a challenge status.</p>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-4 font-mono text-sm overflow-x-auto">
              <pre>{`GET /api/integrator/challenge/verify/:challengeId
X-API-Key: your_api_key`}</pre>
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
          </section>

          {/* Examples */}
          <section id="examples" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Example Integrations</h2>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Express.js Example</h3>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 font-mono text-sm overflow-x-auto">
              <pre>{`const express = require('express');
const CardlessID = require('@cardlessid/verifier');

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

app.listen(3000);`}</pre>
            </div>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Frontend Integration (React)</h3>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 font-mono text-sm overflow-x-auto">
              <pre>{`async function startAgeVerification() {
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
}`}</pre>
            </div>
          </section>

          {/* Best Practices */}
          <section id="best-practices" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Best Practices</h2>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">✅ Security</h3>
                <ul className="space-y-1 text-green-800">
                  <li>• Store API keys securely (use environment variables)</li>
                  <li>• Never commit API keys to version control</li>
                  <li>• Use HTTPS in production</li>
                  <li>• Validate all inputs on your backend</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">✅ Performance</h3>
                <ul className="space-y-1 text-blue-800">
                  <li>• Use webhooks instead of polling when possible</li>
                  <li>• Set appropriate polling intervals (2-5 seconds)</li>
                  <li>• Handle all status states: pending, approved, rejected, expired</li>
                  <li>• Implement proper timeout handling</li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">✅ Reliability</h3>
                <ul className="space-y-1 text-purple-800">
                  <li>• Log verification events for audit trails</li>
                  <li>• Rate limit verification attempts</li>
                  <li>• Handle network errors gracefully</li>
                  <li>• Use database/Redis for session storage (not in-memory)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Resources</h3>
                <ul className="space-y-2 text-blue-600">
                  <li><a href="https://github.com/cardlessid/cardlessid" className="hover:underline">GitHub Repository</a></li>
                  <li><Link to="/docs/credential-schema" className="hover:underline">Credential Schema Documentation</Link></li>
                  <li><Link to="/app/age-verify" className="hover:underline">Try Live Demo</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Support</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>📧 Email: support@cardlessid.com</li>
                  <li>🐛 Issues: GitHub Issues</li>
                  <li>💬 Community: Discord (coming soon)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
