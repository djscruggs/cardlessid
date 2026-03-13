import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { useState } from "react";
import { data, type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { isEEARequest } from "~/utils/geo.server";

export function meta() {
  return [{ title: "Verify with Worldcoin" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (isEEARequest(request)) {
    return data({ blocked: true }, { status: 451 });
  }
  return data({ blocked: false });
}

const World = () => {
  const { blocked } = useLoaderData<typeof loader>();

  if (blocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Not Available in Your Region</h1>
          <p className="text-gray-600">
            Cardless ID is not available to users in the EU or EEA.
          </p>
        </div>
      </div>
    );
  }
  const APP_ID = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const ACTION = "age-verification-over-18";
  const [verified, setVerified] = useState(false);
  const handleVerify = async (proof: any) => {
    const res = await fetch("/api/verify-worldcoin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(proof),
    });

    if (!res.ok) {
      throw new Error("Verification failed."); // IDKit will display the error message to the user in the modal
    }
  };

  const onSuccess = () => {
    setVerified(true);
  };

  return (
    <>
      {!verified ? (
        <IDKitWidget
          app_id={APP_ID}
          action={ACTION}
          onSuccess={onSuccess} // callback when the modal is closed
          handleVerify={handleVerify} // callback when the proof is received
          verification_level={VerificationLevel.Orb}
        >
          {({ open }) => (
            // This is the button that will open the IDKit modal
            <button
              className="btn bg-logoblue text-white w-sm rounded-full"
              onClick={open}
            >
              Verify with World ID
            </button>
          )}
        </IDKitWidget>
      ) : (
        <div className="flex justify-center">
          <h1>Verification successful!</h1>
        </div>
      )}
    </>
  );
};

export default World;
