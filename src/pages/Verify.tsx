import React, { useState, useEffect,lazy } from 'react';
import 'react-responsive-modal/styles.css';
import { Modal } from 'react-responsive-modal';
import { useLocation } from 'react-router-dom';
const Spinner = lazy(() => import('../components/Spinner.tsx'));
import { getDatabase, ref, set, get, child } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";
import { firebaseApp } from '../firebase-config.ts'


const Verify: React.FC = () => {
  const [modal, setModal] = useState(true);
  const [loading, setLoading] = useState(true);
  const toggleModal = () => {
    if(modal == true){
      setTapped('')
    }
    setModal(!modal)
  }
  const [data, setData] = useState({ verified: false});
  const [verified, setVerified] = useState(false);
  const location = useLocation();
  const vid = location.pathname.split('/').pop() || '';
  let _error = ''
  if(!vid || vid == 'verify') {
    _error = 'No verification ID provided.'
  }
  const [error, setError] = useState(_error);
  const wallets = ['metamask', 'coinbase','pera','phantom']
  const isDev = window.location.hostname === 'localhost'
  const baseUrl = isDev ? 'http://localhost:5173' : 'https://cardlessid.org';
  const auth = getAuth(firebaseApp);
  const dbRef = ref(getDatabase(firebaseApp));
  const [tapped, setTapped] = useState('')
  const onTap = (wallet:string) =>{
      if(!wallets.includes(tapped)){
        setTapped(wallet)
        set(child(dbRef, vid), {verified: true})
        .catch((writeError) => {
          setError("Write failed: " + writeError.message);
        });
        setTimeout(() => {
          loadData(dbRef, vid);
        }, 5000);

      }
  }
  
  const loadData = async (dbRef:any, uniqueId:string) => {
    try {
      const snapshot = await get(child(dbRef, uniqueId));

      if (snapshot.exists()) {
        const fetchedData = snapshot.val();
        setData(fetchedData);
        setVerified(fetchedData.verified);
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
  signInAnonymously(auth)
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
    <div >
      <div>
        <div className="flex flex-col justify-center items-center">
          {loading ? (
            <Spinner />
          ) : (
            <>
              {!verified ? (
                <>
                  {!error ? (
                    <>
                      <p className='my-8'>Click below to verify your age.</p>
                      <button 
                        className='bg-logoblue p-4 text-white text-2xl rounded-full cursor-pointer'
                        onClick={toggleModal}
                      >
                        Verify Now
                      </button>
                    </>
                  ) : (
                    <div className='flex flex-col'>
                      <p className="text-red-500 text-xl">Error: {error}</p>
                      <p className="text-gray-600">Please ensure you are accessing this page with a valid QR code or link.</p>
                    </div>
                  )}
                </>
              ) : (
                <p className='max-w-lg'>You are verified. You can close this window and return to your main browser.</p>
              )}
            </>
          )}
        </div>
        <Modal open={modal} onClose={toggleModal}  center>
          
          <div className="flex flex-col items-center justify-center rounded-md max-w-md">
              {data.verified ? (
                <p className='my-8 max-w-sm'>You are verified. You can close this window and return to your main browser.</p>
                 ) : (
                  <>
                  <div className='space-y-2 mb-4 mt-6'>
                    <p>Since this is a demo, we won't do a full verification. However, if you did it would give you the option of verifying for the first time, or using one of our partner wallets. </p>  
                    <p className='text-center font-bold'>No personal information is <em>ever</em> shared with the web site.</p>  
                    <p className='text-center'>Click or tap one of the logos below.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                  {wallets.map(wallet => (
                    <>
                      {tapped == wallet ? (
                        <div className='flex items-center justify-center'>
                        <Spinner />
                        </div>
                      ) : (
                  
                        <img 
                          key={wallet} 
                          src={`${baseUrl}/wallets/${wallet}.png`} 
                          alt={`${wallet} wallet`} 
                          onClick={() => onTap(wallet)}
                          className={`h-30 w-30 opacity-50 ${tapped == ''  ? 'hover:opacity-100 cursor-pointer' : ''}`}
                        />
                    )}
                    </>
                    ))}
                  </div>
                  </>
              )}
          </div>
          
        </Modal>
      </div>
      
    </div>
  );
}

export default Verify;
