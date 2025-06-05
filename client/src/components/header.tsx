import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Menu, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  showBack?: string;
  showLogin?: boolean;
  showUserMenu?: boolean;
  title?: string;
}

interface User {
  id: number;
  email: string;
  phone: string;
  subscriptionPlan: string;
  remainingPosts: number;
  totalPosts: number;
}

export default function Header({ 
  showBack, 
  showLogin, 
  showUserMenu,
  title
}: HeaderProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch user data for authenticated users
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: showUserMenu,
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout", {});
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to log out",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-4">
            {showBack && (
              <Link href={showBack} className="flex items-center">
                <ArrowLeft className="h-5 w-5 text-gray-500 mr-2 hover:text-gray-700" />
              </Link>
            )}
            <Link href="/" className="flex items-center">
              <img 
                src="/attached_assets/agency_logo_1749083054761.png" 
                alt="AiQ" 
                className="h-12 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
            {title && (
              <div className="ml-4">
                <h1 className="text-lg font-medium text-gray-900">{title}</h1>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {showLogin && (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    Sign In
                  </Button>
                </Link>
                <Link href="/subscription">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    style={{ backgroundColor: '#3250fa' }}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
            
            {showUserMenu && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.subscriptionPlan} Plan</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="flex flex-col items-start p-3">
                    <div className="font-medium text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500 capitalize">{user.subscriptionPlan} Plan</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {user.remainingPosts} of {user.totalPosts} posts remaining
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/schedule" className="w-full cursor-pointer">
                      Content Calendar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
