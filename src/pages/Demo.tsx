import React, { useEffect, useState } from 'react';
import 'react-responsive-modal/styles.css';
import { Modal } from 'react-responsive-modal';
import { getDatabase, ref, set, get, child } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";
import { firebaseApp } from '../firebase-config.ts'

const Demo: React.FC = () => {
  const [modal, setModal] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saved,setSaved] = useState(false);
  let uid = localStorage.getItem('uid');
  if(!uid){
    uid = Date.now().toString(36);
    localStorage.setItem('uid', uid);
  }
  useEffect((): void => {
    const auth = getAuth(firebaseApp);
    const dbRef = ref(getDatabase(firebaseApp));

    // Sign in anonymously to get an auth token
    signInAnonymously(auth)
      .then(() => {
        // Once authenticated, you can perform read/write operations
        const uniqueId = uid; // Your dynamic ID
        get(child(dbRef, uniqueId)).then((snapshot) => {
          if (snapshot.exists()) {
            setData(snapshot.val());
            setSaved(true);
          } else {
            const dataToSave = { verified: false };
            set(child(dbRef, uniqueId), dataToSave)
              .then(() => {
                console.log("Data successfully written!");
              })
              .catch((writeError) => {
                setError("Write failed: " + writeError.message);
              });
            setError("No data found.");
          }
        }).catch((readError) => {
          setError("Read failed: " + readError.message);
        });
      })
      .catch((authError) => {
        setError("Authentication failed: " + authError.message);
      });
  }, [uid]);
  const isDev = window.location.hostname === 'localhost'
  const baseUrl = isDev ? 'http://localhost:5173/verify/' : 'https://cardlessid.org/verify/';
  const fullUrl = baseUrl + uid;
  console.log(baseUrl)
  const toggleModal = () => {
    setModal(!modal);
  }

  
  return (
    <div >
      {data && 
        <p>Data retrieved</p>
      }
      {saved &&
        <p>saved</p>
      }
      {error &&
        <p>{error}</p>
      }

      <div className="pt-8">
        <img src="/logospicy.png" className="h-[160px] mx-auto block" />
      </div>
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
          {Array.from({ length: 32 }).map((_, index) => (
            <div key={index} onClick={toggleModal} className="w-36 h-36 bg-gray-300 flex items-center justify-center rounded-lg cursor-pointer">
              <span className="text-gray-600 text-sm pointer-cursor text-center">Verify Age to View</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default Demo;
