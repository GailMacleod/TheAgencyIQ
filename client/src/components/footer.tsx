export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img 
                src="/attached_assets/agency_logo_1749083054761.png" 
                alt="The AgencyIQ" 
                className="h-10 w-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Social media automation platform for Queensland small businesses. 
              Streamline your social media management with AI-powered content generation.
            </p>
            <p className="text-xs text-gray-500">
              MacleodGlobal T/A The AgencyIQ
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="/subscription" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a 
                  href="/brand-purpose" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Brand Purpose
                </a>
              </li>
              <li>
                <a 
                  href="/schedule" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Content Calendar
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://app.theagencyiq.ai/privacy-policy" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="https://app.theagencyiq.ai/terms-of-service" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a 
                  href="https://app.theagencyiq.ai/contact" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-gray-500">
              © 2025 MacleodGlobal T/A The AgencyIQ. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <a 
                href="https://app.theagencyiq.ai" 
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Main Site
              </a>
              <span className="text-xs text-gray-300">|</span>
              <p className="text-xs text-gray-500">
                Proudly serving Queensland businesses
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
