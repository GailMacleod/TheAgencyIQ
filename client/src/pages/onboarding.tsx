import React, { useEffect } from 'react';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

export default function OnboardingPage() {
  const [, setLocation] = useLocation();

  // Check if user has already completed onboarding
  const { data: user } = useQuery({
    queryKey: ['/api/user']
  });

  const { data: brandPurpose } = useQuery({
    queryKey: ['/api/brand-purpose']
  });

  const { data: platformStatus } = useQuery({
    queryKey: ['/api/oauth-status']
  });

  const { data: subscriptionStatus } = useQuery({
    queryKey: ['/api/subscription-usage']
  });

  // Determine if onboarding is complete
  const isOnboardingComplete = () => {
    const hasConnectedPlatforms = platformStatus?.platforms?.some(p => p.connected);
    const hasBrandPurpose = brandPurpose?.brandName && brandPurpose?.corePurpose;
    const hasSubscription = subscriptionStatus?.subscriptionActive;
    
    return hasConnectedPlatforms && hasBrandPurpose && hasSubscription;
  };

  // Redirect if already completed
  useEffect(() => {
    if (isOnboardingComplete()) {
      setLocation('/dashboard');
    }
  }, [platformStatus, brandPurpose, subscriptionStatus, setLocation]);

  const handleOnboardingComplete = () => {
    // Set onboarding completion flag
    localStorage.setItem('onboarding_completed', 'true');
    
    // Redirect to dashboard
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto py-8">
        <OnboardingWizard 
          onComplete={handleOnboardingComplete}
          initialStep={0}
        />
      </div>
    </div>
  );
}