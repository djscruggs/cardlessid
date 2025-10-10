/**
 * Verification Result Component
 * Shows result of face comparison and displays session data
 */

import { useState, useEffect } from 'react';

interface VerificationResultProps {
  result: {
    match: boolean;
    confidence: number;
  };
  sessionId: string;
  onRestart: () => void;
}

export function VerificationResult({ result, sessionId, onRestart }: VerificationResultProps) {
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (result.match) {
      // Fetch session data to display
      fetchSessionData();
    }
  }, [result.match]);

  const fetchSessionData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/custom-verification/session/${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setSessionData(data.session);
      } else {
        setError(data.error || 'Failed to fetch session data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session data');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (sessionData) {
      navigator.clipboard.writeText(JSON.stringify(sessionData, null, 2));
    }
  };

  if (!result.match) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verification Failed
          </h2>
          <p className="text-gray-600">
            The selfie did not match your ID photo. This could be due to poor lighting,
            different angle, or other factors.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Your photos have been deleted from our servers for your privacy and security.
            You can try again with better lighting and camera positioning.
          </p>
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="btn btn-primary"
        >
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Identity Verified!
        </h2>
        <p className="text-gray-600">
          Your selfie matches your ID photo with {Math.round(result.confidence * 100)}% confidence.
        </p>
      </div>

      {isLoading && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">
            Loading session data...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            type="button"
            onClick={fetchSessionData}
            className="mt-4 btn btn-primary"
          >
            Try Again
          </button>
        </div>
      )}

      {sessionData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Verification Session Data
            </h3>
            <button
              type="button"
              onClick={copyToClipboard}
              className="text-sm px-3 py-1 text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
            >
              Copy JSON
            </button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
            <pre className="text-sm text-green-400 font-mono">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Next steps:</strong> Use this verified identity data to issue a credential, 
              create an account, or integrate with your application's authentication flow.
            </p>
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="w-full btn btn-outline"
          >
            Verify Another Identity
          </button>
        </div>
      )}
    </div>
  );
}


