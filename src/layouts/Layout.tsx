import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isDemo = location.pathname.includes('demo')
  const showHeader = location.pathname != '/' && !isDemo
  const showFooter = !isDemo
  const isPhone = location.pathname.includes('phone')

  return (
    <div className='flex flex-col w-screen h-screen'>
      {!isDemo && !isPhone &&
        <Header />
      }
      {isDemo && !isPhone &&
        <div className="pt-8">
          <a href="/" className="absolute top-24 left-4 md:left-30 text-logoblue hover:underline text-sm font-semibold">
            &laquo; Home
          </a>
          <img src="/logospicy.png" className="h-[160px] mx-auto block" />
        </div>
      }
      <main className={`w-full ${showHeader ? 'p-4' : 'p-0'} flex flex-col justify-start flex-grow`}>
        {children}
      </main>
      {showFooter &&
        <Footer />
      }
    </div>
  
  );
};

export default Layout;
