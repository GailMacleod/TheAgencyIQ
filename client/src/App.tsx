import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/splash-screen";
import NotFound from "@/pages/not-found";
import Splash from "@/pages/splash";
import Subscription from "@/pages/subscription";
import Signup from "@/pages/signup";
import BrandPurpose from "@/pages/brand-purpose";
import PlatformConnections from "@/pages/platform-connections";
import Schedule from "@/pages/schedule";
import Login from "@/pages/login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/signup" component={Signup} />
      <Route path="/brand-purpose" component={BrandPurpose} />
      <Route path="/platform-connections" component={PlatformConnections} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/login" component={Login} />
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
          <Router />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
