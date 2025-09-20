import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDatabase, ref, set, get, child } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";
import { firebaseApp } from "../firebase-config.ts";
import usePageTitle from "../hooks/usePageTitle.ts";

const videos = [
  { id: "meDRHqG2djI", title: "Ty Dolla $ign - Spicy (feat. Post Malone)" },
  { id: "Os_heh8vPfs", title: "aespa ‘Spicy’ MV" },
  { id: "QMwJtMJLXE0", title: "CL - SPICY (Official Video)" },
  { id: "vSH7Y92snVM", title: "Julia Cole - Spicy (Official Music Video)" },
  {
    id: "hvjytRyt27c",
    title: "Herve Pagez & Diplo - Spicy (feat. Charli XCX)",
  },
  { id: "7cSaPi-UDjM", title: "Jenny 69 - SPICY (Official Music Video)" },
  {
    id: "5Ep8M8D8mkw",
    title: "Boris Brejcha - Spicy feat. Ginger (Official Video)",
  },
  { id: "798vylI5tTY", title: "Nas - Spicy ft. Fivio Foreign & A$AP Ferg" },
  {
    id: "o850kcXxc9w",
    title: "Extreme Spicy Food Tiktok Compilation (2 Hour Edition)",
  },
  { id: "WicBv6wkjsk", title: "Extreme Spicy Food Tiktok Compilation 6" },
  { id: "vGKnPlNe1Eo", title: "Spicy | Official Music Video" },
  { id: "vhUcgLsLCEQ", title: "Spicy Spicy Hot!" },
  { id: "FCLY_efnC58", title: "Why Do We Like Spicy Food?" },
  { id: "qvbPcd0g6bU", title: "The Best Spicy Foods Around The World" },
  { id: "5Hlmj9RyJww", title: "Extreme Spicy Color Food + ASMR" },
  { id: "Rh7dRl0LTis", title: "WORLD'S MOST SPICY FOOD CHALLENGE" },
  {
    id: "jaw9E_GeZP4",
    title: "[2 HOUR] of The Best LukeDidThat Spicy Food Challenges",
  },
  {
    id: "84suEyONyMg",
    title: "LukeDidThat Spicy Challenge Compilation (Part 5)",
  },
  { id: "VbfanRktD6U", title: "Giant SPICY vs SOUR Foods Challenge" },
  { id: "tyiD1DUUucM", title: "Extreme Spicy VS Sour Food Challenge!" },
  { id: "lY17HYygJ5A", title: "EXTREME 1 Hour Spicy Food Tiktok Compilation" },
  {
    id: "hLs-DSWP7d8",
    title: "ONLY 5 MINUTES TO EAT THIS DEATHLY SPICY TACO ...",
  },
  { id: "uNQMzH28OUQ", title: "Extreme Spicy VS Sour Snacks Challenge" },
  { id: "p6vAtnL1KQQ", title: "Surviving The Hot Ones Challenge" },
  { id: "0MLTox4SMPE", title: "Eating 100 SPICY FOODS in 24 HOURS..." },
  {
    id: "ubIZVs9lpbo",
    title: "LukeDidThat Spicy Challenge Compilation (Part 9)",
  },
  {
    id: "iJ0s5RZBht8",
    title: "We Play Extreme Spicy Cup Pong (Spicy Pepper Challenge)",
  },
  { id: "MIy59ajlgI4", title: "SPICY VS EXTREME SPICY FOOD CHALLENGE" },
  { id: "0w142VfmBRg", title: "ASMR EATING SPICY PANIPURI, DAHIPURI, ..." },
  {
    id: "k8IcJ0L6kdU",
    title: "SPICY JUICY BIG CHICKEN & EGG MOMOS WITH SPICY ...",
  },
];

interface vData {
  verified: boolean;
  vid: string;
}
const Demo: React.FC = () => {
  usePageTitle("SpicyVids Demo | Cardless ID");
  const [modal, setModal] = useState(true);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const isMobile = Boolean(
    userAgent.match(
      /Android|BlackBerry|iPhone|iPod|Opera Mini|IEMobile|WPDesktop/i
    )
  );

  const isDev = !window.location.hostname.includes("cardlessid.org");

  const generateId = (): string => {
    // Generates a random string of numbers and letters
    const randomPart = Math.random().toString(36).substring(2, 8);

    // Gets the current timestamp
    const timestampPart = Date.now().toString().slice(-4);

    // Combines and shortens the parts to 6-8 characters
    const generatedId = (randomPart + timestampPart).slice(0, 8);

    return generatedId;
  };
  const _vid = localStorage.getItem("vid") || generateId();
  localStorage.setItem("vid", _vid);

  const [data, setData] = useState({ verified: false, vid: _vid });
  const [error, setError] = useState("");
  const auth = getAuth(firebaseApp);
  const dbRef = ref(getDatabase(firebaseApp));
  signInAnonymously(auth);

  const loadData = async (vid: string) => {
    if (data.verified) {
      return;
    }
    try {
      const snapshot = await get(child(dbRef, vid));

      if (snapshot.exists()) {
        const fetchedData = snapshot.val();
        setData({ vid: vid, verified: fetchedData.verified });

        setLoading(false);
      } else {
        await set(child(dbRef, vid), { verified: false });
        setData({ vid: vid, verified: false });
        setLoading(false);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError("Operation failed: " + error.message);
      } else {
        setError("Operation failed: " + String(error));
      }
      setLoading(false);
    }
  };
  const restart = (): void => {
    localStorage.removeItem("vid");
    const newVid = generateId();
    localStorage.setItem("vid", newVid);
    setData({ verified: false, vid: newVid });
  };
  useEffect(() => {
    // Initial data load on page visit
    loadData(data.vid);

    // Start polling only if not yet verified
    if (!data.verified) {
      const intervalId = setInterval(() => {
        loadData(data.vid);
      }, 2000);

      // Cleanup function to clear the interval
      return () => clearInterval(intervalId);
    }
  }, [data.vid, data.verified]); // Dependency array now includes data.vid and data.verified to trigger re-run

  const toggleModal = () => {
    setModal(!modal);
  };
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center mt-2">
        <span className="loading loading-spinner loading-lg primary"></span>
      </div>
    );
  }
  return (
    <div>
      {error && (
        <p className={`text-red-500 my-4 ${isDev ? "" : "hidden"}`}>{error}</p>
      )}

      <div className="  mt-10 my-12 flex items-center justify-center relative">
        <dialog
          open={modal}
          onClose={toggleModal}
          className="modal bg-white text-base text-left mx-auto w-full"
        >
          <div className="relative flex flex-col items-center justify-center rounded-md bg-white p-4 border border-black text-md">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-1 top-1"
              onClick={() => setModal(false)}
              type="button"
            >
              ✕
            </button>
            {step == 1 && !data.verified && (
              <div className="space-y-2 max-w-sm md:max-w-screen mt-6 flex flex-col items-center justify-center">
                {isMobile && (
                  <>
                    <p className="text-left">
                      This demonstration shows what it's like to "log in" to an
                      age-restricted site.
                    </p>

                    <p>
                      You will <em>not</em> be asked to provide your name, email
                      or any other information.
                    </p>
                    <p>
                      Instead you will use a crypto wallet that has your birth
                      date encrypted within it.
                    </p>
                  </>
                )}
                {!isMobile && (
                  <>
                    <p className="text-left text-2xl font-bold">
                      This diagram shows the process. Click "Start Demo" to
                      begin.
                    </p>
                    <img src="/diagram.png" className="max-w-4xl" />
                  </>
                )}
                <button
                  className="bg-logoblue p-2 px-6 text-white text-xl rounded-full cursor-pointer"
                  onClick={() => setStep(2)}
                >
                  Start Demo
                </button>
              </div>
            )}
            {(step == 2 || data.verified) && (
              <Step2 isDev={isDev} data={data} restart={restart} />
            )}
          </div>
        </dialog>
        <div className="grid  grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
          {Array.from({ length: 30 }).map((_, index) => (
            <div
              key={videos[index].id}
              onClick={toggleModal}
              className="w-36 h-36 bg-gray-300 flex items-center justify-center rounded-lg cursor-pointer"
            >
              {!data.verified ? (
                <span className="text-gray-600 text-sm pointer-cursor text-center">
                  <span className="hidden md:inline">Click to Verify Age</span>
                  <span className="inline md:hidden">Tap to Verify Age</span>
                </span>
              ) : (
                <img
                  src={`https://img.youtube.com/vi/${videos[index].id}/hqdefault.jpg`}
                  alt={videos[index].title}
                  onClick={() =>
                    window.open(
                      "https://www.youtube.com/watch?v=" + videos[index].id,
                      "_blank"
                    )
                  }
                  className="h-36 w-36 rounded-md"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Demo;

const Step2 = ({
  isDev,
  data,
  restart,
}: {
  isDev: boolean;
  data: vData;
  restart: () => void;
}) => {
  const baseUrl = isDev
    ? "http://localhost:5173/demo/verify/"
    : "https://cardlessid.org/demo/verify/";
  const fullUrl = baseUrl + data.vid;
  const navigate = useNavigate();
  const cutoff = new Date(
    new Date().setFullYear(new Date().getFullYear() - 18)
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {data.verified ? (
        <div className="space-y-4 flex mt-4 flex-col items-center justify-center">
          <p> You are verified! No other action is necessary.</p>
          <p> If you want to demo the process again, click Restart.</p>
          <div className="flex items-center justify-between">
            <button
              className="bg-logoblue p-2 px-6 text-white text-xl rounded-full cursor-pointer"
              onClick={restart}
            >
              Restart
            </button>
            <span className="mx-6">or </span>
            <button
              className="bg-logoblue p-2 px-6 text-white text-xl rounded-full cursor-pointer"
              onClick={() => navigate("/")}
            >
              Go Home
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-center text-xl mt-6 max-w-md">
            Your birthday must be on or before
          </p>
          <p className="text-center text-xl font-bold my-4 text-red-500">
            {cutoff}
          </p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
              fullUrl
            )}`}
            alt="QR Code for verification"
            className="w-40 h-40 bg-gray-300"
          />
          <div className="mt-4 space-y-2 text-lg font-semibold text-gray-800 flex items-center flex-col justify-center">
            <p>Scan QR Code to Verify Your Age</p>
            <p className="italic">or</p>
            <p>
              <Link
                to={fullUrl}
                target="_blank"
                className="text-logoblue underline"
              >
                Click here
              </Link>{" "}
              to verify on the web
            </p>
          </div>
        </>
      )}
    </>
  );
};
