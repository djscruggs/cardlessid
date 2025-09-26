import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { QRCodeSVG } from "qrcode.react";
import { useSession, VerificationState } from "@worldcoin/idkit";

export function meta() {
  return [{ title: "Verify with Worldcoin" }];
}

const World = () => {
  const APP_ID = import.meta.env.VITE_WORLDCOIN_APP_ID;
  const ACTION = "age-verification-over-18";
  const { status, sessionURI, result, errorCode } = useSession({
    app_id: APP_ID,
    action: ACTION,
  });
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
  console.log(
    status,
    sessionURI,
    JSON.stringify(result, null, 2).slice(0, 10),
    errorCode
  );
  const renderStatusContent = () => {
    if (!status) {
      return <div>Initializing session...</div>;
    }

    switch (status) {
      case VerificationState.PreparingClient:
        return (
          <div>
            <h2>Preparing client...</h2>
            <p>Loading verification widget</p>
          </div>
        );

      case VerificationState.WaitingForConnection:
        return (
          <div>
            <h2>Waiting for connection</h2>
            <p>Scan the QR code to verify</p>
            {sessionURI && <QRCodeSVG value={sessionURI} size={256} />}
          </div>
        );

      case VerificationState.WaitingForApp:
        return (
          <div>
            <h2>Connected</h2>
            <p>Please complete verification in your World app</p>
          </div>
        );

      case VerificationState.Confirmed:
        return (
          <div>
            <h2>Verification Successful!</h2>
            <p>
              Proof: {result?.proof.slice(0, 10)}...{result?.proof.slice(-10)}
            </p>
            <pre className="whitespace-pre-wrap  wrap-anywhere bg-[#8080802b] p-2 my-4 rounded-md">
              {JSON.stringify(result, null, 2)}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                alert("Proof copied to clipboard!");
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Copy Proof
            </button>
          </div>
        );

      case VerificationState.Failed:
        return (
          <div>
            <h2>Verification Failed</h2>
            <p>Error: {errorCode || "Unknown error"}</p>
          </div>
        );

      default:
        return (
          <div>
            <h2>Status: {status}</h2>
            {sessionURI && <QRCodeSVG value={sessionURI} size={256} />}
          </div>
        );
    }
  };
  return (
    // <div
    //   style={{
    //     display: "flex",
    //     flexDirection: "column",
    //     alignItems: "center",
    //     padding: "2rem",
    //   }}
    // >
    //   {renderStatusContent()}
    // </div>
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
