import Header from "../components/Header";
import Footer from "../components/Footer";
import { useLocation, useNavigate } from "react-router";

interface LayoutProps {
  children: React.ReactNode;
}

const Main: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.includes("demo");
  const showHeader = location.pathname != "/" && !isDemo;
  const showFooter = !isDemo;
  const isPhone = location.pathname.includes("phone");

  return (
    <div className="flex flex-col w-screen h-screen bg-white dark:bg-white">
      {!isDemo && !isPhone && <Header />}
      {isDemo && !isPhone && (
        <div className="pt-8">
          <button
            onClick={() => navigate("/")}
            className="absolute top-24 left-4 md:left-30 bg-logoblue text-white p-2 cursor-pointer rounded-md  text-sm font-semibold"
          >
            &laquo; Home
          </button>
          <img src="/logospicy.png" className="h-[160px] mx-auto block" />
        </div>
      )}
      <main
        className={`w-full ${showHeader ? "p-4" : "p-0"} flex flex-col justify-start flex-grow`}
      >
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Main;
