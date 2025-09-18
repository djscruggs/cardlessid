import PhoneVerification from '../components/PhoneVerification'

const PhoneExample: React.FC<{ age?: number, wallet: string }> = ({ age = 18, wallet = '' }) => {
  
  return (
    <PhoneVerification wallet="phantom" />
      
  )
}
export default PhoneExample