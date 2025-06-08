export default function MasterFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 lowercase">the agencyiq</h3>
                <p className="text-xs text-gray-500 lowercase">queensland social media automation</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 lowercase">
              powered by ai-driven content generation and strategic insights for queensland small businesses
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4 lowercase">quick links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/brand-purpose" className="text-sm text-gray-600 hover:text-purple-600 lowercase">
                  brand purpose
                </a>
              </li>
              <li>
                <a href="/platform-connections" className="text-sm text-gray-600 hover:text-purple-600 lowercase">
                  platform connections
                </a>
              </li>
              <li>
                <a href="/schedule" className="text-sm text-gray-600 hover:text-purple-600 lowercase">
                  content schedule
                </a>
              </li>
              <li>
                <a href="/analytics" className="text-sm text-gray-600 hover:text-purple-600 lowercase">
                  analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4 lowercase">contact</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 lowercase">
                macleodglobal trading as the agencyiq
              </p>
              <p className="text-sm text-gray-600">
                <a href="https://app.theagencyiq.ai" className="hover:text-purple-600 lowercase">support@theagencyiq.ai</a>
              </p>
              <p className="text-sm text-gray-600 lowercase">
                queensland, australia
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-gray-500 lowercase">
              © 2025 macleodglobal trading as the agencyiq. all rights reserved.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-xs text-gray-500 hover:text-purple-600 lowercase">
                privacy policy
              </a>
              <a href="#" className="text-xs text-gray-500 hover:text-purple-600 lowercase">
                terms of service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}