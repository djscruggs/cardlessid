import type { MetaFunction } from "react-router";
import { Link } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Cardless ID Documentation" },
    {
      name: "description",
      content: "Documentation for Cardless ID credential system and API",
    },
  ];
};

export default function DocsIndex() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Cardless ID Documentation
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Complete documentation for the Cardless ID credential system
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Available Documentation
        </h2>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <Link
                to="/docs/integration-guide"
                className="text-blue-600 hover:text-blue-800"
              >
                Integration Guide
              </Link>
            </h3>
            <p className="text-gray-600">
              Complete guide to integrating CardlessID age verification into
              your application. Includes SDK documentation, REST API reference,
              code examples, and best practices.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <a
                href="https://github.com/djscruggs/cardlessid/blob/main/WALLET_APP_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Wallet App Developer Guide
              </a>
            </h3>
            <p className="text-gray-600">
              Guide for mobile app developers building compatible wallet
              applications. Includes deep linking setup, API integration, and
              implementation examples for iOS, Android, and React Native.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <Link
                to="/docs/credential-schema"
                className="text-blue-600 hover:text-blue-800"
              >
                Credential Schema Documentation
              </Link>
            </h3>
            <p className="text-gray-600">
              Complete W3C Verifiable Credential schema documentation, including
              field definitions, usage guidelines, and verification examples.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <Link
                to="/api/credentials/schema"
                target="_blank"
                className="text-blue-600 hover:text-blue-800"
              >
                Schema API Endpoint
              </Link>
            </h3>
            <p className="text-gray-600">
              Machine-readable JSON schema endpoint for programmatic access to
              the credential structure.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Quick Links
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Credential API
            </h3>
            <ul className="space-y-1 text-blue-800 text-sm">
              <li>
                <code className="bg-blue-100 px-2 py-1 rounded">
                  GET /api/credentials/schema
                </code>
              </li>
              <li>
                <code className="bg-blue-100 px-2 py-1 rounded">
                  POST /api/credentials
                </code>
              </li>
              <li>
                <code className="bg-blue-100 px-2 py-1 rounded">
                  POST /api/credentials/transfer
                </code>
              </li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-purple-900 mb-2">
              Integrator API
            </h3>
            <ul className="space-y-1 text-purple-800 text-sm">
              <li>
                <code className="bg-purple-100 px-2 py-1 rounded">
                  POST /api/integrator/challenge/create
                </code>
              </li>
              <li>
                <code className="bg-purple-100 px-2 py-1 rounded">
                  GET /api/integrator/challenge/verify/:id
                </code>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-900 mb-2">
              Resources
            </h3>
            <ul className="space-y-1 text-green-800">
              <li>
                <a
                  href="https://www.w3.org/TR/vc-data-model/"
                  className="hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  W3C Verifiable Credentials
                </a>
              </li>
              <li>
                <a
                  href="https://algorand.org/"
                  className="hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Algorand Blockchain
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/algorandfoundation/did-algo/blob/main/SPEC.md"
                  className="hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Algorand DID Specification
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
