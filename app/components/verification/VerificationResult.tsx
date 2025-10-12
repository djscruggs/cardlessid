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
  const handleCreateCredential = () => {
    // Navigate to credential creation
    // sessionId and verificationToken are already in sessionStorage
    window.location.href = '/app/create-credential';
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
        <p className="text-gray-600 mb-6">
          Your selfie matches your ID photo with {Math.round(result.confidence * 100)}% confidence.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-medium text-green-900">Verification Complete</h3>
            <p className="text-sm text-green-700 mt-1">
              Your identity has been verified and secured. You can now proceed to create your credential.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleCreateCredential}
          className="w-full btn btn-primary"
        >
          Create Credential
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="w-full btn btn-outline"
        >
          Verify Another Identity
        </button>
      </div>
    </div>
  );
}


