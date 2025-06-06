import { useState } from "react";
import { Menu, X, User, CreditCard, LogOut, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface User {
  id: number;
  email: string;
  phone: string;
  subscriptionPlan: string;
  remainingPosts: number;
  totalPosts: number;
}

export default function UserMenu() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/cancel-subscription"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Cancel subscription error:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please contact support.",
        variant: "destructive",
      });
    },
  });

  const handleCancelSubscription = () => {
    if (window.confirm("Are you sure you want to cancel your subscription? This action cannot be undone.")) {
      cancelSubscriptionMutation.mutate();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-5 w-5" />
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-4">
        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground">{user.phone}</p>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Subscription Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan</span>
              <span className="text-sm text-primary capitalize">{user.subscriptionPlan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Posts Remaining</span>
              <span className="text-sm">{user.remainingPosts} / {user.totalPosts}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(user.remainingPosts / user.totalPosts) * 100}%` }}
              />
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Actions */}
          <div className="space-y-1">
            <DropdownMenuItem
              onClick={() => setLocation("/profile")}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => setLocation("/brand-purpose")}
              className="cursor-pointer"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Brand Purpose
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={handleCancelSubscription}
              disabled={cancelSubscriptionMutation.isPending}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}