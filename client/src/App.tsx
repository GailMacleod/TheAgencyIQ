import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import GrokWidget from "@/components/grok-widget";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import NotFound from "@/pages/not-found";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { clearBrowserCache } from "./utils/cache-utils";
import { sessionManager } from "./utils/session-manager";
import { apiClient } from "./utils/api-client";
import Splash from "@/pages/splash";
import Subscription from "@/pages/subscription";
import BrandPurpose from "@/pages/brand-purpose";
import PlatformConnections from "@/pages/real-platform-connections";
import ConnectPlatforms from "@/pages/connect-platforms";
import IntelligentSchedule from "@/pages/intelligent-schedule";
import Login from "@/pages/login";
import GrokTest from "@/pages/grok-test";
import Analytics from "@/pages/analytics";
import AIDashboard from "@/pages/ai-dashboard";
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
  
  // Add error boundary for routing
  try {
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
        <Route path="/ai-dashboard" component={AIDashboard} />
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
  } catch (error) {
    console.error("❌ Router error:", error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Navigation Error</h1>
        <p>Router failed to load. Please refresh the page.</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  // Establish session on app startup to prevent 401 errors - ENHANCED FOR USER ID 2
  useEffect(() => {
    const establishSession = async () => {
      try {
        await sessionManager.establishSession();
        
        // Wait a moment to ensure session is properly saved before invalidating queries
        setTimeout(() => {
          // Force refresh all queries to use the new session
          queryClient.invalidateQueries();
          console.log('🔄 Queries invalidated after session establishment');
          
          // Force a test API call to verify session is working
          setTimeout(() => {
            // FORCE MANUAL COOKIE HEADER IN REQUEST
            const sessionCookie = sessionStorage.getItem('sessionCookie');
            console.log('🔧 Using manual cookie for test:', sessionCookie);
            
            fetch('/api/user', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie || ''
              }
            }).then(response => {
              console.log('🔍 Session verification test:', response.status);
              if (response.ok) {
                console.log('✅ Session working correctly');
              } else {
                console.log('❌ Session verification failed');
              }
            }).catch(err => {
              console.log('❌ Session verification error:', err.message);
            });
          }, 200);
        }, 100);
        
      } catch (error) {
        console.error('❌ Session establishment failed:', error);
        // NO GUEST ACCESS - Stop the loop and show error
        setError('Authentication required. Please contact support.');
        setLoading(false);
        return;
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
          console.error('Session establishment failed with no session data');
          setError('Authentication required. Please contact support.');
          setLoading(false);
          return;
        }
      } catch (error: any) {
        console.error('Session establishment failed:', error);
        // NO GUEST ACCESS - Stop and show error
        setError('Authentication required. Please contact support.');
        setLoading(false);
        return;
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
          <Router />
          <OnboardingWizard />
          <GrokWidget />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
