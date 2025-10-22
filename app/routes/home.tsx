import { Link } from "react-router";
import React from "react";

export function meta() {
  return [{ title: "Home | Cardless ID" }];
}

const Home: React.FC = () => {
  return (
    <>
      {/* Hero Section */}
      <div className="rounded-4xl relative bg-gradient-to-br from-blue-50 to-white py-16 md:py-24 md:pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Free, Private, Portable
              <span className="block text-logoblue">Age Verification</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Age verification that's{" "}
              <strong className="text-logoblue">free, private, and works everywhere</strong>.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link to="/demo">
                <button className="cursor-pointer bg-logoblue hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
                  Try Demo
                </button>
              </Link>
              <Link
                to="https://cardlessid.substack.com/p/what-is-cardless-id"
                target="_blank"
              >
                <button className="cursor-pointer bg-white hover:bg-gray-50 text-logoblue font-semibold py-4 px-8 rounded-full text-lg border-2 border-logoblue transition-all duration-200 transform hover:scale-105 shadow-lg">
                  Learn More
                </button>
              </Link>
            </div>

            {/* Diagram Section */}
            <div className="relative">
              <div className="md:hidden w-full mb-8">
                <Carousel />
              </div>
              <div className="hidden md:block">
                <img
                  src="/diagrams/diagram-full.png"
                  className="max-w-5xl mx-auto rounded-4xl shadow-2xl"
                  alt="Cardless ID verification process diagram"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Cardless ID?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-4xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-16 h-16 bg-logoblue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Private</h3>
              <p className="text-gray-600">Only requires birth date, no personal information stored</p>
            </div>
            
            <div className="text-center p-6 rounded-4xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-16 h-16 bg-logoblue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast</h3>
              <p className="text-gray-600">One-time verification works across all adult sites</p>
            </div>
            
            <div className="text-center p-6 rounded-4xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-16 h-16 bg-logoblue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Not for Profit</h3>
              <p className="text-gray-600">We believe this should be a free service with no monetization</p>
            </div>
            
            <div className="text-center p-6 rounded-4xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-16 h-16 bg-logoblue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure</h3>
              <p className="text-gray-600">Crypto wallet-based verification with blockchain security</p>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="rounded-4xl py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Stay Updated
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Get the latest updates on Cardless ID development and privacy-first age verification.
          </p>
          <div className="bg-white rounded-4xl shadow-lg p-8">
            <iframe
              src="https://cardlessid.substack.com/embed"
              width="100%"
              height="150"
              className="border-0 rounded-4xl"
            ></iframe>
          </div>
        </div>
      </div>
    </>
  );
};

const Carousel = () => {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const totalSlides = 3;

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      // Scroll down - next slide
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    } else {
      // Scroll up - previous slide
      setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    }
  };

  const scrollToSlide = (slideIndex: number) => {
    setCurrentSlide(slideIndex);
    const element = document.getElementById(`item${slideIndex + 1}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  React.useEffect(() => {
    scrollToSlide(currentSlide);
  }, [currentSlide]);

  return (
    <>
      <div 
        className="relative carousel carousel-center w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden"
        onWheel={handleWheel}
      >
        {/* Swipe hint overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-between px-4">
          <div className="swipe-hint-left">
            <svg className="w-8 h-8 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <div className="swipe-hint-right">
            <svg className="w-8 h-8 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        
        {/* Touch gesture hint */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
          <div className="flex items-center space-x-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs">
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>Swipe</span>
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
        {/* The first image */}
        <div id="item1" className="carousel-item w-full">
          <img
            src="/diagrams/diagram1.png"
            className="w-full h-80 object-contain"
            alt="Step 1: User verification process"
          />
        </div>

        {/* The middle image */}
        <div id="item2" className="carousel-item w-full">
          <img 
            src="/diagrams/diagram2.png" 
            className="w-full h-80 object-contain" 
            alt="Step 2: Verification details"
          />
        </div>

        {/* The third image */}
        <div id="item3" className="carousel-item w-full">
          <img
            src="/diagrams/diagram3.png"
            className="w-full h-80 object-contain"
            alt="Step 3: Complete verification"
          />
        </div>
      </div>
      
      {/* Carousel navigation dots */}
      <div className="flex justify-center w-full mt-4 space-x-2">
        <button 
          onClick={() => scrollToSlide(0)}
          className={`btn btn-xs ${currentSlide === 0 ? 'btn-primary' : 'btn-outline'}`}
        >
          1
        </button>
        <button 
          onClick={() => scrollToSlide(1)}
          className={`btn btn-xs ${currentSlide === 1 ? 'btn-primary' : 'btn-outline'}`}
        >
          2
        </button>
        <button 
          onClick={() => scrollToSlide(2)}
          className={`btn btn-xs ${currentSlide === 2 ? 'btn-primary' : 'btn-outline'}`}
        >
          3
        </button>
      </div>
    </>
  );
};

export default Home;
