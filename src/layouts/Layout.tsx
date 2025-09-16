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

  return (
    <div className='flex flex-col w-screen h-screen'>
      {showHeader &&
        <Header />
      }
      {isDemo &&
        <div className="pt-8">
          <img src="/logospicy.png" className="h-[160px] mx-auto block" />
        </div>
      }
      <main className={`w-full ${showHeader ? 'p-2 md:p4' : 'p-0'} flex flex-col justify-center flex-grow`}>
        {children}
      </main>
      {showFooter &&
        <Footer />
        }
    </div>
  
  );
};

export default Layout;
