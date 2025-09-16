import { Link } from "react-router-dom";
const About = () => {

  return (
    <>
      <div className='flex-col w-full'>
        <div className='px-10 text-gray-800  text-2xl  flex flex-col items-center space-y-2'>
          <div className='max-w-3xl text-left mt-4 space-y-4'>
            <p>Cardless ID was founded by <Link className='text-logoblue underline' to="https://djscruggs.com" >DJ Scruggs</Link>, a tech and real estate entrepreneur with over 25 years of experience.</p>
            <p>We believe age verification should be free, easy, and available to anyone in the world. Crypto wallets are the best way to do this, as explained in our <Link to='https://cardlessid.substack.com/p/what-is-cardless-id'>inaugral newsletter</Link>.</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default About;