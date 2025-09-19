import PhoneVerification from '../components/PhoneVerification'
const PhoneExample: React.FC<{ age?: number, wallet: string }> = ({ age = 18, wallet = '' }) => {
  const toggleModal = () => {
    console.log('closed')
  }
  return (
    <dialog className='h-sm' open={true}>
      <PhoneVerification wallet={wallet} age={age} onConfirm={toggleModal} />
      
    </dialog>

  )
      
  
}
export default PhoneExample