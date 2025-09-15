import React, { useEffect, useState } from 'react';
import 'react-responsive-modal/styles.css';
import { Modal } from 'react-responsive-modal';
import { getDatabase, ref, set, get, child } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";
import { firebaseApp } from '../firebase-config.ts'

const videos = [
  {"id": "meDRHqG2djI", "title": "Ty Dolla $ign - Spicy (feat. Post Malone)"},
  {"id": "Os_heh8vPfs", "title": "aespa ‘Spicy’ MV"},
  {"id": "QMwJtMJLXE0", "title": "CL - SPICY (Official Video)"},
  {"id": "vSH7Y92snVM", "title": "Julia Cole - Spicy (Official Music Video)"},
  {"id": "hvjytRyt27c", "title": "Herve Pagez & Diplo - Spicy (feat. Charli XCX)"},
  {"id": "7cSaPi-UDjM", "title": "Jenny 69 - SPICY (Official Music Video)"},
  {"id": "5Ep8M8D8mkw", "title": "Boris Brejcha - Spicy feat. Ginger (Official Video)"},
  {"id": "798vylI5tTY", "title": "Nas - Spicy ft. Fivio Foreign & A$AP Ferg"},
  {"id": "o850kcXxc9w", "title": "Extreme Spicy Food Tiktok Compilation (2 Hour Edition)"},
  {"id": "WicBv6wkjsk", "title": "Extreme Spicy Food Tiktok Compilation 6"},
  {"id": "vGKnPlNe1Eo", "title": "Spicy | Official Music Video"},
  {"id": "vhUcgLsLCEQ", "title": "Spicy Spicy Hot!"},
  {"id": "FCLY_efnC58", "title": "Why Do We Like Spicy Food?"},
  {"id": "qvbPcd0g6bU", "title": "The Best Spicy Foods Around The World"},
  {"id": "5Hlmj9RyJww", "title": "Extreme Spicy Color Food + ASMR"},
  {"id": "Rh7dRl0LTis", "title": "WORLD'S MOST SPICY FOOD CHALLENGE"},
  {"id": "jaw9E_GeZP4", "title": "[2 HOUR] of The Best LukeDidThat Spicy Food Challenges"},
  {"id": "84suEyONyMg", "title": "LukeDidThat Spicy Challenge Compilation (Part 5)"},
  {"id": "VbfanRktD6U", "title": "Giant SPICY vs SOUR Foods Challenge"},
  {"id": "tyiD1DUUucM", "title": "Extreme Spicy VS Sour Food Challenge!"},
  {"id": "lY17HYygJ5A", "title": "EXTREME 1 Hour Spicy Food Tiktok Compilation"},
  {"id": "hLs-DSWP7d8", "title": "ONLY 5 MINUTES TO EAT THIS DEATHLY SPICY TACO ..."},
  {"id": "uNQMzH28OUQ", "title": "Extreme Spicy VS Sour Snacks Challenge"},
  {"id": "p6vAtnL1KQQ", "title": "Surviving The Hot Ones Challenge"},
  {"id": "0MLTox4SMPE", "title": "Eating 100 SPICY FOODS in 24 HOURS..."},
  {"id": "ubIZVs9lpbo", "title": "LukeDidThat Spicy Challenge Compilation (Part 9)"},
  {"id": "iJ0s5RZBht8", "title": "We Play Extreme Spicy Cup Pong (Spicy Pepper Challenge)"},
  {"id": "MIy59ajlgI4", "title": "SPICY VS EXTREME SPICY FOOD CHALLENGE"},
  {"id": "0w142VfmBRg", "title": "ASMR EATING SPICY PANIPURI, DAHIPURI, ..."},
  {"id": "k8IcJ0L6kdU", "title": "SPICY JUICY BIG CHICKEN & EGG MOMOS WITH SPICY ..."}
]


const Demo: React.FC = () => {
  const [modal, setModal] = useState(false);
  const [data, setData] = useState<{ verified: boolean} | null>(null);;
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  let uid = localStorage.getItem('uid');
  if(!uid){
    uid = Date.now().toString(36);
    localStorage.setItem('uid', uid);
  }
  const loadData = (dbRef: any, uniqueId: string) => {
    get(child(dbRef, uniqueId)).then((snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = snapshot.val();
        setData(fetchedData);
        setVerified(fetchedData.verified); 
        if(fetchedData.verified){
          setModal(false)
        }
      } else {
        const dataToSave = { verified: false };
        set(child(dbRef, uniqueId), dataToSave)
          .then(() => {
            console.log("Data successfully written!");
          })
          .catch((writeError) => {
            setError("Write failed: " + writeError.message);
          });
        setError("No data found. Initializing data...");
      }
    }).catch((readError) => {
      setError("Read failed: " + readError.message);
    });
  };
  useEffect((): void => {
    const auth = getAuth(firebaseApp);
    const dbRef = ref(getDatabase(firebaseApp));

    // Sign in anonymously to get an auth token
    signInAnonymously(auth)
      .then(() => {
        // Initial data load on page visit
        loadData(dbRef, uid);

        // Start polling only if not yet verified
        if (!verified) {
          const intervalId = setInterval(() => {
            loadData(dbRef, uid);
          }, 2000);

          // Cleanup function to clear the interval
          return () => clearInterval(intervalId);
        }
      })
      .catch((authError) => {
        setError("Authentication failed: " + authError.message);
      });
  }, []);
  const isDev = window.location.hostname === 'localhost'
  const baseUrl = isDev ? 'http://localhost:5173/verify/' : 'https://cardlessid.org/verify/';
  const fullUrl = baseUrl + uid;
  const toggleModal = () => {
    setModal(!modal);
  }
  useEffect(()=>{
    setVerified(data?.verified ? true : false)
  },[data])

  
  return (
    <div >
      
      <div className="pt-8">
        <img src="/logospicy.png" className="h-[160px] mx-auto block" />
      </div>
      {error &&
        <p className='text-red-500 my-4'>{error}</p>
      }

      <div className='relative max-w-5xl mx-auto mt-6'>
        <Modal open={modal} onClose={toggleModal}  center>
          <div
            className="flex flex-col items-center justify-center rounded-md"
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`}
              alt="QR Code for verification"
              className="w-40 h-40 bg-gray-300"
            />
            {isDev && 
            <p>{fullUrl}</p>
            }
            <p className="mt-4 text-lg font-semibold text-gray-800">Scan QR Code to Verify Your Age</p>
          </div>
        </Modal>
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 30 }).map((_, index) => (
              <div key={videos[index].id} onClick={toggleModal} className="w-36 h-36 bg-gray-300 flex items-center justify-center rounded-lg cursor-pointer">
                {!verified  ? (
                  <span className="text-gray-600 text-sm pointer-cursor text-center">Verify Age to View</span>
                   ) : (
                  <img 
                    src={`https://img.youtube.com/vi/${videos[index].id}/hqdefault.jpg`} 
                    alt={videos[index].title}
                    onClick={()=>window.open('https://www.youtube.com/watch?v=' + videos[index].id, '_blank')}
                    className="h-36 w-36 rounded-md"
                  />
                  
                )}
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default Demo;
