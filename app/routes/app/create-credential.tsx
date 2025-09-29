import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { useState } from "react";
import CredentialQR from "~/components/CredentialQR";

export function meta() {
  return [{ title: "Create Minimal Credential" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const appWalletAddress = import.meta.env.VITE_APP_WALLET_ADDRESS;
  if (!appWalletAddress) {
    throw new Error("VITE_APP_WALLET_ADDRESS environment variable is required");
  }
  const issuerId = `did:algorand:${appWalletAddress}`;
  
  return {
    issuerId,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const subjectId = formData.get("subjectId") as string;
  const birthDate = formData.get("birthDate") as string;
  const governmentId = formData.get("governmentId") as string;
  const idType = formData.get("idType") as string;
  const state = formData.get("state") as string;
  const firstName = formData.get("firstName") as string;
  const middleName = formData.get("middleName") as string;
  const lastName = formData.get("lastName") as string;
  
  // Get app wallet address from environment - this is ALWAYS the issuer
  const appWalletAddress = import.meta.env.VITE_APP_WALLET_ADDRESS;
  if (!appWalletAddress) {
    throw new Error("VITE_APP_WALLET_ADDRESS environment variable is required");
  }
  const issuerId = `did:algorand:${appWalletAddress}`;

  // Validate that birthday is at least 13 years ago
  if (birthDate) {
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const thirteenYearsAgo = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    
    if (birthDateObj > thirteenYearsAgo) {
      return { 
        error: "Birth date must be at least 13 years ago",
        success: false 
      };
    }
  }

  // Generate a UUID for the credential
  const credentialId = `urn:uuid:${crypto.randomUUID()}`;
  
  // Get current date for issuance
  const issuanceDate = new Date().toISOString();

  // Hash the identifiers to prevent duplicate verifications
  const governmentIdHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(governmentId));
  
  // Hash personal information for privacy
  const firstNameHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(firstName));
  const middleNameHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(middleName));
  const lastNameHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(lastName));
  const birthDateHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(birthDate));
  
  // Create composite hash for main duplicate detection
  const compositeData = `${firstName}|${middleName}|${lastName}|${birthDate}`;
  const compositeHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(compositeData));

  const credential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2",
    ],
    id: credentialId,
    type: ["VerifiableCredential", "BirthDateCredential"],
    issuer: {
      id: issuerId,
    },
    issuanceDate: issuanceDate,
    credentialSubject: {
      id: subjectId,
      // All personal data is hashed for privacy
      "cardless:governmentIdHash": Array.from(new Uint8Array(governmentIdHash)).map(b => b.toString(16).padStart(2, '0')).join(''),
      "cardless:firstNameHash": Array.from(new Uint8Array(firstNameHash)).map(b => b.toString(16).padStart(2, '0')).join(''),
      "cardless:middleNameHash": Array.from(new Uint8Array(middleNameHash)).map(b => b.toString(16).padStart(2, '0')).join(''),
      "cardless:lastNameHash": Array.from(new Uint8Array(lastNameHash)).map(b => b.toString(16).padStart(2, '0')).join(''),
      "cardless:birthDateHash": Array.from(new Uint8Array(birthDateHash)).map(b => b.toString(16).padStart(2, '0')).join(''),
      "cardless:compositeHash": Array.from(new Uint8Array(compositeHash)).map(b => b.toString(16).padStart(2, '0')).join(''),
      "cardless:idType": idType, // "passport" or "drivers_license"
      "cardless:state": state, // US state or territory
    },
    proof: {
      // This is the cryptographic signature - placeholder for now
      type: "Ed25519Signature2020",
      created: issuanceDate,
      verificationMethod: `${issuerId}#key-1`,
      proofPurpose: "assertionMethod",
      proofValue: "placeholder-signature-value"
    },
  };

  // Store credential on-chain
  let transactionId = null;
  let blockchainProof = null;
  
  try {
    // For demo purposes, we'll simulate on-chain storage
    // In production, you'd need the private key to sign transactions
    const credentialData = JSON.stringify(credential);
    transactionId = `simulated-tx-${crypto.randomUUID()}`;
    
    // Simulate blockchain confirmation
    blockchainProof = {
      transactionId,
      blockHeight: Math.floor(Math.random() * 1000000) + 1000000,
      timestamp: new Date().toISOString(),
      network: 'testnet',
      explorerUrl: `/app/verify/${transactionId}`, // Link to our verification page instead
      isSimulated: true // Flag to indicate this is simulated
    };
    
  } catch (error) {
    console.error('Error storing credential on-chain:', error);
    // Continue without blockchain storage for now
  }

  return { 
    credential, 
    success: true,
    blockchainProof
  };
}

const CreateCredential = () => {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  
  const appWalletAddress = import.meta.env.VITE_APP_WALLET_ADDRESS;
  const issuerId = appWalletAddress ? `did:algorand:${appWalletAddress}` : "Wallet address not configured";
  
  const [formData, setFormData] = useState({
    subjectId: `did:cardless:user:${crypto.randomUUID()}`,
    birthDate: "",
    governmentId: "",
    idType: "drivers_license",
    state: "CA",
    firstName: "",
    middleName: "",
    lastName: ""
  });

  const [showQR, setShowQR] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isStoringOnChain, setIsStoringOnChain] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Create Minimal Credential
        </h1>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Issuer:</strong>{" "}
            {appWalletAddress ? (
              <a 
                href={`https://explorer.perawallet.app/address/${appWalletAddress}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {appWalletAddress.substring(0, 4)}...{appWalletAddress.substring(appWalletAddress.length - 4)}
              </a>
            ) : (
              "Wallet address not configured"
            )}
          </p>
        </div>
        
        <Form method="post" className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor="subjectId">
              <span className="label-text">Subject ID (DID)</span>
            </label>
            <input
              type="text"
              id="subjectId"
              name="subjectId"
              value={formData.subjectId}
              readOnly
              className="input input-bordered w-full bg-gray-100"
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
              <span className="label-text">Birth Date - Must be at least 13 years ago</span>
            </label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              required
              value={formData.birthDate}
              onChange={handleInputChange}
              max={new Date(new Date().getFullYear() - 13, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
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
              <option value="drivers_license">Driver's License</option>
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

          <button
            type="submit"
            className="btn btn-primary w-full"
          >
            Create Credential
          </button>
        </Form>

        {actionData?.error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {actionData.error}
          </div>
        )}

        {actionData?.success && actionData.credential && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Generated Credential:</h2>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="btn btn-sm btn-outline"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            
            {showDetails && (
              <div className="bg-gray-100 p-4 rounded-md overflow-x-auto mb-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(actionData.credential, null, 2)}
                </pre>
              </div>
            )}
            
            {actionData?.blockchainProof && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-semibold text-green-800 mb-2">
                  ✅ {actionData.blockchainProof.isSimulated ? 'Simulated Blockchain Storage' : 'Stored on Blockchain'}
                </h3>
                <div className="text-xs text-green-700 space-y-1">
                  <p><strong>Transaction ID:</strong> {actionData.blockchainProof.transactionId}</p>
                  <p><strong>Block Height:</strong> {actionData.blockchainProof.blockHeight}</p>
                  <p><strong>Network:</strong> {actionData.blockchainProof.network}</p>
                  <p><strong>Timestamp:</strong> {new Date(actionData.blockchainProof.timestamp).toLocaleString()}</p>
                  {actionData.blockchainProof.isSimulated && (
                    <p className="text-orange-600"><strong>Note:</strong> This is a simulated transaction for demonstration</p>
                  )}
                  <a 
                    href={actionData.blockchainProof.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 underline"
                  >
                    {actionData.blockchainProof.isSimulated ? 'View Proof →' : 'View on AlgoExplorer →'}
                  </a>
                </div>
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
                  navigator.clipboard.writeText(JSON.stringify(actionData.credential, null, 2));
                  alert('Credential copied to clipboard!');
                }}
                className="btn btn-outline"
              >
                Copy to Clipboard
              </button>
              {actionData?.blockchainProof && (
                <button
                  onClick={() => {
                    window.open(`/app/verify/${actionData.blockchainProof?.transactionId}`, '_blank');
                  }}
                  className="btn btn-success"
                >
                  View Proof
                </button>
              )}
            </div>
          </div>
        )}

        {showQR && actionData?.credential && (
          <CredentialQR 
            credential={actionData.credential} 
            onClose={() => setShowQR(false)} 
          />
        )}
      </div>
    </div>
  );
};

export default CreateCredential;
