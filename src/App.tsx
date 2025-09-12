import { useState } from 'react';
import './App.css';

const App = () => {
  
  return (
    <body className="bg-white dark:bg-gray-800 ">
      <header className="flex justify-center mb-10">
      <img src='/logo.png' alt="logo" width="30%"/>
      </header>
      <div className='text-gray-800 dark:text-white text-left flex-content justify-start space-y-2'>
        <p>24 states have passed laws requiring adult sites to verifiy age.</p>
        <p>We agree that children should not have access to sexually explicit material.</p>
        <p>However, we also believe the verification process should be:</p>
        <div className='ml-10 text-md'>
          <ol className='list-decimal'>
            <li>Extremely private</li>
            <li>Only necessary to do one time across all web sites</li>
            <li>Provided by a nonprofit that does not retain or monetize your data</li>
          </ol>
        </div>
        <p>We are partnering with content providers, adult nonprofits and regulatory bodies to make this possible.</p>
        <p className='text-md mt-10'>Email <a className='text-blue-500 underline' href="mailto:me@djscruggs.com">me@djscruggs.com</a> for more information.</p>
      </div>
        

        
        
      
    </body>
  );
};

export default App;
