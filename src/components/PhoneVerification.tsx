import { useState } from 'react'
import Phone from './Phone'

const PhoneVerification: React.FC<{ age?: number, wallet: string, onConfirm: ()=> void }> = ({ age = 18, wallet = '', onConfirm }) => {
  const [checked, setChecked] = useState(true)
  const toggleCheck = () => {
    setChecked(!checked)
  }
  const confirm = () =>{
    onConfirm()
  }
  const wallets = ['metamask', 'coinbase','pera','phantom']
  if(!wallets.includes(wallet)){
    return <p className='text-red'>Error: invalid wallet subbmited: {wallet}</p>
  }
  return (
    <Phone>
      <div className='p-1 px-4 flex flex-col h-full'>

        <div className='text-left'>
          <div className='font-bold my-2 text-md'>Verify your age</div>
          <div className='text-sm space-y-2'>
            <p>Spicy Vids is requesting you to verify that you are older than {age}</p>
            <p>
              <a href='https://www.freespeechcoalition.com/age-verification' className='text-blue-700 underline'>
                Why do we need to verify your age?
              </a>
            </p>
          </div>
          <div className='space-y-2 mt-2 p-4 bg-gray-100 rounded-md'>
            <p className='font-bold text-sm'>Shared attestation</p>
            <div className='flex items-center space-x-3'>
              <img src={`/wallets/${wallet}.png`} className='w-10 h-10 border border-gray-200 rounded-full' /> 
              <div className=''>
                <div className='text-sm font-bold'>Digital ID</div>
                <div className='text-sm'>John Doe</div>
              </div>
            </div>
            <p className='font-bold text-sm'>Requesting site</p>
            <div className='flex items-center space-x-3'>
              <img src="/logospicy.png" className='w-10 h-10 border border-gray-200 rounded-full' /> 
              <div className='text-sm'>Spicy Vids</div>
            </div>
             <p className='font-bold text-sm'>Verification details</p>
             <p className='text-xs'>This is the information that will be shared with the requesting site.</p>
             <div className='bg-white p-2 rounded-sm flex items-center space-x-4'>
              <input 
                type="checkbox" 
                className="h-6 w-6 text-blue-700 border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-300" 
                checked={checked}
                onClick={toggleCheck}
              />
              <div className=''>
                <p className='text-sm text-gray-400'>AGE RANGE</p>
                <p className='text-sm font-bold'>&gt; {age}</p>
              </div>
             </div>
          </div>
          
        </div>
        <button 
          className='bg-blue-700 text-white text-md rounded-md p-2 mt-auto mb-2 cursor-pointer disabled:bg-gray-400 disabled:cursor-default'
          disabled={!checked}
          onClick={confirm}
        >
          Confirm
        </button>
      </div>
    </Phone>
  )
}
export default PhoneVerification