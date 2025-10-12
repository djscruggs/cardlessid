import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useState, useEffect } from "react";
import CredentialQR from "~/components/CredentialQR";

export function meta() {
  return [{ title: "Create Minimal Credential" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const appWalletAddress = import.meta.env.VITE_APP_WALLET_ADDRESS;
  if (!appWalletAddress) {
    throw new Error("VITE_APP_WALLET_ADDRESS environment variable is required");
  }
  const issuerId = `did:algo:${appWalletAddress}`;

  return {
    issuerId,
    appWalletAddress,
  };
}

const CreateCredential = () => {
  const loaderData = useLoaderData<typeof loader>();

  const [formData, setFormData] = useState({
    walletAddress: "",
    birthDate: "",
    governmentId: "",
    idType: "government_id",
    state: "CA",
    firstName: "",
    middleName: "",
    lastName: "",
  });

  const [showQR, setShowQR] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  // Check for verification token and load extracted data on mount
  useEffect(() => {
    const token = sessionStorage.getItem('verificationToken');
    const extractedDataJson = sessionStorage.getItem('extractedData');
    
    if (token) {
      // User has completed verification
      setVerificationToken(token);
      setIsVerified(true);
      console.log('[Credential Creation] Verification token found - user is verified');

      // Pre-fill form with extracted data
      if (extractedDataJson) {
        try {
          const extractedData = JSON.parse(extractedDataJson);
          setFormData(prev => ({
            ...prev,
            firstName: extractedData.firstName || prev.firstName,
            middleName: extractedData.middleName || prev.middleName,
            lastName: extractedData.lastName || prev.lastName,
            birthDate: extractedData.birthDate || prev.birthDate,
            governmentId: extractedData.governmentId || prev.governmentId,
            idType: extractedData.idType || prev.idType,
            state: extractedData.state || prev.state,
          }));
          console.log('[Credential Creation] Pre-filled form with verified identity data');
        } catch (err) {
          console.error('[Credential Creation] Failed to parse extracted data:', err);
        }
      }
    } else {
      console.warn('[Credential Creation] No verification token - user must complete verification first');
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      const payload: any = {
        walletAddress: formData.walletAddress,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        birthDate: formData.birthDate,
        governmentId: formData.governmentId,
        idType: formData.idType,
        state: formData.state,
      };

      // Add verification token if available (secure verified flow)
      if (verificationToken) {
        payload.verificationToken = verificationToken;
        console.log('[Credential Creation] Submitting verified identity data with signed token');
        console.log('[Credential Creation] Server will verify data hash before creating credential');
      } else {
        // Manual credential creation (for testing/admin only)
        console.warn('[Credential Creation] Manual mode - no verification token');
      }

      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create credential");
        setIsSubmitting(false);
        return;
      }

      // Clear verification tokens after successful credential creation
      sessionStorage.removeItem('verificationToken');
      sessionStorage.removeItem('verificationSessionId');

      setApiResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Create Minimal Credential
        </h1>

        {isVerified && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>✓ Identity Verified:</strong> Your information has been pre-filled from your verified identity. Just add your wallet address.
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
                {loaderData.appWalletAddress.substring(loaderData.appWalletAddress.length - 4)}
              </a>
            ) : (
              "Wallet address not configured"
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="form-control">
            <label className="label" htmlFor="firstName">
              <span className="label-text">First Name</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="John"
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="middleName">
              <span className="label-text">Middle Name (Optional)</span>
            </label>
            <input
              type="text"
              id="middleName"
              name="middleName"
              value={formData.middleName}
              onChange={handleInputChange}
              placeholder="Michael"
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="lastName">
              <span className="label-text">Last Name</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Doe"
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="birthDate">
              <span className="label-text">
                Birth Date - Must be at least 13 years ago
              </span>
            </label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              required
              value={formData.birthDate}
              onChange={handleInputChange}
              max={
                new Date(
                  new Date().getFullYear() - 13,
                  new Date().getMonth(),
                  new Date().getDate()
                )
                  .toISOString()
                  .split("T")[0]
              }
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="idType">
              <span className="label-text">Government ID Type</span>
            </label>
            <select
              id="idType"
              name="idType"
              value={formData.idType}
              onChange={handleInputChange}
              className="select select-bordered w-full"
              required
            >
              <option value="government_id">Government ID</option>
              <option value="passport">US Passport</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="state">
              <span className="label-text">State or Territory</span>
            </label>
            <select
              id="state"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              className="select select-bordered w-full"
              required
            >
              <option value="AL">Alabama</option>
              <option value="AK">Alaska</option>
              <option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option>
              <option value="CA">California</option>
              <option value="CO">Colorado</option>
              <option value="CT">Connecticut</option>
              <option value="DE">Delaware</option>
              <option value="FL">Florida</option>
              <option value="GA">Georgia</option>
              <option value="HI">Hawaii</option>
              <option value="ID">Idaho</option>
              <option value="IL">Illinois</option>
              <option value="IN">Indiana</option>
              <option value="IA">Iowa</option>
              <option value="KS">Kansas</option>
              <option value="KY">Kentucky</option>
              <option value="LA">Louisiana</option>
              <option value="ME">Maine</option>
              <option value="MD">Maryland</option>
              <option value="MA">Massachusetts</option>
              <option value="MI">Michigan</option>
              <option value="MN">Minnesota</option>
              <option value="MS">Mississippi</option>
              <option value="MO">Missouri</option>
              <option value="MT">Montana</option>
              <option value="NE">Nebraska</option>
              <option value="NV">Nevada</option>
              <option value="NH">New Hampshire</option>
              <option value="NJ">New Jersey</option>
              <option value="NM">New Mexico</option>
              <option value="NY">New York</option>
              <option value="NC">North Carolina</option>
              <option value="ND">North Dakota</option>
              <option value="OH">Ohio</option>
              <option value="OK">Oklahoma</option>
              <option value="OR">Oregon</option>
              <option value="PA">Pennsylvania</option>
              <option value="RI">Rhode Island</option>
              <option value="SC">South Carolina</option>
              <option value="SD">South Dakota</option>
              <option value="TN">Tennessee</option>
              <option value="TX">Texas</option>
              <option value="UT">Utah</option>
              <option value="VT">Vermont</option>
              <option value="VA">Virginia</option>
              <option value="WA">Washington</option>
              <option value="WV">West Virginia</option>
              <option value="WI">Wisconsin</option>
              <option value="WY">Wyoming</option>
              <option value="DC">District of Columbia</option>
              <option value="AS">American Samoa</option>
              <option value="GU">Guam</option>
              <option value="MP">Northern Mariana Islands</option>
              <option value="PR">Puerto Rico</option>
              <option value="VI">U.S. Virgin Islands</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="governmentId">
              <span className="label-text">Government ID Number</span>
            </label>
            <input
              type="text"
              id="governmentId"
              name="governmentId"
              value={formData.governmentId}
              onChange={handleInputChange}
              placeholder="Enter ID number"
              className="input input-bordered w-full"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating Credential..." : "Create Credential"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {apiResponse?.success && apiResponse.credential && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Generated Credential:
              </h2>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="btn btn-sm btn-outline"
              >
                {showDetails ? "Hide Details" : "Show Details"}
              </button>
            </div>

            {showDetails && (
              <div className="bg-gray-100 p-4 rounded-md overflow-x-auto mb-4">
                <h3 className="text-sm font-semibold mb-2">Credential:</h3>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap mb-4">
                  {JSON.stringify(apiResponse.credential, null, 2)}
                </pre>
                <h3 className="text-sm font-semibold mb-2">Personal Data (stored locally in wallet):</h3>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(apiResponse.personalData, null, 2)}
                </pre>
              </div>
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
                    personalData: apiResponse.personalData
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
