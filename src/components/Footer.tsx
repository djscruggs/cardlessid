import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className='my-2'>
      <p className='text-sm'>&copy; 2025 Cardless ID. All rights reserved.</p>
      <div className="flex justify-center my-4">
        <a href="https://www.linkedin.com/company/cardless-id" target="_blank" rel="noopener noreferrer">
          <img src="/linkedin.png" alt="LinkedIn" className="h-6 w-6" />
        </a>
      </div>

    </footer>
  );
};

export default Footer;
