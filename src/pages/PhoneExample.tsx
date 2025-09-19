import PhoneVerification from "../components/PhoneVerification";

import React from "react"; // Don't forget to import React

// Added props here and removed the const/return statement from inside the function
const PhoneExample: React.FC<{ age?: number; wallet: string }> = ({
  age = 18,
  wallet,
}) => {
  const toggleModal = () => {
    console.log("closed");
  };

  return (
    // Corrected the className syntax by using a regular string
    <div className="flex flex-col items-center justify-center flex-grow">
      <PhoneVerification wallet={wallet} age={age} onConfirm={toggleModal} />
    </div>
  );
};

export default PhoneExample;
