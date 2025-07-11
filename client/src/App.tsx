import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/splash-screen";
import GrokWidget from "@/components/grok-widget";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import NotFound from "@/pages/not-found";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { clearBrowserCache } from "./utils/cache-utils";
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
import VideoGen from "@/pages/video-gen";

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
      <Route path="/video-gen" component={VideoGen} />
      <Route path="/logout" component={() => {
        // Handle logout as a route with complete session clearing
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
          .then(response => response.json())
          .then(data => {
            if (data.clearCache) {
              // Clear all local storage and session storage
              localStorage.clear();
              sessionStorage.clear();
              
              // Clear any cached data
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => {
                    caches.delete(name);
                  });
                });
              }
              
              // Clear onboarding progress specifically
              localStorage.removeItem('onboarding-progress');
              localStorage.removeItem('wizardProgress');
              localStorage.removeItem('userPreferences');
              
              console.log('Local storage cleared on logout');
            }
            
            // Force page reload to clear any cached state
            window.location.replace('/');
          })
          .catch(error => {
            console.error('Logout error:', error);
            // Force logout even on error
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('/');
          });
        return null;
      }} />
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

  // Initialize Google Analytics and clear stale cache when app loads
  useEffect(() => {
    // Clear any stale browser cache on startup to prevent auth issues
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clearCache') === 'true') {
      clearBrowserCache();
      console.log('Browser cache cleared on startup');
      // Remove clearCache parameter from URL
      urlParams.delete('clearCache');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
    
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  // Establish session on app startup to prevent 401 errors
  useEffect(() => {
    const establishSession = async () => {
      try {
        const response = await fetch('/api/establish-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Session established:', data.user?.email || 'User authenticated');
        } else {
          console.log('Session establishment failed, continuing with guest access');
        }
      } catch (error) {
        console.log('Session establishment error, continuing with guest access');
      }
    };

    establishSession();
  }, []);

  // PWA Install Prompt Handler
  useEffect(() => {
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as any;
      showInstallPromotion();
    };

    const showInstallPromotion = () => {
      // Check if install button already exists
      if (document.getElementById('pwa-install-button')) return;
      
      const installButton = document.createElement('button');
      installButton.id = 'pwa-install-button';
      installButton.textContent = 'Install TheAgencyIQ';
      installButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        background: #3250fa;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      
      installButton.addEventListener('click', () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted the install prompt');
            } else {
              console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
            installButton.remove();
          });
        }
      });
      
      document.body.appendChild(installButton);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      const button = document.getElementById('pwa-install-button');
      if (button) button.remove();
    };
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
              <OnboardingWizard />
              <GrokWidget />
            </>
          )}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
