import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { useState } from "react";
export function meta() {
  return [{ title: "Verify with Worldcoin" }];
}

const World = () => {
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
