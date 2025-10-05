import { Link, Outlet } from "react-router";

const DocsLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <Outlet />

          {/* Docs Footer - shared across all docs pages */}
          <div className="mt-12 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Resources
                </h3>
                <ul className="space-y-2 text-blue-600">
                  <li>
                    <a
                      href="https://github.com/djscruggs/cardlessid"
                      className="hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GitHub Repository
                    </a>
                  </li>
                  <li>
                    <Link
                      to="/docs/credential-schema"
                      className="hover:underline"
                    >
                      Credential Schema Documentation
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/docs/integration-guide"
                      className="hover:underline"
                    >
                      Integration Guide
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/age-verify" className="hover:underline">
                      Try Live Demo
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Support
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>📧 Email: support@cardlessid.com</li>
                  <li>
                    🐛 Issues:{" "}
                    <a
                      className="text-blue-600 hover:underline"
                      href="https://github.com/djscruggs/cardlessid/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GitHub Issues
                    </a>
                  </li>
                  <li>💬 Community: Discord (coming soon)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsLayout;
