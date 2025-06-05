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
              <img src={agencyLogoPath} alt="The AgencyIQ" className="h-12 w-auto cursor-pointer" />
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {showLogin && (
              <Link href="/login">
                <Button variant="ghost" className="link-primary lowercase">
                  log in
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
