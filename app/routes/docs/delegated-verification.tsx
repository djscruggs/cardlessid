import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import CodeBlock from "~/components/CodeBlock";

export const meta: MetaFunction = () => {
  return [
    { title: "Delegated Verification Guide - Cardless ID" },
    {
      name: "description",
      content:
        "Guide for trusted issuers (banks, DMVs, etc.) to issue Cardless ID credentials via delegated verification",
    },
  ];
};

export default function DelegatedVerificationGuide() {
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
          Delegated Verification Guide
        </h1>
        <p className="text-lg text-gray-600">
          Issue Cardless ID credentials to your verified users via trusted
          issuer API
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          <strong>Delegated verification</strong> allows trusted issuers (banks,
          government agencies, employers, universities, etc.) to issue Cardless
          ID credentials to their users without requiring them to go through a
          full identity verification flow.
        </p>
        <p className="text-gray-700 mb-4">
          This is ideal for organizations that have already verified their
          users' identities and want to provide them with portable,
          privacy-preserving digital credentials.
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
                Issuer Registry & Security Audit Required
              </h3>
              <p className="text-orange-800 mb-3">
                Cardless ID maintains an{" "}
                <strong>Algorand smart contract</strong> that serves as a
                registry of trusted issuers. Only credentials issued by
                addresses in this on-chain registry will be recognized as valid
                by verifiers in the Cardless ID ecosystem.
              </p>
              <p className="text-orange-800 mb-3">
                <strong>Before production deployment:</strong> Your organization
                must complete a security audit and approval process. We review
                your verification procedures, security practices, and compliance
                measures before adding your issuer address to the registry.
              </p>
              <p className="text-orange-800 mb-2">
                <Link to="/contact">Contact Us</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Diagram */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            How It Works
          </h3>
          <div className="bg-white p-6 rounded border border-gray-300 font-mono text-sm overflow-x-auto">
            <pre>{`┌─────────────┐                           ┌──────────────┐
│   Bank/DMV  │                           │  Cardless ID  │
│   (Issuer)  │                           │   Platform   │
└─────────────┘                           └──────────────┘
       │                                          │
       │  1. Request API Key                     │
       │─────────────────────────────────────────>│
       │                                          │
       │  2. Receive API Key                     │
       │<─────────────────────────────────────────│
       │                                          │
       │  3. POST /api/delegated-verification/issue
       │     - API Key                            │
       │     - User's wallet address              │
       │     - Identity data                      │
       │─────────────────────────────────────────>│
       │                                          │
       │                4. Verify API key         │
       │                5. Generate credential    │
       │                6. Store on Algorand      │
       │                                          │
       │  7. Return credential ID                 │
       │<─────────────────────────────────────────│
       │                                          │
       │  8. Notify user                          │
       │     "Your Cardless ID is ready!"          │`}</pre>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Use Cases</h2>

        <div className="space-y-4">
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              1. Banks (KYC Completed)
            </h3>
            <p className="text-blue-800 mb-3">
              Banks that have completed Know Your Customer (KYC) verification
              can issue Cardless ID credentials to their account holders.
            </p>
            <p className="text-blue-900 font-medium text-sm">
              Example: Chase Bank issues Cardless ID to verified customers,
              allowing them to prove age without sharing banking information.
            </p>
          </div>

          <div className="border border-purple-200 bg-purple-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-purple-900 mb-2">
              2. Government Agencies (DMV, Social Security)
            </h3>
            <p className="text-purple-800 mb-3">
              Government agencies that issue identity documents can directly
              issue digital credentials.
            </p>
            <p className="text-purple-900 font-medium text-sm">
              Example: California DMV issues Cardless ID when renewing driver's
              license.
            </p>
          </div>

          <div className="border border-green-200 bg-green-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-green-900 mb-2">
              3. Universities (Student Credentials)
            </h3>
            <p className="text-green-800 mb-3">
              Universities can issue credentials to enrolled students for age
              verification and student discounts.
            </p>
            <p className="text-green-900 font-medium text-sm">
              Example: Stanford issues Cardless ID to all students for campus
              events and online student discounts.
            </p>
          </div>

          <div className="border border-orange-200 bg-orange-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-orange-900 mb-2">
              4. Employers (Employee Verification)
            </h3>
            <p className="text-orange-800 mb-3">
              Employers can issue credentials to employees for workplace access
              and benefits.
            </p>
            <p className="text-orange-900 font-medium text-sm">
              Example: Google issues Cardless ID to employees for building
              access and corporate discounts.
            </p>
          </div>

          <div className="border border-pink-200 bg-pink-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-pink-900 mb-2">
              5. Healthcare Providers
            </h3>
            <p className="text-pink-800 mb-3">
              Healthcare organizations can issue credentials to patients for
              age-gated services.
            </p>
            <p className="text-pink-900 font-medium text-sm">
              Example: Kaiser Permanente issues Cardless ID to patients for
              prescription refills requiring age verification.
            </p>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Getting Started
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              Step 1: Request API Key
            </h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 mb-4">
                <Link to="/contact">Contact Cardless ID</Link> to request an API
                key for your organization:
              </p>
              <p className="mt-2 text-blue-800 text-sm">
                Include: Organization name, type, contact email, website, use
                case, expected volume
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              Step 2: Receive Credentials
            </h3>
            <p className="text-gray-700 mb-4">You'll receive:</p>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li>
                API Key:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  api_key_example_not_real_xxxxxxxxxxxxxxxx
                </code>
              </li>
              <li>Documentation: This guide</li>
              <li>Sandbox API Key: For testing</li>
            </ul>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              Step 3: Integrate API
            </h3>
            <p className="text-gray-700">
              Use the API endpoint to issue credentials to your users.
            </p>
          </div>
        </div>
      </section>

      {/* API Reference */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">API Reference</h2>

        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            Endpoint
          </h3>
          <CodeBlock language="bash">{`POST https://cardlessid.com/api/delegated-verification/issue`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            Request Body
          </h3>
          <CodeBlock language="json">{`{
  "apiKey": "your_api_key_here_not_a_real_key_example",
  "walletAddress": "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
  "identity": {
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-15",
    "documentNumber": "D1234567",
    "documentType": "government_id",
    "issuingCountry": "US",
    "issuingState": "CA"
  }
}`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            Request Fields
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
                    Field
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
                    Type
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
                    Required
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    <code>apiKey</code>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    string
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    Yes
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    Your API key from Cardless ID
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    <code>walletAddress</code>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    string
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    Yes
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    User's Algorand wallet address (58 characters)
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    <code>identity.firstName</code>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    string
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    Yes
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    User's middle name
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    <code>identity.middleName</code>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    string
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    Yes
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    User's middle name
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    <code>identity.lastName</code>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    string
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    Yes
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    User's last name
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    <code>identity.dateOfBirth</code>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    string
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    Yes
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    Date of birth (YYYY-MM-DD format)
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    <code>identity.documentNumber</code>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    string
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    No
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    ID document number
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    <code>identity.documentType</code>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    string
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    No
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">
                    drivers_license, passport, or government_id
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            Response (Success)
          </h3>
          <CodeBlock language="json">{`{
  "success": true,
  "credentialId": "cred_1234567890_abc123",
  "walletAddress": "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
  "compositeHash": "a1b2c3d4e5f6...",
  "sessionId": "session_1234567890",
  "issuer": {
    "name": "Example Bank",
    "type": "bank"
  }
}`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            Error Responses
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                401 Unauthorized
              </h4>
              <CodeBlock language="json">{`{
  "error": "Invalid API key"
}`}</CodeBlock>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                400 Bad Request
              </h4>
              <CodeBlock language="json">{`{
  "error": "Invalid Algorand wallet address. Must be 58 characters."
}`}</CodeBlock>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation Examples */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Implementation Examples
        </h2>

        <div className="space-y-8">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              Node.js / TypeScript
            </h3>
            <CodeBlock language="typescript">{`import fetch from 'node-fetch';

async function issueCardlessId(
  walletAddress: string,
  userData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  }
) {
  const response = await fetch('https://cardlessid.com/api/delegated-verification/issue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      apiKey: process.env.CARDLESSID_API_KEY,
      walletAddress,
      identity: userData
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`Failed to issue credential: \${error.error}\`);
  }

  const result = await response.json();
  console.log('Credential issued:', result.credentialId);

  return result;
}

// Usage
await issueCardlessId(
  'MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM',
  {
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1990-01-15'
  }
);`}</CodeBlock>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              Python
            </h3>
            <CodeBlock language="python">{`import requests
import os

def issue_cardless_id(wallet_address, user_data):
    response = requests.post(
        'https://cardlessid.com/api/delegated-verification/issue',
        json={
            'apiKey': os.environ['CARDLESSID_API_KEY'],
            'walletAddress': wallet_address,
            'identity': user_data
        }
    )

    response.raise_for_status()
    result = response.json()

    print(f"Credential issued: {result['credentialId']}")
    return result

# Usage
issue_cardless_id(
    'MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM',
    {
        'firstName': 'Jane',
        'lastName': 'Doe',
        'dateOfBirth': '1990-01-15'
    }
)`}</CodeBlock>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">cURL</h3>
            <CodeBlock language="bash">{`curl -X POST https://cardlessid.com/api/delegated-verification/issue \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiKey": "your_api_key_here_not_a_real_key_example",
    "walletAddress": "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
    "identity": {
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15",
      "documentNumber": "D1234567",
      "documentType": "government_id",
      "issuingCountry": "US",
      "issuingState": "CA"
    }
  }'`}</CodeBlock>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Best Practices
        </h2>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Security
            </h3>
            <ul className="space-y-1 text-red-800 text-sm">
              <li>• Store API keys in environment variables</li>
              <li>• Never commit API keys to version control</li>
              <li>• Rotate regularly (every 90 days)</li>
              <li>• Use separate keys for dev/staging/production</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Error Handling
            </h3>
            <ul className="space-y-1 text-blue-800 text-sm">
              <li>• Retry failed requests with exponential backoff</li>
              <li>• Log all errors for debugging</li>
              <li>• Provide clear error messages to users</li>
              <li>• Monitor API usage and errors</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              User Experience
            </h3>
            <ul className="space-y-1 text-green-800 text-sm">
              <li>• Explain what Cardless ID is</li>
              <li>• Show benefits to users</li>
              <li>• Help users download wallet app</li>
              <li>• Confirm successful issuance</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Compliance</h2>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              GDPR (European Union)
            </h3>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li>Right to access: Users can request credential data</li>
              <li>Right to erasure: Users can request credential revocation</li>
              <li>Data minimization: Only required fields are transmitted</li>
              <li>Lawful basis: Legitimate interest or consent</li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              CCPA (California)
            </h3>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li>
                Data disclosure: Users can request information about data
                collection
              </li>
              <li>Right to delete: Users can request credential deletion</li>
              <li>
                No sale of data: Credentials are not sold to third parties
              </li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              HIPAA (Healthcare)
            </h3>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li>
                Protected Health Information (PHI) is not stored in credentials
              </li>
              <li>Only age/identity information is included</li>
              <li>Credentials are encrypted on blockchain</li>
              <li>Audit logs track all issuance</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Support</h2>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <ul className="space-y-2 text-gray-700">
            <Link to="/contact">Contact Us</Link>
          </ul>
        </div>
      </section>

      {/* Related Docs */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Related Documentation
        </h2>
        <div className="space-y-2">
          <Link
            to="/docs/custom-verification-guide"
            className="block text-blue-600 hover:text-blue-800 hover:underline"
          >
            → Custom Verification Provider Guide
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

      {/* CTA */}
      <div className="bg-blue-600 text-white rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
        <Link
          to="/contact"
          className="bg-white no-underline! text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 inline-block"
        >
          Request API Key
        </Link>
      </div>
    </>
  );
}
