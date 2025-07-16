import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { CheckCircle, Circle, ArrowRight, ArrowLeft, X, Target, Users, Zap, Calendar, BarChart3, Play, Minimize2, Maximize2 } from "lucide-react";
import { useLocation } from "wouter";
import { tokenRefreshService } from "@/utils/token-refresh";

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  actionText: string;
  tips: string[];
  route: string;
}

interface UserData {
  id: number;
  email: string;
  subscriptionPlan: string;
  brandName?: string;
}

interface UserStatus {
  hasActiveSubscription: boolean;
  hasBrandSetup: boolean;
  hasConnections: boolean;
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(true);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [isSkipped, setIsSkipped] = useState(false);
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Authenticated user data - primary source of truth with optimistic updates
  const { data: user, isLoading: userLoading, error: userError } = useQuery<UserData>({
    queryKey: ["/api/user"],
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.log('❌ User query failed:', error);
      // Try token refresh on error
      tokenRefreshService.refreshToken().then((result) => {
        if (result.success) {
          queryClient.invalidateQueries(["/api/user"]);
        }
      });
    }
  });

  // User status for onboarding progress with optimistic updates
  const { data: userStatus, isLoading: statusLoading } = useQuery<UserStatus>({
    queryKey: ["/api/user-status"],
    enabled: !!user, // Only fetch if user is authenticated
    retry: 3,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.log('❌ User status query failed:', error);
      // Try token refresh on error
      tokenRefreshService.refreshToken().then((result) => {
        if (result.success) {
          queryClient.invalidateQueries(["/api/user-status"]);
        }
      });
    }
  });

  // Loading state - show while authenticating
  if (userLoading || statusLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading your workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // Authentication required - redirect to login
  if (userError || !user) {
    window.location.href = '/login';
    return null;
  }

  // Subscription required - redirect to subscription page
  if (!userStatus?.hasActiveSubscription) {
    window.location.href = '/subscription';
    return null;
  }

  // Save progress to localStorage
  const saveProgress = () => {
    const progress = {
      currentStep,
      completedSteps,
      skippedSteps,
      isSkipped,
      timestamp: Date.now()
    };
    localStorage.setItem('onboarding-progress', JSON.stringify(progress));
  };

  // Load progress from localStorage
  const loadProgress = () => {
    const saved = localStorage.getItem('onboarding-progress');
    if (saved) {
      const progress = JSON.parse(saved);
      // Only load if saved within last 24 hours
      if (Date.now() - progress.timestamp < 24 * 60 * 60 * 1000) {
        setCurrentStep(progress.currentStep);
        setCompletedSteps(progress.completedSteps);
        setSkippedSteps(progress.skippedSteps || []);
        setIsSkipped(progress.isSkipped || false);
        return true;
      }
    }
    return false;
  };

  // Load progress on mount and start token refresh
  useEffect(() => {
    const hasProgress = loadProgress();
    if (hasProgress) {
      console.log('Onboarding progress restored');
    }
    
    // Start automatic token refresh
    tokenRefreshService.startAutoRefresh();
    
    // Cleanup on unmount
    return () => {
      tokenRefreshService.stopAutoRefresh();
    };
  }, []);

  // Save progress when state changes
  useEffect(() => {
    saveProgress();
  }, [currentStep, completedSteps, skippedSteps, isSkipped]);

  // Get current step from URL for authenticated subscribers
  const getStepFromUrl = (url: string): number => {
    const urlToStepMap: { [key: string]: number } = {
      '/': 0,
      '/intelligent-schedule': 0,
      '/schedule': 0,
      '/brand-purpose': 1,
      '/connect-platforms': 2,
      '/analytics': 3
    };
    return urlToStepMap[url] || 0;
  };

  // Update current step based on URL
  useEffect(() => {
    const urlStep = getStepFromUrl(location);
    if (urlStep !== currentStep && !isSkipped) {
      setCurrentStep(urlStep);
    }
  }, [location, currentStep, isSkipped]);

  // Get page-specific guidance for authenticated subscribers
  const getPageGuidance = () => {
    const url = location.split('?')[0];
    const guidanceMap: Record<string, string> = {
      '/': 'Welcome! Start by generating AI content for your business.',
      '/intelligent-schedule': 'Generate your AI content here, then define your brand purpose.',
      '/schedule': 'Generate your AI content here, then define your brand purpose.',
      '/brand-purpose': 'Define your brand purpose here, then connect your platforms.',
      '/connect-platforms': 'Connect your social media accounts here, then monitor analytics.',
      '/analytics': 'Monitor your performance here and optimize your strategy.'
    };
    return guidanceMap[url] || 'Continue your automation workflow using the menu.';
  };

  // Get logical navigation route for next step
  const getLogicalNavigation = () => {
    const navigationMap: Record<number, string> = {
      0: '/brand-purpose',
      1: '/connect-platforms',
      2: '/analytics',
      3: '/intelligent-schedule'
    };
    return navigationMap[currentStep] || '/intelligent-schedule';
  };

  // Subscriber wizard steps for authenticated users
  const subscriberWizardSteps: WizardStep[] = [
    {
      id: 0,
      title: "AI Content Generation",
      description: "Generate Queensland-focused content for your business",
      icon: <AnimatedIcon icon={Zap} colorScheme="gradient" size="sm" />,
      actionText: "Generate Content",
      route: "/intelligent-schedule",
      tips: [
        "AI creates content tailored to your Queensland audience",
        "Generate up to 52 posts per month with your subscription"
      ],
      content: (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Content Generation:</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">AI-powered Queensland content</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Platform-optimized posts</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Brand-aligned messaging</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: "Brand Purpose Setup",
      description: "Define your brand identity for personalized content",
      icon: <AnimatedIcon icon={Target} colorScheme="blue" size="sm" />,
      actionText: "Setup Brand",
      route: "/brand-purpose",
      tips: [
        "Brand purpose drives AI content generation",
        "Setup takes about 5 minutes"
      ],
      content: (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Brand Setup:</h3>
            <p className="text-sm text-gray-600 mb-4">
              Define your business purpose, target audience, and core messaging to generate personalized content that resonates with your Queensland customers.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Business purpose and values</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Target audience definition</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Core messaging framework</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Connect Platforms",
      description: "Link your social media accounts for publishing",
      icon: <AnimatedIcon icon={Users} colorScheme="pink" size="sm" />,
      actionText: "Connect Platforms",
      route: "/connect-platforms",
      tips: [
        "Connect Facebook, Instagram, LinkedIn, YouTube, and X",
        "OAuth secure authentication for all platforms"
      ],
      content: (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Platform Integration:</h3>
            <p className="text-sm text-gray-600 mb-4">
              Securely connect your social media accounts to enable automatic posting across all major platforms.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Facebook and Instagram</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">LinkedIn professional network</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">X (Twitter) and YouTube</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Analytics & Insights",
      description: "Monitor performance and optimize your strategy",
      icon: <AnimatedIcon icon={BarChart3} colorScheme="cyan" size="sm" />,
      actionText: "View Analytics",
      route: "/analytics",
      tips: [
        "Track engagement across all platforms",
        "Get AI insights for optimization"
      ],
      content: (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Analytics Dashboard:</h3>
            <p className="text-sm text-gray-600 mb-4">
              Monitor your social media performance and get AI-powered insights to optimize your content strategy.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Real-time engagement metrics</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">AI-powered content insights</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Performance optimization tips</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Get current step data
  const currentStepData = subscriberWizardSteps[currentStep];
  const totalSteps = subscriberWizardSteps.length;

  // Handle next step
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setCompletedSteps([...completedSteps, currentStep]);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCompletedSteps(completedSteps.filter(step => step !== currentStep));
    }
  };

  // Handle skip
  const handleSkip = () => {
    setSkippedSteps([...skippedSteps, currentStep]);
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle action (navigate to specific route)
  const handleAction = () => {
    const route = currentStepData.route;
    if (route) {
      setLocation(route);
      setCompletedSteps([...completedSteps, currentStep]);
      
      // Add completion parameter for tracking
      const url = new URL(window.location.href);
      url.searchParams.set('wizard-completed', 'true');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Handle close wizard
  const handleClose = () => {
    setIsVisible(false);
    setIsSkipped(true);
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-96 bg-white shadow-xl border-2 border-blue-200 transition-all duration-300 ${
        isMinimized ? 'h-16' : 'h-auto max-h-96'
      }`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <CardTitle className="text-lg font-semibold text-gray-800">
                {isMinimized ? 'Onboarding Guide' : currentStepData.title}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 h-8 w-8"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-1 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Step {currentStep + 1} of {totalSteps}</span>
                <span className="text-gray-600">{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
              </div>
              <Progress value={((currentStep + 1) / totalSteps) * 100} className="h-2" />
            </div>

            {/* Step Content */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                {currentStepData.icon}
                <div>
                  <h3 className="font-medium text-gray-800">{currentStepData.title}</h3>
                  <p className="text-sm text-gray-600">{currentStepData.description}</p>
                </div>
              </div>

              {/* Page Guidance */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">{getPageGuidance()}</p>
              </div>

              {/* Step Content */}
              <div className="max-h-40 overflow-y-auto">
                {currentStepData.content}
              </div>

              {/* Tips */}
              <div className="space-y-2">
                {currentStepData.tips.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
                    <span className="text-sm text-gray-600">{tip}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-3">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleAction}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {currentStepData.actionText}
                    <Play className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentStep === totalSteps - 1}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}