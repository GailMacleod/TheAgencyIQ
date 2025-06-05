import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeftIcon, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import UserMenu from "./user-menu";
import agencyLogoPath from "@assets/agency_logo_1749083054761.png";

interface HeaderProps {
  showBack?: string;
  showLogin?: boolean;
  showUserMenu?: boolean;
}

export default function Header({ 
  showBack, 
  showLogin, 
  showUserMenu
}: HeaderProps) {

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {showBack && (
              <Link href={showBack}>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100">
                  <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                </Button>
              </Link>
            )}
            <Link href="/">
              <img src={agencyLogoPath} alt="The AgencyIQ" className="h-10 w-auto cursor-pointer" />
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {showLogin && (
              <Link href="/login">
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                  Sign In
                </Button>
              </Link>
            )}
            
            {showUserMenu && <UserMenu />}
          </div>
        </div>
      </div>
    </header>
  );
}
