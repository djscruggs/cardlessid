import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  return (
    <div className='flex flex-col w-screen h-screen'>
      {location.pathname != '/' &&
        <Header />
      }
      <main className='w-full p-4  flex flex-col justify-center'>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
