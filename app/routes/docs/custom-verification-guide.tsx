import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import CodeBlock from "~/components/CodeBlock";

export const meta: MetaFunction = () => {
  return [
    { title: "Custom Verification Provider Guide - Cardless ID" },
    {
      name: "description",
      content:
        "Complete guide to building custom identity verification providers for Cardless ID",
    },
  ];
};

export default function CustomVerificationGuide() {
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
          Custom Verification Provider Guide
        </h1>
        <p className="text-lg text-gray-600">
          Build custom identity verification flows for Cardless ID credentials
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
            <a href="#provider-types" className="hover:underline">
              Provider Types
            </a>
          </li>
          <li>
            <a href="#architecture" className="hover:underline">
              Architecture Overview
            </a>
          </li>
          <li>
            <a href="#full-verification" className="hover:underline">
              Building a Full Verification Provider
            </a>
          </li>
          <li>
            <a href="#delegated-verification" className="hover:underline">
              Building a Delegated Verification Provider
            </a>
          </li>
          <li>
            <a href="#api-reference" className="hover:underline">
              API Reference
            </a>
          </li>
          <li>
            <a href="#security" className="hover:underline">
              Security Considerations
            </a>
          </li>
        </ul>
      </nav>

      {/* Overview */}
      <section id="overview" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          A verification provider is a module that handles the identity
          verification process and returns verified identity data. Cardless ID
          then uses this data to issue a W3C Verifiable Credential on the
          Algorand blockchain.
        </p>

        {/* Important Note */}
        <div className="bg-orange-50 border-l-4 border-orange-400 p-6 mb-6">
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
                Production Deployment & Issuer Registry
              </h3>
              <p className="text-orange-800 mb-3">
                Cardless ID uses a <strong>smart contract</strong> as a&nbsp;
                <Link to="/app/issuers">registry of allowed issuers</Link>. Only
                credentials issued by addresses in this registry will be
                recognized as valid by verifiers.
              </p>
              <p className="text-orange-800 mb-3">
                <strong>For production deployment:</strong> You must complete a
                security audit before we add your issuer address to the on-chain
                registry. This ensures the integrity of the Cardless ID
                ecosystem.
              </p>
              <p className="text-orange-800">
                <Link to="/contact">Contact us</Link> to request addition to the
                registry
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            Key Responsibilities
          </h3>
          <ul className="space-y-2 text-green-800">
            <li>✓ Verify user identity through your chosen method</li>
            <li>✓ Return standardized identity data</li>
            <li>✓ Provide verification quality metrics</li>
            <li>✓ Handle errors and edge cases</li>
          </ul>
        </div>
      </section>

      {/* Provider Types */}
      <section id="provider-types" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Provider Types
        </h2>

        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              1. Full Verification Provider
            </h3>
            <p className="text-gray-700 mb-4">
              A <strong>full verification provider</strong> implements a
              complete identity verification flow, similar to the default custom
              verification flow.
            </p>
            <h4 className="font-semibold text-gray-900 mb-2">
              Typical Components:
            </h4>
            <ul className="space-y-2 text-gray-700 mb-4 list-disc list-inside">
              <li>
                <strong>Document capture</strong> - Photo of government ID
              </li>
              <li>
                <strong>OCR/Data extraction</strong> - Extract name, DOB,
                document number
              </li>
              <li>
                <strong>Fraud detection</strong> - Check for fake or altered
                documents
              </li>
              <li>
                <strong>Biometric verification</strong> - Selfie capture and
                face matching
              </li>
              <li>
                <strong>Liveness detection</strong> - Ensure real person, not a
                photo
              </li>
            </ul>
            <h4 className="font-semibold text-gray-900 mb-2">Use Cases:</h4>
            <ul className="space-y-1 text-gray-700 list-disc list-inside">
              <li>
                Cloud-based verification (e.g., Stripe Identity, Persona,
                Onfido)
              </li>
              <li>Custom ML-based verification</li>
              <li>Hardware-based verification (NFC passport readers)</li>
              <li>Manual review workflows</li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              2. Delegated Verification Provider
            </h3>
            <p className="text-gray-700 mb-4">
              A <strong>delegated verification provider</strong> issues
              credentials based on existing verification from a trusted
              authority. The provider trusts that verification has already
              occurred and simply signs the credential.
            </p>
            <h4 className="font-semibold text-gray-900 mb-2">Use Cases:</h4>
            <ul className="space-y-1 text-gray-700 list-disc list-inside mb-4">
              <li>Banks issuing credentials for their customers</li>
              <li>Government agencies (DMV, Social Security Administration)</li>
              <li>Universities issuing student credentials</li>
              <li>Employers issuing employee credentials</li>
              <li>Healthcare providers issuing patient credentials</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                <strong>→</strong> See the{" "}
                <Link
                  to="/docs/delegated-verification"
                  className="underline font-medium"
                >
                  Delegated Verification Guide
                </Link>{" "}
                for detailed implementation instructions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Architecture Overview
        </h2>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          Provider Interface
        </h3>
        <p className="text-gray-700 mb-4">
          All verification providers must implement the{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">
            VerificationProvider
          </code>{" "}
          interface:
        </p>

        <CodeBlock language="typescript">{`interface VerificationProvider {
  name: string;

  // Create a new verification session
  createSession(sessionId: string): Promise<{
    authToken: string;
    providerSessionId: string;
  }>;

  // Process verification results
  processVerification(
    sessionId: string,
    providerData: any
  ): Promise<VerifiedIdentity>;

  // Optional: Handle webhooks from provider
  handleWebhook?(payload: any): Promise<void>;
}

interface VerifiedIdentity {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  documentNumber?: string;
  documentType?: 'drivers_license' | 'passport' | 'government_id';
  issuingCountry?: string;
  issuingState?: string;
  compositeHash: string; // Unique identifier

  // Verification quality metrics
  evidence: {
    fraudDetection?: {
      performed: boolean;
      passed: boolean;
      signals: string[];
    };
    documentAnalysis?: {
      bothSidesAnalyzed: boolean;
      lowConfidenceFields: string[];
      qualityLevel: 'high' | 'medium' | 'low';
    };
    biometricVerification?: {
      performed: boolean;
      faceMatch: boolean;
      faceMatchConfidence?: number;
      liveness: boolean;
      livenessConfidence?: number;
    };
  };
}`}</CodeBlock>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3 mt-8">
          Directory Structure
        </h3>
        <CodeBlock language="bash">{`app/
├── utils/
│   └── verification-providers/
│       ├── index.ts                    # Provider registry
│       ├── base-provider.ts            # Base class (optional)
│       ├── mock-provider.ts            # Development/testing
│       ├── custom-provider.ts          # Default custom verification
│       ├── stripe-identity-provider.ts # Example: Stripe Identity
│       └── delegated-provider.ts       # Example: Delegated auth
└── routes/
    └── api/
        ├── verification/
        │   ├── start.ts                # Create session
        │   ├── webhook.ts              # Handle provider webhooks
        │   └── status.$id.ts           # Check verification status
        └── custom-verification/
            ├── upload-id.ts            # Custom flow: ID upload
            └── upload-selfie.ts        # Custom flow: Selfie`}</CodeBlock>
      </section>

      {/* Full Verification Provider */}
      <section id="full-verification" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Building a Full Verification Provider
        </h2>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          Step 1: Create Provider File
        </h3>
        <p className="text-gray-700 mb-4">
          Create a new file in{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">
            app/utils/verification-providers/your-provider.ts
          </code>
          :
        </p>

        <CodeBlock language="typescript">{`import type { VerificationProvider, VerifiedIdentity } from '~/types/verification';
import { generateCompositeHash } from '~/utils/composite-hash.server';

export class YourVerificationProvider implements VerificationProvider {
  name = 'your-provider';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.YOUR_PROVIDER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[YourProvider] API key not configured');
    }
  }

  async createSession(sessionId: string): Promise<{
    authToken: string;
    providerSessionId: string;
  }> {
    // Call your provider's API to create a verification session
    const response = await fetch('https://api.yourprovider.com/verifications', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callback_url: \`\${process.env.BASE_URL}/api/verification/webhook\`,
        metadata: { cardless_session_id: sessionId }
      })
    });

    const data = await response.json();

    return {
      authToken: data.client_secret,
      providerSessionId: data.id
    };
  }

  async processVerification(
    sessionId: string,
    providerData: any
  ): Promise<VerifiedIdentity> {
    // Fetch verification results from your provider
    const response = await fetch(
      \`https://api.yourprovider.com/verifications/\${providerData.verification_id}\`,
      {
        headers: { 'Authorization': \`Bearer \${this.apiKey}\` }
      }
    );

    const verification = await response.json();

    // Map provider data to Cardless ID format
    const identity: VerifiedIdentity = {
      firstName: verification.user.first_name,
      lastName: verification.user.last_name,
      dateOfBirth: verification.user.date_of_birth,
      documentNumber: verification.document.number,
      documentType: this.mapDocumentType(verification.document.type),
      issuingCountry: verification.document.country,
      compositeHash: generateCompositeHash(
        verification.user.first_name,
        verification.user.last_name,
        verification.user.date_of_birth
      ),
      evidence: {
        fraudDetection: {
          performed: true,
          passed: verification.fraud_check.passed,
          signals: verification.fraud_check.signals || []
        },
        documentAnalysis: {
          bothSidesAnalyzed: verification.document.sides_captured === 2,
          lowConfidenceFields: [],
          qualityLevel: verification.document.quality
        },
        biometricVerification: {
          performed: true,
          faceMatch: verification.biometric.match,
          faceMatchConfidence: verification.biometric.confidence,
          liveness: verification.biometric.liveness_passed,
          livenessConfidence: verification.biometric.liveness_confidence
        }
      }
    };

    return identity;
  }

  private mapDocumentType(providerType: string): 'drivers_license' | 'passport' | 'government_id' {
    const mapping: Record<string, any> = {
      'driving_license': 'drivers_license',
      'passport': 'passport',
      'id_card': 'government_id'
    };
    return mapping[providerType] || 'government_id';
  }
}`}</CodeBlock>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3 mt-8">
          Step 2: Register Provider
        </h3>
        <p className="text-gray-700 mb-4">
          Add your provider to{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">
            app/utils/verification-providers/index.ts
          </code>
          :
        </p>

        <CodeBlock language="typescript">{`import { YourVerificationProvider } from './your-provider';

const providers = {
  mock: new MockProvider(),
  custom: new CustomProvider(),
  'your-provider': new YourVerificationProvider(),
};

export function getProvider(name?: string): VerificationProvider {
  const providerName = name || 'mock';
  const provider = providers[providerName];

  if (!provider) {
    console.warn(\`Provider "\${providerName}" not found, using mock\`);
    return providers.mock;
  }

  return provider;
}`}</CodeBlock>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3 mt-8">
          Step 3: Configure Environment
        </h3>
        <CodeBlock language="bash">{`YOUR_PROVIDER_API_KEY=sk_live_xxxxxxxxxxxxx`}</CodeBlock>

        <h3 className="text-2xl font-semibold text-gray-900 mb-3 mt-8">
          Step 4: Use Provider
        </h3>
        <CodeBlock language="typescript">{`// Start verification with your provider
const response = await fetch('/api/verification/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'your-provider' })
});

const { authToken, sessionId } = await response.json();

// Use authToken with your provider's SDK`}</CodeBlock>
      </section>

      {/* API Reference */}
      <section id="api-reference" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">API Reference</h2>

        <div className="space-y-8">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              POST /api/verification/start
            </h3>
            <p className="text-gray-700 mb-4">
              Create a new verification session.
            </p>

            <h4 className="font-semibold text-gray-900 mb-2">Request:</h4>
            <CodeBlock language="json">{`{
  "provider": "your-provider" // optional, defaults to "mock"
}`}</CodeBlock>

            <h4 className="font-semibold text-gray-900 mb-2 mt-4">Response:</h4>
            <CodeBlock language="json">{`{
  "sessionId": "session_1234567890_abc123",
  "authToken": "client_secret_xxx",
  "expiresAt": "2025-01-15T10:30:00Z",
  "provider": "your-provider"
}`}</CodeBlock>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              GET /api/verification/status/:sessionId
            </h3>
            <p className="text-gray-700 mb-4">
              Check verification session status.
            </p>

            <h4 className="font-semibold text-gray-900 mb-2">Response:</h4>
            <CodeBlock language="json">{`{
  "sessionId": "session_1234567890_abc123",
  "status": "pending" | "completed" | "failed",
  "provider": "your-provider",
  "verifiedData": { /* VerifiedIdentity if completed */ }
}`}</CodeBlock>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Security Considerations
        </h2>

        <div className="space-y-4">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              🚨 Mock Provider Production Protection
            </h3>
            <p className="text-red-800 text-sm mb-2">
              <strong>
                The mock verification provider is automatically blocked in
                production environments.
              </strong>
            </p>
            <ul className="space-y-1 text-red-800 text-sm">
              <li>
                • Mock provider throws an error if{" "}
                <code className="bg-red-100 px-1 rounded">
                  NODE_ENV=production
                </code>
              </li>
              <li>
                • In production, the default provider is{" "}
                <code className="bg-red-100 px-1 rounded">cardlessid</code>{" "}
                (Google Document AI + AWS)
              </li>
              <li>
                • Set{" "}
                <code className="bg-red-100 px-1 rounded">
                  VERIFICATION_PROVIDER
                </code>{" "}
                environment variable to override the default
              </li>
              <li>
                • Valid production values:{" "}
                <code className="bg-red-100 px-1 rounded">cardlessid</code>,{" "}
                <code className="bg-red-100 px-1 rounded">idenfy</code>,{" "}
                <code className="bg-red-100 px-1 rounded">stripe_identity</code>
                , <code className="bg-red-100 px-1 rounded">persona</code>,{" "}
                <code className="bg-red-100 px-1 rounded">custom</code>
              </li>
              <li>
                • To temporarily allow mock in production for testing (NOT
                RECOMMENDED), set{" "}
                <code className="bg-red-100 px-1 rounded">
                  ALLOW_MOCK_VERIFICATION=true
                </code>
              </li>
            </ul>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              API Key Management
            </h3>
            <ul className="space-y-1 text-red-800 text-sm">
              <li>• Store API keys in environment variables</li>
              <li>• Rotate keys regularly</li>
              <li>• Use separate keys for dev/staging/production</li>
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">
              Webhook Verification
            </h3>
            <ul className="space-y-1 text-orange-800 text-sm">
              <li>• Verify webhook signatures from providers</li>
              <li>• Use HTTPS for all webhook endpoints</li>
              <li>• Implement replay protection</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Data Retention
            </h3>
            <ul className="space-y-1 text-yellow-800 text-sm">
              <li>• Delete ID photos after verification</li>
              <li>• Store only minimal PII</li>
              <li>• Comply with GDPR/CCPA requirements</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Fraud Prevention
            </h3>
            <ul className="space-y-1 text-purple-800 text-sm">
              <li>• Implement rate limiting</li>
              <li>• Monitor for duplicate composite hashes</li>
              <li>• Log all verification attempts</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Related Docs */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Related Documentation
        </h2>
        <div className="space-y-2">
          <Link
            to="/docs/delegated-verification"
            className="block text-blue-600 hover:text-blue-800 hover:underline"
          >
            → Delegated Verification Guide
          </Link>
          <Link
            to="/docs/integration-guide"
            className="block text-blue-600 hover:text-blue-800 hover:underline"
          >
            → Integration Guide
          </Link>
          <Link
            to="/docs/credential-schema"
            className="block text-blue-600 hover:text-blue-800 hover:underline"
          >
            → Credential Schema Documentation
          </Link>
        </div>
      </section>
    </>
  );
}
