import React, { useState, useEffect } from "react";
import { useRouteLoaderData, useParams } from "react-router";
import PhoneVerification from "~/components/PhoneVerification";
import { getDatabase, ref, set, get, child } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";
import { firebaseApp } from "~/firebase.config";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Verify Your Age" }];
}

const Verify: React.FC = () => {
  const lData = useRouteLoaderData("root");
  const isDev = !lData?.hostname.includes("cardlessid.org");
  const params = useParams();
  const [modal, setModal] = useState(true);
  const [wallet, setWallet] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const toggleModal = () => {
    if (modal == true) {
      setTapped("");
      setStep(1);
    }
    setModal(!modal);
  };
  const [data, setData] = useState({ verified: false });
  const vid = params.vid || "";
  let _error = "";
  if (!vid) {
    _error = "No verification ID provided.";
  }
  const [error, setError] = useState(_error);
  const wallets = ["metamask", "coinbase", "pera", "phantom"];
  const auth = getAuth(firebaseApp);
  const dbRef = ref(getDatabase(firebaseApp));
  const [tapped, setTapped] = useState("");
  const onTap = (wallet: string) => {
    setLoading(true);
    if (!wallets.includes(tapped)) {
      setTapped(wallet);
      setTimeout(() => {
        setStep(2);
        setWallet(wallet);
        setLoading(false);
      }, 1500);
    }
  };
  const confirm = async () => {
    setConfirming(true);
    set(child(dbRef, vid), { verified: true }).catch((writeError) => {
      setModal(false);
      setError("Write failed: " + writeError.message);
    });
    setTimeout(() => {
      setData({ verified: true });
      setConfirming(true);
    }, 2000);
  };

  const loadData = async (dbRef: any, uniqueId: string) => {
    try {
      const snapshot = await get(child(dbRef, uniqueId));

      if (snapshot.exists()) {
        const fetchedData = snapshot.val();
        setData(fetchedData);
      } else {
        await set(child(dbRef, uniqueId), data);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError("Authentication failed: " + error.message);
      } else {
        // Handle cases where the error is not an Error object (e.g., a string)
        setError("Authentication failed: " + String(error));
      }
    } finally {
      setLoading(false);
    }
  };
  signInAnonymously(auth);
  useEffect(() => {
    const initialize = async () => {
      try {
        await loadData(dbRef, vid);
      } catch (authError) {
        if (authError instanceof Error) {
          setError("Authentication failed: " + authError.message);
        } else {
          // Handle cases where the error is not an Error object (e.g., a string)
          setError("Authentication failed: " + String(authError));
        }
      }
    };
    initialize();
  }, []);

  return (
    <div>
      <div>
        <div className="flex flex-col justify-center items-center">
          <>
            {!loading && !data.verified ? (
              <>
                {!error ? (
                  <>
                    <>
                      <p className="mt-20 mb-8">
                        Click below to verify your age.
                      </p>
                      <button
                        className="bg-logoblue p-4 text-white text-2xl rounded-full cursor-pointer"
                        onClick={toggleModal}
                      >
                        Verify Now
                      </button>
                    </>
                  </>
                ) : (
                  <div className="flex flex-col">
                    <p className="text-red-500 text-xl">Error: {error}</p>
                    <p className="text-gray-600">
                      Please ensure you are accessing this page with a valid QR
                      code or link.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {!modal && (
                  <p className="max-w-lg mt-10">
                    You are verified. You can close this window and return to
                    your main browser.
                  </p>
                )}
              </>
            )}
          </>
        </div>

        <dialog open={modal} onClose={toggleModal} className="modal">
          <div className="relative text-base max-w-xl text-left flex flex-col items-center bg-white p-4 rounded-lg">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-1 top-1"
              onClick={() => setModal(false)}
              type="button"
            >
              ✕
            </button>
            {data.verified ? (
              <p className="my-8 max-w-sm">
                You are verified. You can close this window and return to your
                main browser.
              </p>
            ) : (
              <>
                {step == 2 && (
                  <div className="flex flex-col items-center justify-center">
                    <PhoneVerification
                      wallet={wallet}
                      age={18}
                      onConfirm={confirm}
                      confirming={confirming}
                    />
                  </div>
                )}
                {step == 1 && (
                  <>
                    <div className="space-y-2 mb-4 mt-6">
                      <p>
                        Since this is a demo, we won't do a full verification.
                        However, if you did it would give you the option of
                        verifying for the first time, or using one of our
                        partner wallets.{" "}
                      </p>
                      <p className="text-center font-bold">
                        No personal information is <em>ever</em> shared with the
                        web site.
                      </p>
                      <p className="text-center">
                        Click or tap one of the wallet logos below.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-10 max-w-sm">
                      {wallets.map((wallet) => (
                        <>
                          {tapped == wallet ? (
                            <div
                              key={wallet}
                              className="flex items-center justify-center"
                            >
                              <span className="loading loading-spinner loading-lg"></span>
                            </div>
                          ) : (
                            <img
                              key={wallet}
                              src={`/wallets/${wallet}.png`}
                              alt={`${wallet} wallet`}
                              onClick={() => onTap(wallet)}
                              className={` rounded-md h-30 w-30 opacity-50 ${
                                tapped == ""
                                  ? "hover:opacity-100 cursor-pointer"
                                  : ""
                              }`}
                            />
                          )}
                        </>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </dialog>
      </div>
    </div>
  );
};

export default Verify;
