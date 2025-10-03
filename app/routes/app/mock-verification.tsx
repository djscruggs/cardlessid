import { useState, useEffect } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export function meta() {
  return [{ title: "Mock ID Verification" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  return {
    apiBaseUrl: typeof window === 'undefined'
      ? process.env.API_BASE_URL || 'http://localhost:5173'
      : '',
  };
}

// Generate or retrieve a test wallet address for development
function getOrCreateTestWallet(): string {
  const STORAGE_KEY = 'cardlessid_test_wallet';

  // Check if we already have a test wallet in localStorage
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  // Generate a mock Algorand address (58 chars, base32)
  // In production, this would be a real wallet connection
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let address = '';
  for (let i = 0; i < 58; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }

  localStorage.setItem(STORAGE_KEY, address);
  console.log('🔐 Generated test wallet:', address);
  console.log('⚠️  This is a mock address for testing only');

  return address;
}

const MockVerification = () => {
  const { apiBaseUrl } = useLoaderData<typeof loader>();
  const baseUrl = apiBaseUrl || '';

  const [step, setStep] = useState<'start' | 'verify' | 'status' | 'credential'>('start');
  const [sessionId, setSessionId] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [providerSessionId, setProviderSessionId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  // Auto-generate test wallet on mount
  useEffect(() => {
    const testWallet = getOrCreateTestWallet();
    setWalletAddress(testWallet);
  }, []);

  const [formData, setFormData] = useState({
    firstName: 'John',
    middleName: '',
    lastName: 'Doe',
    birthDate: '1990-01-15',
    governmentId: 'D1234567',
    idType: 'government_id',
    state: 'CA',
  });

  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [credential, setCredential] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Step 1: Start verification session
  const startSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/api/verification/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'mock' }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setAuthToken(data.authToken);
      setProviderSessionId(data.providerSessionId);  // Use the actual providerSessionId from response
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Simulate verification completion (webhook)
  const completeVerification = async (approved: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const webhookData = {
        providerSessionId,
        status: approved ? 'approved' : 'rejected',
        ...(approved ? formData : {}),
      };

      const response = await fetch(`${baseUrl}/api/verification/webhook?provider=mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error('Failed to complete verification');
      }

      await response.json();
      setStep('status');
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Check session status
  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/api/verification/status/${sessionId}`);

      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();
      setSessionStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Issue credential
  const issueCredential = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/api/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationSessionId: sessionId,
          walletAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to issue credential');
      }

      const data = await response.json();
      setCredential(data);
      setStep('credential');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('start');
    setSessionId('');
    setAuthToken('');
    setProviderSessionId('');
    setWalletAddress('');
    setSessionStatus(null);
    setCredential(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Mock ID Verification Flow
            </h1>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
              Mock Provider
            </span>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {['Start', 'Verify', 'Status', 'Credential'].map((label, idx) => (
                <div key={label} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    ['start', 'verify', 'status', 'credential'].indexOf(step) >= idx
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>
                  {idx < 3 && <div className="w-12 h-0.5 bg-gray-300 mx-2" />}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Step 1: Start Session */}
          {step === 'start' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                This simulates starting an ID verification session. In production, this would
                return a token for the mobile SDK.
              </p>
              <button
                onClick={startSession}
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Starting Session...' : 'Start Verification Session'}
              </button>
            </div>
          )}

          {/* Step 2: Verify Identity */}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Session ID:</strong> {sessionId}
                </p>
                <p className="text-sm text-blue-800 break-all">
                  <strong>Auth Token:</strong> {authToken}
                </p>
              </div>

              <p className="text-gray-600">
                Simulate the user completing ID verification. Fill in identity details:
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">First Name</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Last Name</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Birth Date</span>
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Government ID</span>
                  </label>
                  <input
                    type="text"
                    name="governmentId"
                    value={formData.governmentId}
                    onChange={handleInputChange}
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">ID Type</span>
                  </label>
                  <select
                    name="idType"
                    value={formData.idType}
                    onChange={handleInputChange}
                    className="select select-bordered"
                  >
                    <option value="government_id">Government ID</option>
                    <option value="passport">Passport</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">State</span>
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="select select-bordered"
                  >
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="TX">Texas</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => completeVerification(true)}
                  disabled={loading}
                  className="btn btn-success flex-1"
                >
                  {loading ? 'Processing...' : 'Approve Verification'}
                </button>
                <button
                  onClick={() => completeVerification(false)}
                  disabled={loading}
                  className="btn btn-error flex-1"
                >
                  {loading ? 'Processing...' : 'Reject Verification'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Check Status */}
          {step === 'status' && (
            <div className="space-y-4">
              {sessionStatus && (
                <div className={`p-4 border rounded ${
                  sessionStatus.status === 'approved'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-sm ${
                    sessionStatus.status === 'approved' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    <strong>Status:</strong> {sessionStatus.status}
                  </p>
                  <p className={`text-sm ${
                    sessionStatus.status === 'approved' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    <strong>Ready for Credential:</strong> {sessionStatus.ready ? 'Yes' : 'No'}
                  </p>
                </div>
              )}

              {sessionStatus?.ready && (
                <>
                  <p className="text-gray-600">
                    Verification approved! Enter a wallet address to issue the credential:
                  </p>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Algorand Wallet Address</span>
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Enter Algorand wallet address"
                      className="input input-bordered"
                    />
                  </div>

                  <button
                    onClick={issueCredential}
                    disabled={loading || !walletAddress}
                    className="btn btn-primary w-full"
                  >
                    {loading ? 'Issuing Credential...' : 'Issue Credential'}
                  </button>
                </>
              )}

              {!sessionStatus?.ready && (
                <button
                  onClick={reset}
                  className="btn btn-outline w-full"
                >
                  Start Over
                </button>
              )}
            </div>
          )}

          {/* Step 4: Credential Issued */}
          {step === 'credential' && credential && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-semibold">✓ Credential Issued Successfully!</p>
              </div>

              <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                <h3 className="text-sm font-semibold mb-2">Credential:</h3>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(credential.credential, null, 2)}
                </pre>
              </div>

              {credential.blockchain?.transaction && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Blockchain Transaction:</strong>
                  </p>
                  <a
                    href={credential.blockchain.transaction.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {credential.blockchain.transaction.id}
                  </a>
                </div>
              )}

              {credential.duplicateDetection && (
                <div className={`p-4 border rounded ${
                  credential.duplicateDetection.isDuplicate
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <p className={`text-sm ${
                    credential.duplicateDetection.isDuplicate ? 'text-orange-800' : 'text-green-800'
                  }`}>
                    {credential.duplicateDetection.message}
                  </p>
                </div>
              )}

              <button
                onClick={reset}
                className="btn btn-outline w-full"
              >
                Start New Verification
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockVerification;
