import type { MetaFunction } from "react-router";
import CardlessCredential from "~/components/credentials/w3c-minimal";
import {
  CARDLESS_FIELDS,
  SCHEMA_VERSION,
  SCHEMA_DESCRIPTION,
  USAGE_NOTES,
} from "~/utils/credential-schema";
import CodeBlock from "~/components/CodeBlock";

export const meta: MetaFunction = () => {
  return [
    { title: "Cardless ID Credential Schema Documentation" },
    {
      name: "description",
      content: "W3C Verifiable Credential schema for Cardless ID identity verification",
    },
  ];
};

export default function CredentialSchemaDocs() {
  return (
    <>
      <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Cardless ID Credential Schema
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Version {SCHEMA_VERSION}
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <p className="text-blue-800">{SCHEMA_DESCRIPTION}</p>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Schema Overview
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                W3C Verifiable Credential Structure
              </h3>
              <CodeBlock language="json">
                {JSON.stringify(CardlessCredential, null, 2)}
              </CodeBlock>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Field Definitions
            </h2>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  cardlessid:compositeHash
                </h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {CARDLESS_FIELDS.compositeHash.type}
                    </code>
                  </p>
                  <p>
                    <span className="font-medium">Description:</span>{" "}
                    {CARDLESS_FIELDS.compositeHash.description}
                  </p>
                  <p>
                    <span className="font-medium">Purpose:</span>{" "}
                    {CARDLESS_FIELDS.compositeHash.purpose}
                  </p>
                  <p>
                    <span className="font-medium">Example:</span>{" "}
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {CARDLESS_FIELDS.compositeHash.example}
                    </code>
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  evidence (W3C Standard)
                </h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {CARDLESS_FIELDS.evidence.type}
                    </code>
                  </p>
                  <p>
                    <span className="font-medium">Description:</span>{" "}
                    {CARDLESS_FIELDS.evidence.description}
                  </p>
                  <p>
                    <span className="font-medium">Purpose:</span>{" "}
                    {CARDLESS_FIELDS.evidence.purpose}
                  </p>
                  <div className="mt-4">
                    <p className="font-medium mb-2">Structure:</p>
                    <div className="bg-gray-50 p-4 rounded space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">fraudDetection:</p>
                        <ul className="ml-4 space-y-1 text-gray-600">
                          <li>• performed: {CARDLESS_FIELDS.evidence.structure.fraudDetection.performed}</li>
                          <li>• passed: {CARDLESS_FIELDS.evidence.structure.fraudDetection.passed}</li>
                          <li>• method: {CARDLESS_FIELDS.evidence.structure.fraudDetection.method}</li>
                          <li>• provider: {CARDLESS_FIELDS.evidence.structure.fraudDetection.provider}</li>
                          <li>• signals: {CARDLESS_FIELDS.evidence.structure.fraudDetection.signals}</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">documentAnalysis:</p>
                        <ul className="ml-4 space-y-1 text-gray-600">
                          <li>• provider: {CARDLESS_FIELDS.evidence.structure.documentAnalysis.provider}</li>
                          <li>• bothSidesAnalyzed: {CARDLESS_FIELDS.evidence.structure.documentAnalysis.bothSidesAnalyzed}</li>
                          <li>• lowConfidenceFields: {CARDLESS_FIELDS.evidence.structure.documentAnalysis.lowConfidenceFields}</li>
                          <li>• qualityLevel: {CARDLESS_FIELDS.evidence.structure.documentAnalysis.qualityLevel}</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">biometricVerification:</p>
                        <ul className="ml-4 space-y-1 text-gray-600">
                          <li>• performed: {CARDLESS_FIELDS.evidence.structure.biometricVerification.performed}</li>
                          <li>• faceMatch: {CARDLESS_FIELDS.evidence.structure.biometricVerification.faceMatch}</li>
                          <li>• liveness: {CARDLESS_FIELDS.evidence.structure.biometricVerification.liveness}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Usage Guidelines
            </h2>
            <div className="space-y-6">
              <div className="border-l-4 border-green-400 bg-green-50 p-4">
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  Verification
                </h3>
                <p className="text-green-800">{USAGE_NOTES.verification}</p>
              </div>

              <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Wallet Integration
                </h3>
                <p className="text-blue-800">{USAGE_NOTES.wallet}</p>
              </div>

              <div className="border-l-4 border-purple-400 bg-purple-50 p-4">
                <h3 className="text-lg font-medium text-purple-900 mb-2">
                  Extension
                </h3>
                <p className="text-purple-800">{USAGE_NOTES.extension}</p>
              </div>

              <div className="border-l-4 border-orange-400 bg-orange-50 p-4">
                <h3 className="text-lg font-medium text-orange-900 mb-2">
                  Cryptographic Proof
                </h3>
                <p className="text-orange-800">{USAGE_NOTES.proof}</p>
              </div>

              <div className="border-l-4 border-indigo-400 bg-indigo-50 p-4">
                <h3 className="text-lg font-medium text-indigo-900 mb-2">
                  Evidence & Verification Quality
                </h3>
                <p className="text-indigo-800">{USAGE_NOTES.evidence}</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              API Endpoints
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Schema Endpoint
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">URL:</span>{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    GET /api/credentials/schema
                  </code>
                </p>
                <p>
                  <span className="font-medium">Returns:</span> Complete schema
                  definition with field descriptions and usage notes
                </p>
                <p>
                  <span className="font-medium">CORS:</span> Enabled for
                  third-party access
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Security Considerations
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <ul className="space-y-2 text-red-800">
                <li>
                  • <strong>Signature Verification:</strong> Always verify the
                  Ed25519 signature before trusting any credential
                </li>
                <li>
                  • <strong>Issuer Validation:</strong> Verify the issuer DID
                  corresponds to a known, trusted Algorand address
                </li>
                <li>
                  • <strong>Composite Hash:</strong> Use the composite hash to
                  prevent duplicate credentials from the same person
                </li>
                <li>
                  • <strong>Evidence Verification:</strong> Check the evidence
                  property for verification quality - use qualityLevel (high/medium/low)
                  for risk-based acceptance decisions
                </li>
                <li>
                  • <strong>Fraud Detection:</strong> Review fraudDetection.passed
                  and fraudDetection.signals for potential fraud indicators
                </li>
                <li>
                  • <strong>Biometric Confidence:</strong> For high-security scenarios,
                  require faceMatchConfidence and livenessConfidence above threshold (e.g., 0.85)
                </li>
                <li>
                  • <strong>Expiration:</strong> Consider implementing
                  expiration policies for credentials
                </li>
                <li>
                  • <strong>Revocation:</strong> Check revocation status if
                  implementing a revocation registry
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Example Implementation
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                JavaScript Verification Example
              </h3>
              <CodeBlock language="javascript">{`// Example verification function
async function verifyCardlessCredential(credential) {
  // 1. Extract issuer public key from DID
  const issuerAddress = credential.issuer.id.replace('did:algo:', '');
  const publicKey = algosdk.decodeAddress(issuerAddress).publicKey;

  // 2. Remove proof field for signature verification
  const { proof, ...credentialWithoutProof } = credential;

  // 3. Create canonical JSON
  const credentialBytes = new TextEncoder().encode(
    JSON.stringify(credentialWithoutProof)
  );

  // 4. Verify signature
  const signature = new Uint8Array(
    Buffer.from(proof.proofValue, 'base64')
  );

  const isValid = algosdk.verifyBytes(
    credentialBytes,
    signature,
    publicKey
  );

  return isValid;
}`}</CodeBlock>
            </div>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()} | Schema Version:{" "}
              {SCHEMA_VERSION}
            </p>
          </div>
    </>
  );
}
