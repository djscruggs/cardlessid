import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import CredentialQR from "~/components/CredentialQR";

export function meta() {
  return [{ title: "Create Credential" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const appWalletAddress = import.meta.env.VITE_APP_WALLET_ADDRESS;
  if (!appWalletAddress) {
    throw new Error("VITE_APP_WALLET_ADDRESS environment variable is required");
  }
  const issuerId = `did:algo:${appWalletAddress}`;
  
  const url = new URL(request.url);
  const isWidget = url.searchParams.get('widget') === 'true';
  const apiKey = url.searchParams.get('apiKey');
  const widgetWalletAddress = url.searchParams.get('wallet');

  return {
    issuerId,
    appWalletAddress,
    isWidget,
    hasApiKey: !!apiKey,
    widgetWalletAddress,
  };
}

const CreateCredential = () => {
  const loaderData = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get('apiKey');

  const [formData, setFormData] = useState({
    walletAddress: loaderData.widgetWalletAddress || "",
    birthDate: "",
    governmentId: "",
    idType: "government_id",
    state: "CA",
    firstName: "",
    middleName: "",
    lastName: "",
    expirationDate: "",
  });

  const [showQR, setShowQR] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null
  );

  // Send widget messages
  const sendWidgetMessage = (type: string, payload?: any) => {
    if (loaderData.isWidget) {
      window.parent.postMessage({ type, payload }, '*');
    }
  };

  // Check for verification token and load extracted data on mount
  useEffect(() => {
    if (loaderData.isWidget) {
      sendWidgetMessage('WidgetLoaded');
    }

    const token = sessionStorage.getItem("verificationToken");
    const extractedDataJson = sessionStorage.getItem("extractedData");
    if (token) {
      // User has completed verification
      setVerificationToken(token);
      setIsVerified(true);
      console.log(
        "[Credential Creation] Verification token found - user is verified"
      );

      // Pre-fill form with extracted data
      if (extractedDataJson) {
        try {
          const extractedData = JSON.parse(extractedDataJson);
          setFormData((prev) => ({
            ...prev,
            firstName: extractedData.firstName || prev.firstName,
            middleName: extractedData.middleName || prev.middleName,
            lastName: extractedData.lastName || prev.lastName,
            birthDate: extractedData.birthDate || prev.birthDate,
            governmentId: extractedData.governmentId || prev.governmentId,
            idType: extractedData.idType || prev.idType,
            state: extractedData.state || prev.state,
            expirationDate: extractedData.expirationDate || prev.expirationDate,
          }));
          console.log(
            "[Credential Creation] Pre-filled form with verified identity data"
          );
        } catch (err) {
          console.error(
            "[Credential Creation] Failed to parse extracted data:",
            err
          );
        }
      }
    } else {
      console.warn(
        "[Credential Creation] No verification token - user must complete verification first"
      );
    }
  }, [loaderData.isWidget]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if ("walletAddress" == name) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    // Validate birth date is at least 13 years ago
    const birthDateObj = new Date(formData.birthDate);
    const today = new Date();
    const thirteenYearsAgo = new Date(
      today.getFullYear() - 13,
      today.getMonth(),
      today.getDate()
    );

    if (birthDateObj > thirteenYearsAgo) {
      setError("Birth date must be at least 13 years ago");
      setIsSubmitting(false);
      return;
    }

    // Validate required fields
    if (!formData.walletAddress) {
      setError("Please enter your wallet address");
      setIsSubmitting(false);
      return;
    }

    // For manual mode (no verification token), require all fields
    if (!verificationToken) {
      if (
        !formData.firstName ||
        !formData.lastName ||
        !formData.birthDate ||
        !formData.governmentId ||
        !formData.idType ||
        !formData.state
      ) {
        setError("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Prepare payload for credential creation
      // Always send identity data for verification
      const payload: any = formData;

      // Add verification token if available (secure verified flow)
      if (verificationToken) {
        payload.verificationToken = verificationToken;
        console.log(
          "[Credential Creation] Submitting verified identity data with signed token"
        );
        console.log(
          "[Credential Creation] Server will verify data hash before creating credential"
        );
      } else {
        // Manual credential creation (for testing/admin only)
        console.warn(
          "[Credential Creation] Manual mode - no verification token"
        );
      }

      // Add widget parameters
      if (loaderData.isWidget) {
        payload.widgetMode = true;
        payload.createNFT = !!apiKey;
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await fetch("/api/credentials", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create credential");
        setIsSubmitting(false);
        
        if (loaderData.isWidget) {
          sendWidgetMessage('VerificationFailed');
        }
        return;
      }

      // Clear verification tokens after successful credential creation
      sessionStorage.removeItem("verificationToken");
      sessionStorage.removeItem("verificationSessionId");

      setApiResponse(data);
      
      // Send success to widget
      if (loaderData.isWidget) {
        sendWidgetMessage('VerificationCompleted', {
          sessionId: sessionStorage.getItem('verificationSessionId'),
          verificationToken,
          verified: true,
          credentialId: data.credential?.id,
          assetId: data.nft?.assetId,
          credential: data.credential,
          personalData: data.personalData,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen ${loaderData.isWidget ? 'bg-white' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8`}>
      {loaderData.isWidget && (
        <style>{`
          body {
            margin: 0;
            overflow: auto;
          }
        `}</style>
      )}
      <div className={`max-w-2xl mx-auto ${loaderData.isWidget ? '' : 'bg-white rounded-lg shadow-md'} p-6`}>
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {loaderData.isWidget ? 'Credential Verification' : 'Create Credential (Demo)'}
        </h1>

        {!loaderData.isWidget && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-md">
            <p className="text-sm text-yellow-900 font-semibold mb-1">
              ⚠️ Demonstration Mode
            </p>
            <p className="text-xs text-yellow-800">
              This page demonstrates the credential format. No real NFTs will be
              created on the blockchain. Mobile apps must register for an API key
              to issue real credentials.{" "}
              <a href="/contact" className="underline font-medium">
                Contact us
              </a>
            </p>
          </div>
        )}
        
        {loaderData.isWidget && !loaderData.hasApiKey && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900">
              <strong>Testnet Demo:</strong> This will create a demonstration credential on testnet. 
              For mainnet credentials with NFTs, obtain an API key at{" "}
              <a href="https://cardlessid.org/contact" target="_blank" className="underline font-medium">
                cardlessid.org/contact
              </a>
            </p>
          </div>
        )}

        {isVerified && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>✓ Identity Verified:</strong> Enter a wallet address to
              see the credential format.
            </p>
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Issuer:</strong>{" "}
            {loaderData.appWalletAddress ? (
              <a
                href={`https://explorer.perawallet.app/address/${loaderData.appWalletAddress}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {loaderData.appWalletAddress.substring(0, 4)}...
                {loaderData.appWalletAddress.substring(
                  loaderData.appWalletAddress.length - 4
                )}
              </a>
            ) : (
              "Wallet address not configured"
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 ">
          <div className="form-control">
            <label className="label" htmlFor="walletAddress">
              <span className="label-text">Wallet Address (Algorand)</span>
            </label>
            <input
              type="text"
              id="walletAddress"
              name="walletAddress"
              value={formData.walletAddress}
              onChange={handleInputChange}
              placeholder="Enter your Algorand wallet address"
              className="input input-bordered w-full"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Generating Demo..." : "Generate Demo Credential"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {apiResponse?.success && apiResponse.credential && (
          <div className="mt-8">
            {apiResponse.demoMode && (
              <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-md">
                <p className="text-sm text-yellow-900 font-semibold mb-1">
                  🎭 Demo Credential Generated
                </p>
                <p className="text-xs text-yellow-800">
                  {apiResponse.demoNotice}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {apiResponse.demoMode
                  ? "Demo Credential Format:"
                  : "Generated Credential:"}
              </h2>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="btn btn-sm btn-outline"
              >
                {showDetails ? "Hide Details" : "Show Details"}
              </button>
            </div>

            {/* Table View */}
            {showDetails && !showJson && apiResponse.personalData && (
              <div className="bg-white rounded-lg border border-gray-300 overflow-hidden mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="divide-y divide-gray-200">
                    {apiResponse.personalData.firstName && (
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">First Name</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{apiResponse.personalData.firstName}</td>
                      </tr>
                    )}
                    {apiResponse.personalData.middleName && (
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Middle Name</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{apiResponse.personalData.middleName}</td>
                      </tr>
                    )}
                    {apiResponse.personalData.lastName && (
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Last Name</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{apiResponse.personalData.lastName}</td>
                      </tr>
                    )}
                    {apiResponse.personalData.birthDate && (
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Birth Date</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{apiResponse.personalData.birthDate}</td>
                      </tr>
                    )}
                    {apiResponse.personalData.idType && (
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">ID Type</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {apiResponse.personalData.idType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </td>
                      </tr>
                    )}
                    {apiResponse.personalData.governmentId && (
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Government ID</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-mono">{apiResponse.personalData.governmentId}</td>
                      </tr>
                    )}
                    {apiResponse.personalData.state && (
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">State</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{apiResponse.personalData.state}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Credential ID</td>
                      <td className="px-4 py-3 text-xs text-gray-900 font-mono break-all">{apiResponse.credential?.id}</td>
                    </tr>
                    {apiResponse.nft?.assetId && apiResponse.nft.assetId !== 'DEMO_ASSET_ID' && (
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">NFT Asset ID</td>
                        <td className="px-4 py-3 text-xs text-gray-900 font-mono">{apiResponse.nft.assetId}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Network</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {apiResponse.network || 'testnet'}
                        {apiResponse.demoMode && ' (demo)'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* JSON View */}
            {showDetails && showJson && (
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-4">
                <h3 className="text-sm font-semibold mb-2 text-green-400">Credential:</h3>
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap mb-4">
                  {JSON.stringify(apiResponse.credential, null, 2)}
                </pre>
                <h3 className="text-sm font-semibold mb-2 text-green-400">
                  Personal Data (stored locally in wallet):
                </h3>
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(apiResponse.personalData, null, 2)}
                </pre>
              </div>
            )}

            {/* Toggle JSON Button */}
            {showDetails && (
              <button
                onClick={() => setShowJson(!showJson)}
                className="w-full mb-4 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                {showJson ? 'Show Table View' : 'View JSON'}
              </button>
            )}

            <div className="space-x-2">
              <button
                onClick={() => setShowQR(true)}
                className="btn btn-primary"
              >
                Show QR Code
              </button>
              <button
                onClick={() => {
                  const dataToClip = {
                    credential: apiResponse.credential,
                    personalData: apiResponse.personalData,
                  };
                  navigator.clipboard.writeText(
                    JSON.stringify(dataToClip, null, 2)
                  );
                  alert("Credential and personal data copied to clipboard!");
                }}
                className="btn btn-outline"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}

        {showQR && apiResponse?.credential && (
          <CredentialQR
            credential={apiResponse.credential}
            onClose={() => setShowQR(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CreateCredential;
