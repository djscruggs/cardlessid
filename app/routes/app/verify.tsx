/**
 * Custom verification flow - Main orchestrator
 * Handles the multi-step verification process
 */

import { useState, useEffect } from "react";
import { redirect, type ActionFunctionArgs } from "react-router";
import { IdPhotoCapture } from "~/components/verification/IdPhotoCapture";
import { IdentityForm } from "~/components/verification/IdentityForm";
import { SelfieCapture } from "~/components/verification/SelfieCapture";
import { VerificationResult } from "~/components/verification/VerificationResult";
import type { VerifiedIdentity } from "~/types/verification";

type VerificationStep = "id-photo" | "confirm-data" | "selfie" | "result";

interface VerificationState {
  step: VerificationStep;
  sessionId?: string;
  verificationToken?: string; // Signed token for secure credential creation
  extractedData?: Partial<VerifiedIdentity>;
  idPhotoBase64?: string; // Store ID photo in client memory (never persisted)
  faceMatchResult?: any;
  error?: string;
}

export default function CustomVerify() {
  const [state, setState] = useState<VerificationState>({
    step: "id-photo",
  });
  const [isWidget, setIsWidget] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const widgetMode = params.get("widget") === "true";
    setIsWidget(widgetMode);

    if (widgetMode) {
      // Send loaded message
      window.parent.postMessage({ type: "WidgetLoaded" }, "*");
    }
  }, []);

  const handleIdPhotoSuccess = (data: any) => {
    // Store verification token and extracted data in sessionStorage for credential creation
    if (data.verificationToken) {
      sessionStorage.setItem("verificationToken", data.verificationToken);
    }
    if (data.sessionId) {
      sessionStorage.setItem("verificationSessionId", data.sessionId);
    }
    if (data.extractedData) {
      sessionStorage.setItem(
        "extractedData",
        JSON.stringify(data.extractedData)
      );
    }

    setState({
      step: "confirm-data",
      sessionId: data.sessionId,
      verificationToken: data.verificationToken,
      extractedData: data.extractedData,
      idPhotoBase64: data.idPhotoBase64, // Store in client memory
      error: undefined,
    });
  };

  const handleIdPhotoError = (error: string) => {
    setState({
      step: "id-photo",
      error: error,
    });
  };

  const handleDataConfirmed = () => {
    setState({
      ...state,
      step: "selfie",
      error: undefined,
    });
  };

  const handleSelfieSuccess = async (result: any) => {
    setState({
      ...state,
      step: "result",
      faceMatchResult: result,
      idPhotoBase64: undefined, // Clear ID photo from memory after successful verification
      error: undefined,
    });

    if (result.match) {
      // Face match successful - proceed to credential issuance
      // This will happen in the result component
    } else {
      // Face match failed - clear data and restart
      // ID photo already cleared above
    }
  };

  const handleSelfieError = (error: string) => {
    setState({
      ...state,
      idPhotoBase64: undefined, // Clear ID photo from memory on error
      error: error,
    });
  };

  const handleRestart = () => {
    setState({ step: "id-photo", idPhotoBase64: undefined, error: undefined });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {isWidget && (
        <style>{`
          body {
            margin: 0;
            overflow: auto;
          }
        `}</style>
      )}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Identity Verification</h1>
          <p className="text-gray-600 mb-8">
            Complete the verification process to receive your digital credential
          </p>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center relative">
              {[
                { key: "id-photo", label: "ID Photo" },
                { key: "confirm-data", label: "Confirm" },
                { key: "selfie", label: "Selfie" },
                { key: "result", label: "Complete" },
              ].map((item, index) => {
                const steps = ["id-photo", "confirm-data", "selfie", "result"];
                const currentIndex = steps.indexOf(state.step);
                const isCompleted = index < currentIndex;
                const isCurrent = state.step === item.key;

                return (
                  <div
                    key={item.key}
                    className="flex-1 flex flex-col items-center relative"
                  >
                    {/* Circle */}
                    <div className="relative z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                          isCurrent
                            ? "bg-blue-600 text-white"
                            : isCompleted
                              ? "bg-green-600 text-white"
                              : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                    </div>

                    {/* Label */}
                    <div className="text-xs text-center text-gray-700 mt-2 font-medium">
                      {item.label}
                    </div>

                    {/* Connecting line (not for last item) */}
                    {index < 3 && (
                      <div
                        className={`absolute top-5 left-1/2 w-full h-1 -z-0 ${
                          isCompleted ? "bg-green-600" : "bg-gray-300"
                        }`}
                        style={{ transform: "translateY(-50%)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error message */}
          {state.error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-red-600 mt-0.5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="font-medium text-red-900">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{state.error}</p>
                </div>
                <button
                  onClick={() => setState({ ...state, error: undefined })}
                  className="text-red-400 hover:text-red-600"
                  aria-label="Dismiss error"
                >
                  <svg
                    className="h-5 w-5"
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
                </button>
              </div>
            </div>
          )}

          {/* Step content */}
          {state.step === "id-photo" && (
            <IdPhotoCapture
              onSuccess={handleIdPhotoSuccess}
              onError={handleIdPhotoError}
            />
          )}

          {state.step === "confirm-data" && state.extractedData && (
            <IdentityForm
              data={state.extractedData}
              onConfirm={handleDataConfirmed}
              onBack={() => setState({ step: "id-photo", error: undefined })}
            />
          )}

          {state.step === "selfie" &&
            state.sessionId &&
            state.idPhotoBase64 && (
              <SelfieCapture
                sessionId={state.sessionId}
                idPhotoBase64={state.idPhotoBase64}
                onSuccess={handleSelfieSuccess}
                onError={handleSelfieError}
                onBack={() =>
                  setState({ ...state, step: "confirm-data", error: undefined })
                }
              />
            )}

          {state.step === "result" && state.faceMatchResult && (
            <VerificationResult
              result={state.faceMatchResult}
              sessionId={state.sessionId!}
              onRestart={handleRestart}
            />
          )}
        </div>
      </div>
    </div>
  );
}
