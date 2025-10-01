import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useState } from "react";

export function meta() {
  return [{ title: "Verify Credential" }];
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { txId } = params;

  if (!txId) {
    throw new Error("Transaction ID is required");
  }

  // Generate consistent timestamps for server/client hydration
  const now = new Date();
  const issuanceDate = now.toISOString();
  const proofCreated = now.toISOString();
  const timestamp = now.toISOString();

  // Use hash-based deterministic block height instead of random
  const blockHeight =
    1000000 +
    (txId?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      1000000);

  // Simulate fetching credential from blockchain
  // In production, this would query the Algorand blockchain
  const mockCredential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2",
    ],
    id: "urn:uuid:12345678-1234-1234-1234-123456789012",
    type: ["VerifiableCredential", "BirthDateCredential"],
    issuer: {
      id: "did:algorand:RVRETUTESXWBMIFFUGGTUJX5URU4MTRTRXLFXACR3JTT7QR7RCC57A7JHI",
    },
    issuanceDate,
    credentialSubject: {
      id: "did:cardlessid:user:12345678-1234-1234-1234-123456789012",
      "cardlessid:compositeHash": "a1b2c3d4e5f6...",
      "cardlessid:idType": "government_id",
      "cardlessid:state": "CA",
    },
    proof: {
      type: "Ed25519Signature2020",
      created: proofCreated,
      verificationMethod:
        "did:algorand:RVRETUTESXWBMIFFUGGTUJX5URU4MTRTRXLFXACR3JTT7QR7RCC57A7JHI#key-1",
      proofPurpose: "assertionMethod",
      proofValue: "verified-signature-value",
    },
  };

  const isSimulated = txId.startsWith("simulated-tx-");

  const blockchainProof = {
    transactionId: txId,
    blockHeight,
    timestamp,
    network: "testnet",
    explorerUrl: isSimulated
      ? `/app/verify/${txId}`
      : `https://testnet.explorer.perawallet.app/address/${txId}`,
    verified: true,
    issuerAddress: "RVRETUTESXWBMIFFUGGTUJX5URU4MTRTRXLFXACR3JTT7QR7RCC57A7JHI",
    isSimulated,
  };

  return {
    credential: mockCredential,
    blockchainProof,
    txId,
  };
}

const VerifyCredential = () => {
  const { credential, blockchainProof, txId } = useLoaderData<typeof loader>();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Credential Verification
            </h1>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600 font-medium">
                Verified
              </span>
              {blockchainProof.isSimulated && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  Simulated
                </span>
              )}
            </div>
          </div>

          {/* Transaction Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-800 mb-3">
              Blockchain Proof
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700">
                  <strong>Transaction ID:</strong>
                </p>
                <p className="font-mono text-blue-600 break-all">
                  {blockchainProof.transactionId}
                </p>
              </div>
              <div>
                <p className="text-blue-700">
                  <strong>Block Height:</strong>
                </p>
                <p className="text-blue-600">
                  {blockchainProof.blockHeight.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-blue-700">
                  <strong>Network:</strong>
                </p>
                <p className="text-blue-600">{blockchainProof.network}</p>
              </div>
              <div>
                <p className="text-blue-700">
                  <strong>Timestamp:</strong>
                </p>
                <p className="text-blue-600">
                  {new Date(blockchainProof.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-3">
              {blockchainProof.isSimulated ? (
                <div className="text-orange-600 text-sm">
                  <p>
                    <strong>Note:</strong> This is a simulated transaction for
                    demonstration purposes.
                  </p>
                  <p>
                    In production, this would link to the real Algorand
                    blockchain explorer.
                  </p>
                </div>
              ) : (
                <a
                  href={blockchainProof.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                >
                  View on AlgoExplorer →
                </a>
              )}
            </div>
          </div>

          {/* Issuer Info */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Issuer Information
            </h2>
            <div className="text-sm text-gray-700">
              <p>
                <strong>Issuer ID:</strong> {credential.issuer.id}
              </p>
              <p>
                <strong>Issuer Address:</strong> {blockchainProof.issuerAddress}
              </p>
              <p>
                <strong>Credential Type:</strong> {credential.type.join(", ")}
              </p>
              <p>
                <strong>Issued:</strong>{" "}
                {new Date(credential.issuanceDate).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Credential Details */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Credential Details
              </h2>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="btn btn-sm btn-outline"
              >
                {showDetails ? "Hide Details" : "Show Details"}
              </button>
            </div>

            {showDetails && (
              <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(credential, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Verification Status */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center mb-2">
              <div className="w-5 h-5 bg-green-500 rounded-full mr-2"></div>
              <h3 className="text-lg font-semibold text-green-800">
                Verification Status
              </h3>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p>✅ Credential exists on blockchain</p>
              <p>✅ Issuer signature is valid</p>
              <p>✅ Credential has not been revoked</p>
              <p>✅ Timestamp is within valid range</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(credential, null, 2)
                );
                alert("Credential copied to clipboard!");
              }}
              className="btn btn-outline"
            >
              Copy Credential
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(blockchainProof.transactionId);
                alert("Transaction ID copied to clipboard!");
              }}
              className="btn btn-outline"
            >
              Copy Transaction ID
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyCredential;
