import React from 'react';
import { Link } from 'react-router-dom';
const Home: React.FC = () => {
  return (
    <>
      
        
      <div className='flex-col w-full mt-30'>
        <header className="flex justify-center mb-10">
          <img src='/logo.png' alt="logo" className='h-60' />
        </header>
        <div className='px-10 text-gray-800 dark:text-white text-left flex-content justify-start space-y-2'>
          <p>24 US states and countries including the UK, France and Germany have passed laws requiring adult sites to verify age.</p>
          <p>We agree that children should not have access to sexually explicit material.</p>
          <p>However, we also believe the verification process should be:</p>
          <div className='ml-10 text-md'>
            <ol className='list-decimal'>
              <li>Extremely private, with no data stored by the verification provider</li>
              <li>Only necessary to do one time across <span className='italic'>all</span> web sites</li>
              <li>Provided by a nonprofit that does not retain or monetize your data</li>
            </ol>
          </div>
          <p>We are partnering with content providers, adult nonprofits and regulatory bodies to make this possible.</p>
          <p className='text-md text-center'><Link className='text-logoblue underline' to="/contact">Contact us</Link> for more information, or signup below.</p>
          
        </div>
        <div className='w-full flex justify-center p-0 mb-10'>
          <iframe src="https://cardlessid.substack.com/embed" width="400" height="320"></iframe>
        </div>
      </div>
      
      
    </>
  );
};

export default Home;