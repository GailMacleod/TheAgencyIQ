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
import IntelligentSchedule from "@/pages/intelligent-schedule";
import Login from "@/pages/login";
import GrokTest from "@/pages/grok-test";
import Analytics from "@/pages/analytics";
import YearlyAnalytics from "@/pages/yearly-analytics";
import Profile from "@/pages/profile";
import ResetPassword from "@/pages/reset-password";
import RedeemCertificate from "@/pages/redeem-certificate";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/brand-purpose" component={BrandPurpose} />
      <Route path="/platform-connections" component={PlatformConnections} />
      <Route path="/schedule" component={IntelligentSchedule} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/yearly-analytics" component={YearlyAnalytics} />
      <Route path="/profile" component={Profile} />
      <Route path="/grok-test" component={GrokTest} />
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/redeem-certificate" component={RedeemCertificate} />
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
