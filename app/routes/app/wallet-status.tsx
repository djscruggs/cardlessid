import { useState, useEffect } from "react";
import { useParams } from "react-router";

export default function WalletStatus() {
  const { address } = useParams();
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    verified: boolean;
    credentialCount: number;
    issuedAt?: string;
    credentials?: Array<{
      assetId: number;
      frozen: boolean;
      issuedAt?: string;
      credentialId?: string;
      issuerName?: string;
      issuerUrl?: string;
    }>;
    latestCredential?: {
      assetId: number;
      frozen: boolean;
      credentialId?: string;
      compositeHash?: string;
      issuerName?: string;
      issuerUrl?: string;
    };
    issuer?: {
      name: string;
      url: string;
    } | null;
    network?: string;
  } | null>(null);
  const [error, setError] = useState("");

  // Check for wallet address in URL parameters and auto-check if present
  useEffect(() => {
    if (address) {
      setWalletAddress(address);
      // Auto-check the wallet status after setting the address
      setTimeout(() => {
        checkWalletStatusWithAddress(address);
      }, 100);
    }
  }, [address]);

  const checkWalletStatusWithAddress = async (address: string) => {
    if (!address.trim()) {
      setError("Please enter a wallet address");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`/api/wallet/status/${address.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to check wallet status");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const checkWalletStatus = async () => {
    await checkWalletStatusWithAddress(walletAddress);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      checkWalletStatus();
    }
  };

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-3xl mb-4">
              Check Verification Status
            </h1>

            <p className="mb-6 text-base-content/70">
              Enter an Algorand wallet address to check verification status on
              the blockchain. This queries the{" "}
              {import.meta.env.VITE_ALGORAND_NETWORK || "testnet"} network.
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Algorand Wallet Address</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder="Enter wallet address (e.g., AAAA...)"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <button
                  className="btn btn-primary"
                  onClick={checkWalletStatus}
                  disabled={loading || !walletAddress.trim()}
                >
                  {loading ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    "Check Status"
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-error mt-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="mt-6">
                <div
                  className={`alert ${
                    result.verified ? "alert-success" : "alert-info"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={
                        result.verified
                          ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      }
                    />
                  </svg>
                  <div>
                    <h3 className="font-bold">
                      {result.verified
                        ? "Identity Verified"
                        : "Identity Not Verified"}
                    </h3>
                    <div className="text-xs">
                      {result.verified
                        ? "This wallet's owner has completed the identity verification process."
                        : "This wallet's owner has not had their identity verified."}
                    </div>
                  </div>
                </div>

                {result.verified && (
                  <>
                    <div className="stats shadow mt-4 w-full">
                      <div className="stat">
                        <div className="stat-title">NFT Credentials</div>
                        <div className="stat-value text-2xl">
                          {result.credentialCount}
                        </div>
                        <div className="stat-desc">
                          {result.credentialCount === 1
                            ? "1 credential NFT owned"
                            : `${result.credentialCount} credential NFTs owned`}
                        </div>
                      </div>

                      {result.issuedAt && (
                        <div className="stat">
                          <div className="stat-title">Latest Credential</div>
                          <div className="stat-value text-lg">
                            {new Date(result.issuedAt).toLocaleDateString()}
                          </div>
                          <div className="stat-desc">
                            {new Date(result.issuedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {result.latestCredential && (
                      <div className="mt-4 p-4 bg-base-200 rounded-lg">
                        <h3 className="font-semibold mb-2">
                          Latest NFT Credential:
                        </h3>
                        <div className="space-y-2 text-sm">
                          <p>
                            <strong>Asset ID:</strong>{" "}
                            <a
                              href={`https://${result.network === "mainnet" ? "" : "testnet."}explorer.perawallet.app/asset/${result.latestCredential.assetId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link link-primary font-mono"
                            >
                              {result.latestCredential.assetId}
                            </a>
                          </p>
                          <p>
                            <strong>Status:</strong>{" "}
                            <span
                              className={`badge ${result.latestCredential.frozen ? "badge-success" : "badge-warning"}`}
                            >
                              {result.latestCredential.frozen
                                ? "Frozen (Non-transferable)"
                                : "Transferable"}
                            </span>
                          </p>
                          {(result.latestCredential.issuerName || result.issuer?.name) && (
                            <p>
                              <strong>Issued By:</strong>{" "}
                              {result.latestCredential.issuerUrl || result.issuer?.url ? (
                                <a
                                  href={result.latestCredential.issuerUrl || result.issuer?.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link link-primary"
                                >
                                  {result.latestCredential.issuerName || result.issuer?.name}
                                </a>
                              ) : (
                                <span>{result.latestCredential.issuerName || result.issuer?.name}</span>
                              )}
                            </p>
                          )}
                          {result.latestCredential.credentialId && (
                            <p>
                              <strong>Credential ID:</strong>{" "}
                              <span className="font-mono text-xs break-all">
                                {result.latestCredential.credentialId}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {result.credentials && result.credentials.length > 1 && (
                      <div className="mt-4">
                        <h3 className="font-semibold mb-2">All Credentials:</h3>
                        <div className="overflow-x-auto">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Asset ID</th>
                                <th>Status</th>
                                <th>Issued</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.credentials.map((cred) => (
                                <tr key={cred.assetId}>
                                  <td>
                                    <a
                                      href={`https://${result.network === "mainnet" ? "" : "testnet."}explorer.perawallet.app/asset/${cred.assetId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="link link-primary font-mono text-xs"
                                    >
                                      {cred.assetId}
                                    </a>
                                  </td>
                                  <td>
                                    <span
                                      className={`badge badge-xs ${cred.frozen ? "badge-success" : "badge-warning"}`}
                                    >
                                      {cred.frozen ? "Frozen" : "Active"}
                                    </span>
                                  </td>
                                  <td className="text-xs">
                                    {cred.issuedAt
                                      ? new Date(
                                          cred.issuedAt
                                        ).toLocaleDateString()
                                      : "N/A"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="divider mt-8"></div>

            <div className="text-sm text-base-content/60">
              <p className="font-semibold mb-2">How It Works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Credentials are issued as non-transferable NFTs on Algorand
                </li>
                <li>
                  Each NFT is frozen after issuance to prevent transfers
                  (soulbound)
                </li>
                <li>
                  NFT metadata contains credential ID, issuer info, and cryptographic hash
                </li>
                <li>
                  No personal information (age, birthdate) is stored on-chain for privacy
                </li>
                <li>
                  This ensures decentralized, tamper-proof, revocable
                  verification
                </li>
                <li>
                  Costs approximately 0.003-0.004 ALGO per credential issued
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
