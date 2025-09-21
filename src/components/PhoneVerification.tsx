import { useState } from "react";

const PhoneVerification: React.FC<{
  age?: number;
  wallet: string;
  onConfirm: () => void;
}> = ({ age = 18, wallet = "", onConfirm }) => {
  const isMobile = Boolean(
    navigator?.userAgent?.match(
      /Android|BlackBerry|iPhone|iPod|Opera Mini|IEMobile|WPDesktop/i
    )
  );

  return (
    <>
      {isMobile ? (
        <ConfirmScreen age={age} wallet={wallet} onConfirm={onConfirm} />
      ) : (
        <div className="mockup-phone w-sm max-h-svh">
          <div className="mockup-phone-camera"></div>
          <div className="mockup-phone-display bg-white text-black p-4 place-content-center h-full">
            <ConfirmScreen age={age} wallet={wallet} onConfirm={onConfirm} />
          </div>
        </div>
      )}
    </>
  );
};
export default PhoneVerification;

const ConfirmScreen: React.FC<{
  age?: number;
  wallet: string;
  onConfirm: () => void;
}> = ({ age = 18, wallet = "", onConfirm }) => {
  const [checked, setChecked] = useState(true);
  const toggleCheck = () => {
    setChecked(!checked);
  };
  const [confirming, setConfirming] = useState(false);

  const confirm = () => {
    setConfirming(true);
    onConfirm();
  };
  const wallets = ["metamask", "coinbase", "pera", "phantom"];
  if (!wallets.includes(wallet)) {
    return (
      <p className="text-red">Error: invalid wallet subbmited: {wallet}</p>
    );
  }
  return (
    <div className="flex flex-col justify-between flex-grow max-h-[90vh]">
      <div className="text-left space-y-10  ">
        <div className="font-bold my-2 text-xl">Verify your age</div>
        <div className="text-sm space-y-3">
          <p>
            Spicy Vids is requesting you to verify that you are older than {age}
          </p>
          <p>
            <a
              href="https://www.freespeechcoalition.com/age-verification"
              className="text-blue-700 underline"
            >
              Why do we need to verify your age?
            </a>
          </p>
        </div>
        <div className="space-y-6  p-4 bg-gray-100 rounded-md">
          <p className="font-bold text-sm">Shared attestation</p>
          <div className="flex items-center space-x-3">
            {/* <img
              src={`/wallets/${wallet}.png`}
              className="w-10 h-10 border border-gray-200 rounded-full"
            /> */}
            <div className="border border-gray-200 rounded-full h-11 w-11 flex items-center justify-center bg-white">
              <img src={`/favicon.png`} className="w-8 h-8 mb-2" />
            </div>
            <div className="">
              <div className="text-sm font-bold">Cardless ID</div>
              <div className="text-sm">John Doe</div>
            </div>
          </div>
          <p className="font-bold text-sm">Requesting site</p>
          <div className="flex items-center space-x-3">
            <img
              src="/logospicy.png"
              className="w-10 h-10 border border-gray-200 rounded-full"
            />
            <div className="text-sm">Spicy Vids</div>
          </div>
          <p className="font-bold text-sm">Verification details</p>
          <p className="text-sm">
            This is the information that will be shared with the requesting
            site.
          </p>
          <div className="bg-white p-2 rounded-sm flex items-center space-x-4">
            <input
              type="checkbox"
              className="h-6 w-6 rounded-md "
              checked={checked}
              onClick={toggleCheck}
            />
            <div className="">
              <p className="text-sm text-gray-400">AGE RANGE</p>
              <p className="text-sm font-bold">&gt; {age}</p>
            </div>
          </div>
        </div>
      </div>
      <button
        className="bg-blue-700 w-full text-white text-md rounded-md p-2 mt-2 cursor-pointer disabled:bg-gray-400 disabled:cursor-default"
        disabled={!checked || confirming}
        onClick={confirm}
      >
        {confirming ? (
          <span className="loading loading-spinner loading-lg"></span>
        ) : (
          <span>Confirm</span>
        )}
      </button>
    </div>
  );
};
