import React, { useState } from 'react';
import 'react-responsive-modal/styles.css';
import { Modal } from 'react-responsive-modal';
const Demo: React.FC = () => {
  const [modal, setModal] = useState(true);

  const toggleModal = () => {
    setModal(!modal);
  }

  
  return (
    <div >
      <div className="pt-8">
        <img src="/logospicy.png" className="h-[160px] mx-auto block" />
      </div>
      <div className='relative max-w-5xl mx-auto mt-6'>
        <Modal open={modal} onClose={toggleModal}  center>
          <div
            className="flex flex-col items-center justify-center rounded-md"
          >
            <img
              src="/qrcode.png"
              alt="QR Code for verification"
              className="w-40 h-40"
            />
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
