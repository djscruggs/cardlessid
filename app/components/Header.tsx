import { Link } from "react-router";

const Header: React.FC = () => {
  return (
    <header className="w-full">
      <div className="flex flex-col md:flex-row w-full max-w-7xl justify-between mx-auto items-center p-2">
        {/* Left-aligned logo on medium screens and up */}
        <div className="flex-shrink-0 md:order-1 hidden md:block ml-8">
          <Link to="/">
            <img src="/logo.png" alt="Cardless ID" className="h-20" />
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-grow md:order-2 md:ml-auto">
          <ul className="flex items-center justify-center md:justify-end md:mr-10 space-x-8 text-logoblue">
            <li>
              <Link to="/" className="hover:text-blue-600 transition-colors cursor-pointer">Home</Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-blue-600 transition-colors cursor-pointer">About</Link>
            </li>
            <li>
              <Link to="/for-companies" className="hover:text-blue-600 transition-colors cursor-pointer">For Websites</Link>
            </li>
            <li>
              <Link to="/demo" className="hover:text-blue-600 transition-colors cursor-pointer">Demo</Link>
            </li>
            <li>
              <Link to="/docs" className="hover:text-blue-600 transition-colors cursor-pointer">Docs</Link>
            </li>
            <li>
              <Link 
                to="https://open.substack.com/pub/cardlessid/p/common-questions-about-cardless-id"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors cursor-pointer"
              >
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-blue-600 transition-colors cursor-pointer">Contact</Link>
            </li>
          </ul>
        </nav>

        {/* Center-aligned logo on small screens */}
        <div className="md:hidden flex-grow md:order-3 pt-4">
          <Link to="/">
            <img src="/logo.png" alt="Cardless ID" className="h-20 mx-auto" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
