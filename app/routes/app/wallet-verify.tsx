import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/wallet-verify";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session");

  if (!sessionId) {
    throw new Response("Session ID required", { status: 400 });
  }

  return { sessionId };
}

export default function WalletVerify({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userBirthYear, setUserBirthYear] = useState<number | null>(null);

  // Fetch session details
  useEffect(() => {
    fetchSession();
  }, [loaderData.sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/age-verify/session/${loaderData.sessionId}`);

      if (!response.ok) {
        throw new Error("Session not found");
      }

      const data = await response.json();

      if (data.status !== "pending") {
        setError("This verification session is no longer active");
        return;
      }

      if (Date.now() > data.expiresAt) {
        setError("This verification session has expired");
        return;
      }

      setSession(data);
    } catch (err) {
      setError("Failed to load verification request");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Check user's wallet credential
  // TODO: Replace with actual wallet credential check
  const checkUserAge = async (): Promise<boolean> => {
    // Mock: Get user's birth year from their credential
    // In production, this would read from the Algorand wallet
    const mockBirthYear = 2000; // Replace with actual credential data
    setUserBirthYear(mockBirthYear);

    const currentYear = new Date().getFullYear();
    const userAge = currentYear - mockBirthYear;

    return userAge >= session.minAge;
  };

  const handleVerify = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const meetsRequirement = await checkUserAge();

      const response = await fetch(`/api/age-verify/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: loaderData.sessionId,
          approved: meetsRequirement,
          walletAddress: "MOCK_WALLET_ADDRESS", // TODO: Replace with actual wallet address
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit verification");
      }

      // Show success message
      setTimeout(() => {
        if (meetsRequirement) {
          navigate("/app/wallet-verify-success?verified=true");
        } else {
          navigate("/app/wallet-verify-success?verified=false");
        }
      }, 1500);
    } catch (err) {
      setError("Failed to submit verification");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => {
    navigate("/");
  };

  const requiredBirthYear = session ? new Date().getFullYear() - session.minAge : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body items-center text-center">
            <div className="text-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="card-title">Verification Error</h2>
            <p className="text-gray-600">{error}</p>
            <div className="card-actions mt-4">
              <button onClick={() => navigate("/")} className="btn btn-primary">
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">Age Verification Request</h2>

          <div className="bg-base-200 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600 mb-2">A service is requesting to verify:</p>
            <p className="text-lg font-semibold">
              You were born before {requiredBirthYear}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              (Age {session.minAge} or older)
            </p>
          </div>

          <div className="alert alert-info mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span className="text-sm">
              Your wallet will only share whether you meet the age requirement. No other
              personal information will be shared.
            </span>
          </div>

          {submitting ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="text-gray-600">Submitting verification...</p>
            </div>
          ) : (
            <div className="card-actions flex-col gap-3">
              <button
                onClick={handleVerify}
                className="btn btn-primary btn-block btn-lg"
              >
                Verify My Age
              </button>
              <button onClick={handleDecline} className="btn btn-ghost btn-block">
                Cancel
              </button>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>Session ID: {loaderData.sessionId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
