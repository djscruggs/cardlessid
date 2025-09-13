import React from 'react';
import { Link } from 'react-router-dom';


// display: flex;
//   justify-content: space-between;
//   align-items: center;
//   padding: 1rem 2rem;
//   background-color: #f8f9fa;
//   border-bottom: 1px solid #dee2e6;

const Header: React.FC = () => {
  return (
    <header className="w-full flex justify-between p-1 pb-4">
      <div className='flex w-full max-w-4xl'>
        <div className="w-30 ml-10">
          <Link to="/"><img src="/logo.png" alt="Cardless ID" /></Link>
        </div>
        <nav className='flex flex-grow justify-end pr-4'>
          <ul className='flex items-center justify-end space-x-8 text-logoblue'>
            {/* <li><Link to="/">Home</Link></li> */}
            {/* <li><Link to="/about">About</Link></li> */}
            {/* <li><Link to="/contact">Contact</Link></li> */}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
