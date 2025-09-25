import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";

const World = () => {
  const APP_ID = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const ACTION = "age-verification-over-18";
  const handleVerify = async (proof: any) => {
    console.log(proof);
    const res = await fetch("/api/verify-worldcoin", {
      // route to your backend will depend on implementation
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
    alert("it was successful");
  };

  return (
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
  );
};

export default World;
