import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  console.log(location);
  return (
    <div className='flex flex-col w-screen h-screen'>
      {location.pathname != '/' &&
        <Header />
      }
      <main className='mt-8 w-full p-10 h-svh flex flex-col justify-center'>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
