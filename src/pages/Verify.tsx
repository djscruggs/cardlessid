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
  console.log(uid)
  const [error] = useState(!uid || uid == 'verify')
  

  
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
                    className="flex flex-col items-center justify-center rounded-md"
                  >
                    Uid is {uid}
                  </div>
                </Modal>
      </div>
      
    </div>
  );
}
export default Verify;
