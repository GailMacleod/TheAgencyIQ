import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/splash-screen";
import GrokWidget from "@/components/grok-widget";
import NotFound from "@/pages/not-found";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import Splash from "@/pages/splash";
import Subscription from "@/pages/subscription";
import BrandPurpose from "@/pages/brand-purpose";
import PlatformConnections from "@/pages/real-platform-connections";
import ConnectPlatforms from "@/pages/connect-platforms";
import IntelligentSchedule from "@/pages/intelligent-schedule";
import Login from "@/pages/login";
import GrokTest from "@/pages/grok-test";
import Analytics from "@/pages/analytics";
import YearlyAnalytics from "@/pages/yearly-analytics";
import Profile from "@/pages/profile";
import ResetPassword from "@/pages/reset-password";
import RedeemCertificate from "@/pages/redeem-certificate";
import AdminDashboard from "@/components/AdminDashboard";
import ConnectionRepair from "@/pages/connection-repair";
import OAuthReconnect from "@/pages/oauth-reconnect";
import TokenStatus from "@/pages/token-status";
import OAuthDiagnostic from "@/pages/oauth-diagnostic";
import InstagramFix from "@/pages/instagram-fix";
import DataDeletionStatus from "@/pages/data-deletion-status";
import MetaPixelTest from "@/pages/meta-pixel-test";
import BulletproofDashboard from "@/pages/bulletproof-dashboard";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/brand-purpose" component={BrandPurpose} />
      <Route path="/platform-connections" component={ConnectPlatforms} />
      <Route path="/connect-platforms" component={ConnectPlatforms} />
      <Route path="/schedule" component={IntelligentSchedule} />
      <Route path="/intelligent-schedule" component={IntelligentSchedule} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/yearly-analytics" component={YearlyAnalytics} />
      <Route path="/profile" component={Profile} />
      <Route path="/grok-test" component={GrokTest} />
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/redeem-certificate" component={RedeemCertificate} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/dashboard" component={ConnectPlatforms} />
      <Route path="/connection-repair" component={ConnectionRepair} />
      <Route path="/oauth-reconnect" component={OAuthReconnect} />
      <Route path="/token-status" component={TokenStatus} />
      <Route path="/oauth-diagnostic" component={OAuthDiagnostic} />
      <Route path="/instagram-fix" component={InstagramFix} />
      <Route path="/data-deletion-status" component={DataDeletionStatus} />
      <Route path="/meta-pixel-test" component={MetaPixelTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  // Establish authentication session on app load with robust error handling
  useEffect(() => {
    const establishSession = async () => {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/establish-session', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Session established:', data.user?.email);
        } else {
          console.log('Session establishment failed, continuing without auth');
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Session establishment timeout, continuing without auth');
        } else if (error.message?.includes('Failed to fetch')) {
          console.log('Network error during session establishment, continuing without auth');
        } else {
          console.log('Session establishment error, continuing without auth');
        }
      }
    };
    
    // Don't await to prevent blocking app initialization
    establishSession().catch(() => {
      // Silently handle any remaining unhandled promise rejections
    });
  }, []);

  // Mobile layout detection and setup
  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      console.log('Mobile layout applied');
      const buttons = document.querySelectorAll('.connect-button, .profile-menu button');
      buttons.forEach(button => {
        const htmlButton = button as HTMLElement;
        htmlButton.addEventListener('click', () => {
          if (!htmlButton.offsetParent) console.log('Reverting to default layout');
        });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="app-container">
          <Toaster />
          {showSplash ? (
            <SplashScreen onComplete={() => setShowSplash(false)} />
          ) : (
            <>
              <Router />
              <GrokWidget />
            </>
          )}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
