import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const paths = ['/','/demo'];
  const showHeader = !paths.includes(location.pathname)
  console.log( location.pathname)
  return (
    <div className='flex flex-col w-screen h-screen'>
      {showHeader &&
        <Header />
      }
      <main className={`w-full ${showHeader ? 'p-4' : 'p-0'} flex flex-col justify-center`}>
        {children}
      </main>
      {showHeader &&
      <Footer />
      }
    </div>
  );
};

export default Layout;
