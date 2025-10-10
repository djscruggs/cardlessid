/**
 * Verification Result Component
 * Shows result of face comparison and handles credential issuance
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

interface VerificationResultProps {
  result: {
    match: boolean;
    confidence: number;
  };
  sessionId: string;
  onRestart: () => void;
}

export function VerificationResult({ result, sessionId, onRestart }: VerificationResultProps) {
  const [isIssuingCredential, setIsIssuingCredential] = useState(false);
  const [credentialIssued, setCredentialIssued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (result.match) {
      // Automatically start credential issuance if face match was successful
      issueCredential();
    }
  }, [result.match]);

  const issueCredential = async () => {
    setIsIssuingCredential(true);
    setError(null);

    try {
      // For now, just redirect to the create-credential page with the session ID
      // The create-credential page will handle the actual NFT minting
      // In a production app, you might want to integrate directly here
      
      // Store session ID in localStorage for the credential creation page
      localStorage.setItem('verificationSessionId', sessionId);
      
      // Simulate a brief delay to show processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setCredentialIssued(true);
      
      // Redirect after a brief success message display
      setTimeout(() => {
        navigate('/app/create-credential');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue credential');
      setIsIssuingCredential(false);
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

  if (credentialIssued) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
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

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verification Complete!
          </h2>
          <p className="text-gray-600">
            Redirecting you to create your digital credential...
          </p>
        </div>

        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
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

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Identity Verified!
        </h2>
        <p className="text-gray-600">
          Your selfie matches your ID photo with {Math.round(result.confidence * 100)}% confidence.
        </p>
      </div>

      {isIssuingCredential && (
        <div>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">
            Preparing your digital credential...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            type="button"
            onClick={issueCredential}
            className="mt-4 btn btn-primary"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}


