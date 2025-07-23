import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface SessionStatus {
  hasSession: boolean;
  isComplete: boolean;
  isGuest: boolean;
  nextStep: string;
}

export function useSessionHook() {
  const [isLoading, setIsLoading] = useState(true);

  const { data: sessionStatus, error } = useQuery<SessionStatus>({
    queryKey: ['/api/onboarding/status'],
    retry: false,
    staleTime: 30000, // 30 seconds
  });

  useEffect(() => {
    if (sessionStatus !== undefined) {
      setIsLoading(false);
    }
  }, [sessionStatus]);

  // Check localStorage for onboarding completion
  const isOnboardingComplete = localStorage.getItem('onboarding-complete') === 'true';

  return {
    sessionEstablished: sessionStatus?.hasSession || false,
    onboardingComplete: sessionStatus?.isComplete || isOnboardingComplete,
    isGuest: sessionStatus?.isGuest || false,
    nextStep: sessionStatus?.nextStep || 'validate',
    isLoading: isLoading,
    error: error
  };
}