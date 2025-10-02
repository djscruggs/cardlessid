import { useNavigate } from "react-router";

export default function AgeVerifySuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body items-center text-center">
          <div className="text-success mb-4">
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

          <h2 className="card-title text-3xl mb-4">Access Granted</h2>

          <p className="text-gray-600 mb-6">
            Age verification successful! You meet the minimum age requirement.
          </p>

          <div className="alert alert-success mb-6">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>You now have access to age-restricted content</span>
          </div>

          <div className="bg-base-200 p-6 rounded-lg w-full mb-6">
            <h3 className="font-bold text-lg mb-2">Protected Content</h3>
            <p className="text-gray-600">
              This is an example of content that would only be visible to users who have
              verified their age. In a real application, this could be age-restricted
              products, services, or information.
            </p>
          </div>

          <div className="card-actions">
            <button onClick={() => navigate("/app/age-verify")} className="btn btn-primary">
              Try Another Verification
            </button>
            <button onClick={() => navigate("/")} className="btn btn-ghost">
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
