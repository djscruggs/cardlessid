import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import type { Route } from "./+types/age-verify";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const minAge = url.searchParams.get("age") || "18";
  const challengeId = url.searchParams.get("challenge");

  return {
    minAge: parseInt(minAge),
    challengeId: challengeId || null,
  };
}

export default function AgeVerify({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [minAge, setMinAge] = useState(loaderData.minAge);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [challengeId] = useState(loaderData.challengeId); // Integrator challenge ID (if present)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const isIntegratorMode = challengeId !== null;

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Create session when component mounts or age changes (demo mode only)
  // In integrator mode, we skip session creation and use the challengeId directly
  useEffect(() => {
    if (!isIntegratorMode) {
      createSession();
    } else if (challengeId) {
      // Fetch challenge details to get minAge
      fetchChallengeDetails();
    }
  }, [minAge, isIntegratorMode, challengeId]);

  const fetchChallengeDetails = async () => {
    if (!challengeId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/integrator/challenge/details/${challengeId}`
      );
      if (response.ok) {
        const challenge = await response.json();
        setMinAge(challenge.minAge);
      }
    } catch (err) {
      console.error("Error fetching challenge:", err);
      setError("Invalid verification link");
    } finally {
      setLoading(false);
    }
  };

  // Poll for session/challenge status
  useEffect(() => {
    const idToCheck = isIntegratorMode ? challengeId : sessionId;
    if (!idToCheck) return;

    const pollInterval = setInterval(async () => {
      try {
        const endpoint = isIntegratorMode
          ? `/api/integrator/challenge/details/${challengeId}`
          : `/api/age-verify/session/${sessionId}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.status === "approved") {
          clearInterval(pollInterval);
          navigate("/app/age-verify-success");
        } else if (data.status === "rejected") {
          clearInterval(pollInterval);
          navigate("/app/age-verify-rejected");
        } else if (data.status === "expired") {
          clearInterval(pollInterval);
          setError("Verification expired. Please try again.");
          if (!isIntegratorMode) {
            setSessionId(null);
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [sessionId, challengeId, isIntegratorMode, navigate]);

  const createSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/age-verify/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minAge }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const session = await response.json();
      setSessionId(session.id);
    } catch (err) {
      setError("Failed to create verification session");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAgeChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAge = parseInt(formData.get("age") as string);
    if (newAge > 0 && newAge < 150) {
      setMinAge(newAge);
    }
  };

  const handleMobileTap = () => {
    if (isIntegratorMode && challengeId) {
      // Integrator mode: use challenge ID
      window.location.href = `cardlessid://verify?challenge=${challengeId}`;
      setTimeout(() => {
        navigate(`/app/wallet-verify?challenge=${challengeId}`);
      }, 1500);
    } else if (sessionId) {
      // Demo mode: use session ID
      window.location.href = `cardlessid://verify?session=${sessionId}&minAge=${minAge}`;
      setTimeout(() => {
        navigate(`/app/wallet-verify?session=${sessionId}`);
      }, 1500);
    }
  };

  const deepLinkUrl =
    isIntegratorMode && challengeId
      ? `cardlessid://verify?challenge=${challengeId}`
      : sessionId
        ? `cardlessid://verify?session=${sessionId}&minAge=${minAge}`
        : "";

  const webFallbackUrl =
    isIntegratorMode && challengeId
      ? `${window.location.origin}/app/wallet-verify?challenge=${challengeId}`
      : sessionId
        ? `${window.location.origin}/app/wallet-verify?session=${sessionId}`
        : "";

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {isIntegratorMode ? "Age Verification" : "Age Verification Demo"}
        </h1>

        {/* Age Configuration - Only show in demo mode */}
        {!isIntegratorMode && (
          <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title">Configure Minimum Age</h2>
              <form onSubmit={handleAgeChange} className="flex gap-4 items-end">
                <div className="form-control flex-1">
                  <label className="label">
                    <span className="label-text">Minimum Age Required</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    defaultValue={minAge}
                    min="1"
                    max="150"
                    className="input input-bordered"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Update
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Verification Display */}
        {error && (
          <div className="alert alert-error mb-8">
            <span>{error}</span>
            <button onClick={createSession} className="btn btn-sm">
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}

        {((sessionId && !loading) ||
          (isIntegratorMode && challengeId && !loading)) && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <h2 className="card-title mb-4">
                Verify You Are {minAge} or Older
              </h2>

              {isMobile ? (
                // Mobile: Show tap button
                <div className="w-full">
                  <p className="mb-6 text-gray-600">
                    Tap the button below to verify your age with your wallet
                  </p>
                  <button
                    onClick={handleMobileTap}
                    className="btn btn-primary btn-lg btn-block"
                  >
                    Tap to Verify
                  </button>
                  <div className="mt-4 text-sm text-gray-500">
                    <p>This will open your Cardless ID wallet app</p>
                    <p className="mt-2">
                      Don't have the app?{" "}
                      <a href="/install" className="link link-primary">
                        Install it here
                      </a>
                    </p>
                  </div>
                </div>
              ) : (
                // Desktop: Show QR code
                <div className="w-full">
                  <p className="mb-6 text-gray-600">
                    Scan this QR code with your Cardless ID wallet app
                  </p>
                  <div className="flex justify-center mb-6 bg-white p-8 rounded-lg">
                    <QRCodeSVG value={deepLinkUrl} size={256} />
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Waiting for verification...</p>
                    <p className="mt-2">Session ID: {sessionId}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 text-xs text-gray-400">
                <p>Session expires in 10 minutes</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
