import { useNavigate, useSearchParams } from "react-router";

export default function WalletVerifySuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verified = searchParams.get("verified") === "true";

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body items-center text-center">
          <div className={verified ? "text-success mb-4" : "text-info mb-4"}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-24 w-24"
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
          </div>

          <h2 className="card-title text-3xl mb-4">Verification Submitted</h2>

          <p className="text-gray-600 mb-6">
            Your age verification response has been sent successfully.
          </p>

          <div className={`alert ${verified ? "alert-success" : "alert-info"} mb-6`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {verified
                ? "You met the age requirement. The requesting service has been notified."
                : "You did not meet the age requirement. The requesting service has been notified."}
            </span>
          </div>

          <div className="bg-base-200 p-6 rounded-lg w-full mb-6">
            <h3 className="font-bold text-lg mb-2">What Happened?</h3>
            <p className="text-gray-600 text-sm">
              Your wallet checked your age credential and shared only a true/false
              response with the requesting service. No personal information such as your
              name, birth date, or other details were shared.
            </p>
          </div>

          <div className="card-actions">
            <button onClick={() => navigate("/")} className="btn btn-primary">
              Done
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>You can safely close this window</p>
          </div>
        </div>
      </div>
    </div>
  );
}
