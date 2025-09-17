import { Link } from "react-router-dom";
const About = () => {

  return (
    <>
      <div className='flex-col w-full mt-10'>
        <div className='px-10 text-gray-800  text-2xl  flex flex-col items-center'>
          <div className='max-w-3xl text-left mt-4 space-y-4'>
            <div className="sm:float-right justify-center sm:ml-4 mb-4  flex flex-col items-center w-full sm:w-40">
                <Link to="https://djscruggs.com"><img src="/dj.webp" className="h-40 rounded-md" /></Link>
                <p className="text-center text-sm italic pt-2">DJ with Monkey</p>
            </div>
            <p>Cardless ID was founded by <Link className='text-logoblue underline' to="https://djscruggs.com" >DJ Scruggs</Link>, a tech and real estate entrepreneur with over 25 years of experience.</p>
            <p>I believe age verification should be free, easy, and available to anyone in the world. Crypto wallets are the safest, most secure and privacy-preserving way to do this, as explained in our <Link className="underline text-logoblue" target="_blank" to='https://cardlessid.substack.com/p/what-is-cardless-id'>newsletter</Link>.</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default About;