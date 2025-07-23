import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

// ✅ SESSION HOOK FOR CONDITIONAL ONBOARDING WIZARD DISPLAY
// Shows wizard if !session.established or !localStorage 'onboarding-complete'

interface SessionStatus {
  sessionEstablished: boolean;
  onboardingComplete: boolean;
  guestMode: boolean;
  userId?: string;
  email?: string;
  guestExpiresAt?: string;
  limitations?: {
    maxPosts: number;
    noPlatformConnections: boolean;
    noVideoGeneration: boolean;
    noAnalytics: boolean;
  };
}

export function useSessionHook() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if onboarding is complete in localStorage
  const isOnboardingCompleteInStorage = () => {
    try {
      return localStorage.getItem('onboarding-complete') === 'true';
    } catch {
      return false;
    }
  };

  const fetchSessionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/api/onboarding/status');
      setSessionStatus(response);
      setError(null);

      // Update localStorage if onboarding is complete
      if (response.onboardingComplete) {
        localStorage.setItem('onboarding-complete', 'true');
      }

    } catch (error: any) {
      console.error('Session status fetch error:', error);
      setError(error.message || 'Failed to fetch session status');
      
      // If API fails, check localStorage for offline fallback
      const localOnboardingComplete = isOnboardingCompleteInStorage();
      setSessionStatus({
        sessionEstablished: false,
        onboardingComplete: localOnboardingComplete,
        guestMode: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionStatus();
  }, []);

  // Determine if onboarding wizard should be shown
  const shouldShowOnboardingWizard = () => {
    if (!sessionStatus) return false;
    
    const localOnboardingComplete = isOnboardingCompleteInStorage();
    
    // Show wizard if:
    // 1. Session not established AND local storage not complete
    // 2. OR session established but onboarding not complete in session
    return (!sessionStatus.sessionEstablished && !localOnboardingComplete) ||
           (sessionStatus.sessionEstablished && !sessionStatus.onboardingComplete);
  };

  // Enable guest mode when authentication fails
  const enableGuestMode = async () => {
    try {
      const response = await apiRequest('/api/onboarding/guest-mode', {
        method: 'POST'
      });

      if (response.success) {
        setSessionStatus({
          sessionEstablished: true,
          onboardingComplete: false,
          guestMode: true,
          guestExpiresAt: response.guestExpiresAt,
          limitations: response.limitations
        });
        
        console.log('🎯 Guest mode enabled with limitations:', response.limitations);
        return response;
      }

      throw new Error(response.error || 'Failed to enable guest mode');
    } catch (error: any) {
      console.error('Guest mode activation error:', error);
      throw error;
    }
  };

  // Complete onboarding and update session
  const completeOnboarding = async (userData: any) => {
    try {
      const response = await apiRequest('/api/onboarding/complete', {
        method: 'POST',
        body: userData
      });

      if (response.success) {
        localStorage.setItem('onboarding-complete', 'true');
        await fetchSessionStatus(); // Refresh session status
      }

      return response;
    } catch (error: any) {
      console.error('Onboarding completion error:', error);
      throw error;
    }
  };

  return {
    sessionStatus,
    isLoading,
    error,
    shouldShowOnboardingWizard: shouldShowOnboardingWizard(),
    enableGuestMode,
    completeOnboarding,
    refreshSessionStatus: fetchSessionStatus,
    isGuestMode: sessionStatus?.guestMode || false,
    hasActiveLimitations: !!(sessionStatus?.limitations),
    guestExpiresAt: sessionStatus?.guestExpiresAt
  };
}