import React, { useState } from 'react';
import 'react-responsive-modal/styles.css';
import { Modal } from 'react-responsive-modal';
import { useLocation } from 'react-router-dom';

const Verify: React.FC = () => {
  const [modal, setModal] = useState(false);
  const toggleModal = () => {
    setModal(!modal)
  }
  const location = useLocation();
  const uid = location.pathname.split('/').pop();
  const [error] = useState(!uid || uid == 'verify')
  const wallets = ['metamask', 'coinbase','pera','phantom']
  const isDev = window.location.hostname === 'localhost'
  const baseUrl = isDev ? 'http://localhost:5173' : 'https://cardlessid.org';
  const onTap = () =>{
    console.log('tapped')
  }

  
  return (
    <div >
      <div>
        
        <div className="flex flex-col justify-center items-center">
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
          ): (
            <div className='flex flex-col'>
            
              <p className="text-red-500 text-xl">Error: No verification ID provided.</p>
              <p className="text-gray-600">Please ensure you are accessing this page with a valid QR code or link.</p>
            </div>
          )}
        </div>
        <Modal open={modal} onClose={toggleModal}  center>
            <div
              className="flex flex-col items-center justify-center rounded-md max-w-md"
            >
            <div className='space-y-2 mb-4 mt-6'>
            <p>Since this is a demo, we won't do a full verification. However, if you did it would give you the option of verifying for the first time, or using one of our supported wallets. </p>  
            <p className='text-center'>Click or tap one of the logos below.</p>
            </div>
           <div
              className="grid grid-cols-2 gap-10"
            >
           {wallets.map(wallet => (
              <img 
                key={wallet} 
                src={`${baseUrl}/wallets/${wallet}.png`} 
                alt={`${wallet} wallet`} 
                onClick={onTap}
                className='h-30 w-30 opacity-50 hover:opacity-100 cursor-pointer'
              />
            ))}
            </div>
            </div>
          </Modal>
      </div>
      
    </div>
  );
}
export default Verify;
