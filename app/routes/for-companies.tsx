import { Link } from "react-router";

export function meta() {
  return [{ title: "For Adult Content Companies | Cardless ID" }];
}

const ForCompanies: React.FC = () => {
  return (
    <>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-red-50 to-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Age Verification for
              <span className="block text-red-600">Adult Content Companies</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              24 US states and several European countries require adult sites to verify age. 
              Children should never have access to sexually explicit material. However, the 
              verification process should be{" "}
              <strong className="text-red-600">free, private and portable across all web sites</strong>.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link to="/demo">
                <button className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg cursor-pointer">
                  Try Demo
                </button>
              </Link>
              <Link to="/contact">
                <button className="bg-white hover:bg-gray-50 text-red-600 font-semibold py-4 px-8 rounded-full text-lg border-2 border-red-600 transition-all duration-200 transform hover:scale-105 shadow-lg cursor-pointer">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Requirements Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Legal Requirements
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Age verification is now legally required in many jurisdictions
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">United States</h3>
              <p className="text-gray-600 mb-4">
                24 states now require age verification for adult content sites, including:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Louisiana, Texas, Utah, Arkansas</li>
                <li>Montana, North Carolina, Virginia</li>
                <li>And 16 other states with similar laws</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Europe</h3>
              <p className="text-gray-600 mb-4">
                Multiple European countries have implemented age verification requirements:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>UK - Online Safety Act</li>
                <li>France - Age verification laws</li>
                <li>Germany - Youth protection regulations</li>
                <li>EU Digital Services Act compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Cardless ID?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Traditional age verification solutions are expensive, invasive, and create friction for users
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-white hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Zero Cost</h3>
              <p className="text-gray-600">No per-verification fees or monthly subscriptions</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-white hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Privacy First</h3>
              <p className="text-gray-600">Users only share birth date, no personal information</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-white hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">One-Time Setup</h3>
              <p className="text-gray-600">Users verify once, access all adult sites forever</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-white hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Integration</h3>
              <p className="text-gray-600">Simple API integration with existing systems</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-white hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Global Access</h3>
              <p className="text-gray-600">Works worldwide with crypto wallet technology</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-white hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">Blockchain-based verification with military-grade security</p>
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple Implementation
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in minutes with our developer-friendly API
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Integration Steps</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Add our SDK</h4>
                    <p className="text-gray-600">Install our lightweight JavaScript SDK</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Configure verification</h4>
                    <p className="text-gray-600">Set up age verification for your content</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Go live</h4>
                    <p className="text-gray-600">Deploy and start protecting your users</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-400 text-sm ml-2">cardlessid-verifier.js</span>
              </div>
              <pre className="text-green-400 text-sm overflow-x-auto">
{`// Initialize Cardless ID
const cardlessID = new CardlessID({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Check age verification
cardlessID.verifyAge()
  .then(result => {
    if (result.verified) {
      // User is verified, show content
      showAdultContent();
    } else {
      // Show verification prompt
      showVerificationModal();
    }
  });`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-red-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Join the future of privacy-first age verification
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/contact">
                <button className="bg-white hover:bg-gray-100 text-red-600 font-semibold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg cursor-pointer">
                  Contact Sales
                </button>
              </Link>
              <Link to="/docs">
                <button className="bg-transparent hover:bg-red-700 text-white font-semibold py-4 px-8 rounded-full text-lg border-2 border-white transition-all duration-200 transform hover:scale-105 cursor-pointer">
                  View Documentation
                </button>
              </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForCompanies;
