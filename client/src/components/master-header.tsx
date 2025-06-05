import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Menu, X } from "lucide-react";
import UserMenu from "@/components/user-menu";

interface MasterHeaderProps {
  showBack?: string;
  showLogin?: boolean;
  showUserMenu?: boolean;
  title?: string;
}

export default function MasterHeader({ 
  showBack, 
  showLogin = false, 
  showUserMenu = false,
  title 
}: MasterHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              {showBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = showBack}
                  className="p-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 lowercase">
                    {title || "the agencyiq"}
                  </h1>
                  <p className="text-xs text-gray-500 lowercase">queensland social media automation</p>
                </div>
              </div>
            </div>

            {/* Right side - Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              {showLogin && (
                <Button
                  onClick={() => window.location.href = '/login'}
                  variant="outline"
                  className="lowercase"
                >
                  log in
                </Button>
              )}
              
              {showUserMenu && <UserMenu />}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-3">
              {showLogin && (
                <Button
                  onClick={() => window.location.href = '/login'}
                  variant="outline"
                  className="w-full lowercase"
                >
                  log in
                </Button>
              )}
              
              {showUserMenu && (
                <div className="border-t pt-3">
                  <UserMenu />
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}