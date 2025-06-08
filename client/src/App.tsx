import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/splash-screen";
import GrokWidget from "@/components/grok-widget";
import NotFound from "@/pages/not-found";
import Splash from "@/pages/splash";
import Subscription from "@/pages/subscription";
import BrandPurpose from "@/pages/brand-purpose";
import PlatformConnections from "@/pages/platform-connections";
import Schedule from "@/pages/schedule";
import Login from "@/pages/login";
import GrokTest from "@/pages/grok-test";
import Analytics from "@/pages/analytics";
import YearlyAnalytics from "@/pages/yearly-analytics";
import Profile from "@/pages/profile";
import ResetPassword from "@/pages/reset-password";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/brand-purpose" component={BrandPurpose} />
      <Route path="/platform-connections" component={PlatformConnections} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/yearly-analytics" component={YearlyAnalytics} />
      <Route path="/profile" component={Profile} />
      <Route path="/grok-test" component={GrokTest} />
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {showSplash ? (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        ) : (
          <>
            <Router />
            <GrokWidget />
          </>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
