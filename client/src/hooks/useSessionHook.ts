import { useState, useEffect } from 'react';
import { makeAuthenticatedRequest, validateSession } from '@/utils/authenticatedRequest';

interface SessionStatus {
  sessionEstablished: boolean;
  onboardingComplete: boolean;
  isLoading: boolean;
  sessionError: boolean;
  sessionId?: string;
  lastActivity?: number;
}

export function useSessionHook(): SessionStatus {
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [lastActivity, setLastActivity] = useState<number | undefined>();

  useEffect(() => {
    const checkSessionStatus = async () => {
      setIsLoading(true);
      setSessionError(false);
      
      try {
        console.log('🔍 Checking session status...');
        
        // First check if onboarding is complete from localStorage
        const onboardingCompleteFlag = localStorage.getItem('onboarding-complete');
        
        if (onboardingCompleteFlag === 'true') {
          setOnboardingComplete(true);
          console.log('✅ Onboarding marked as complete');
        }

        // Validate session with server using authenticated request
        try {
          const sessionValid = await validateSession();
          
          if (sessionValid) {
            // Get detailed session information
            const response = await makeAuthenticatedRequest('/api/auth/session', {
              method: 'GET',
              maxRetries: 2,
              timeout: 8000
            });
            
            if (response.ok) {
              const sessionData = await response.json();
              console.log('✅ Session validated:', sessionData.sessionId);
              
              setSessionEstablished(true);
              setSessionId(sessionData.sessionId);
              setLastActivity(sessionData.lastActivity);
              
              // Store session info for offline access
              localStorage.setItem('session-id', sessionData.sessionId);
              localStorage.setItem('last-activity', sessionData.lastActivity?.toString() || '');
            }
          } else {
            console.log('❌ Session validation failed');
            setSessionEstablished(false);
          }
        } catch (sessionValidationError) {
          console.error('Session validation error:', sessionValidationError);
          
          // Fallback: Check for cached session
          const cachedSessionId = localStorage.getItem('session-id');
          const cachedActivity = localStorage.getItem('last-activity');
          
          if (cachedSessionId && cachedActivity) {
            const activityTime = parseInt(cachedActivity);
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            
            // If cached session is less than 1 hour old, assume it's valid
            if (activityTime > oneHourAgo) {
              console.log('📋 Using cached session for offline/PWA mode');
              setSessionEstablished(true);
              setSessionId(cachedSessionId);
              setLastActivity(activityTime);
            } else {
              console.log('🕒 Cached session expired');
              localStorage.removeItem('session-id');
              localStorage.removeItem('last-activity');
            }
          }
        }
        
      } catch (error) {
        console.error('Session status check failed:', error);
        setSessionError(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkSessionStatus();

    // Set up periodic session validation (every 5 minutes)
    const interval = setInterval(() => {
      if (sessionEstablished && !isLoading) {
        validateSession().catch(() => {
          console.log('Periodic session validation failed');
          // Don't set error state for periodic checks
        });
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    sessionEstablished,
    onboardingComplete,
    isLoading,
    sessionError,
    sessionId,
    lastActivity
  };
}