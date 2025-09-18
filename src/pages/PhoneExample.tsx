import PhoneVerification from '../components/PhoneVerification'

const PhoneExample: React.FC<{ age?: number, wallet: string }> = ({ age = 18, wallet = '' }) => {
  
  return (
    <PhoneVerification wallet={wallet} age={age} onConfirm={()=>alert('confirmed')} />
      
  )
}
export default PhoneExample