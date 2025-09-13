import React from 'react';
import { Link } from 'react-router-dom';
const Home: React.FC = () => {
  return (
    <>
      
        
      <div className='flex-col w-full'>
        <header className="flex justify-center mb-10">
          <img src='/logo.png' alt="logo" className='h-60' />
        </header>
        <div className='px-10 text-gray-800  text-left flex-content justify-start space-y-2'>
          <p>24 US states and countries including the UK, France and Germany have passed laws requiring adult sites to verify age.</p>
          <p>We agree that children should not have access to sexually explicit material.</p>
          <p>However, we also believe the verification process should be:</p>
          <div className='ml-10 text-md'>
            <ol className='list-decimal'>
              <li>Extremely private, and not requiring any information except birth date</li>
              <li>Only necessary to do one time across <span className='italic'>all</span> adult web sites</li>
              <li>Provided by a nonprofit that does not retain or monetize your data</li>
              <li>Free for end users and providers alike</li>
            </ol>
          </div>
          <p>We partner with content companies, technology providers, media and regulators to make this possible.</p>
          <p>Learn how it works <a className='text-logoblue underline' target="_blank" href="https://cardlessid.substack.com/p/what-is-cardless-id">here</a>.</p>
          <p className='text-md text-center mb-2'><Link className='text-logoblue underline' to="/contact">Contact us</Link> for more information, or sign up below to receive our newsletter.</p>
        </div>
        <div className='w-full flex justify-center p-0 mb-10'>
          <iframe src="https://cardlessid.substack.com/embed" width="400" height="150"></iframe>
        </div>
      </div>
      
      
    </>
  );
};

export default Home;