import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeftIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  showBack?: string;
  showLogin?: boolean;
  showUserMenu?: boolean;
  userEmail?: string;
  onProfileClick?: () => void;
}

export default function Header({ 
  showBack, 
  showLogin, 
  showUserMenu, 
  userEmail,
  onProfileClick 
}: HeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully",
      });
      setLocation("/");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-card shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            {showBack && (
              <Link href={showBack}>
                <Button variant="ghost" size="sm" className="link-primary p-0">
                  <ChevronLeftIcon className="w-6 h-6" />
                </Button>
              </Link>
            )}
            <Link href="/">
              <div className="w-[150px] h-12 logo-gradient rounded-lg flex items-center justify-center text-white font-semibold text-lg cursor-pointer lowercase">
                agencyiq
              </div>
            </Link>
          </div>
          
          <div className="relative">
            {showLogin && (
              <Link href="/login">
                <Button variant="ghost" className="link-primary lowercase">
                  log in
                </Button>
              </Link>
            )}
            
            {showUserMenu && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors duration-200"
                >
                  <span className="hidden md:block lowercase">{userEmail}</span>
                  <ChevronDownIcon className="w-5 h-5" />
                </Button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border z-10">
                    <Link href="/schedule">
                      <button className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted lowercase">
                        dashboard
                      </button>
                    </Link>
                    <button 
                      onClick={() => {
                        onProfileClick?.();
                        setShowMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted lowercase"
                    >
                      edit profile
                    </button>
                    <a href="#" className="block px-4 py-2 text-sm text-foreground hover:bg-muted lowercase">
                      billing
                    </a>
                    <a href="#" className="block px-4 py-2 text-sm text-foreground hover:bg-muted lowercase">
                      cancel subscription
                    </a>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted border-t border-border lowercase"
                    >
                      log out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
