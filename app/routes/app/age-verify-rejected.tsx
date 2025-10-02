import { useNavigate } from "react-router";

export default function AgeVerifyRejected() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body items-center text-center">
          <div className="text-warning mb-4">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="card-title text-3xl mb-4">Access Denied</h2>

          <p className="text-gray-600 mb-6">
            Unfortunately, you do not meet the minimum age requirement to access this
            content.
          </p>

          <div className="alert alert-warning mb-6">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Your credentials indicate you are not old enough</span>
          </div>

          <div className="bg-base-200 p-6 rounded-lg w-full mb-6">
            <h3 className="font-bold text-lg mb-2">Age Verification</h3>
            <p className="text-gray-600">
              This content requires age verification to ensure compliance with legal
              requirements. Your identity credential does not meet the minimum age
              threshold for this service.
            </p>
          </div>

          <div className="card-actions">
            <button onClick={() => navigate("/")} className="btn btn-primary">
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
