import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ArrowRight, ArrowLeft, X, Target, Users, Zap, Calendar, BarChart3, Play, CreditCard } from "lucide-react";
import { useLocation } from "wouter";

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  actionText: string;
  actionUrl?: string;
  tips: string[];
  route?: string;
}

interface UserStatus {
  userType: 'new' | 'returning';
  hasActiveSubscription: boolean;
  hasBrandSetup: boolean;
  hasConnections: boolean;
  currentUrl: string;
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [isSkipped, setIsSkipped] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus>({
    userType: 'new',
    hasActiveSubscription: false,
    hasBrandSetup: false,
    hasConnections: false,
    currentUrl: ''
  });
  const [location, setLocation] = useLocation();
  const [isDemoMode, setIsDemoMode] = useState(false);

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

  // Check user status and detect user type
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const response = await fetch('/api/user-status', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const statusData = await response.json();
          const hasActiveSubscription = statusData.hasActiveSubscription || false;
          setUserStatus({
            userType: statusData.userType || 'new',
            hasActiveSubscription,
            hasBrandSetup: statusData.hasBrandSetup || false,
            hasConnections: statusData.hasConnections || false,
            currentUrl: location
          });
          
          // Enable demo mode for non-subscribers on splash page
          setIsDemoMode(!hasActiveSubscription && location === '/');
          
          // Skip subscription step for returning subscribers
          if (hasActiveSubscription) {
            setSkippedSteps(prev => [...prev, 2]);
          }
        } else {
          // Fallback to /api/user if user-status endpoint doesn't exist
          const fallbackResponse = await fetch('/api/user', {
            credentials: 'include'
          });
          
          if (fallbackResponse.ok) {
            const userData = await fallbackResponse.json();
            const hasActiveSubscription = userData.subscriptionPlan && userData.subscriptionPlan !== 'free';
            setUserStatus({
              userType: hasActiveSubscription ? 'returning' : 'new',
              hasActiveSubscription,
              hasBrandSetup: userData.brandName ? true : false,
              hasConnections: false, // Default to false without specific endpoint
              currentUrl: location
            });
            
            // Enable demo mode for non-subscribers on splash page
            setIsDemoMode(!hasActiveSubscription && location === '/');
            
            if (hasActiveSubscription) {
              setSkippedSteps(prev => [...prev, 2]);
            }
          }
        }
      } catch (error) {
        console.log('Could not check user status:', error);
      }
    };
    
    checkUserStatus();
  }, [location]);

  // Load progress on mount
  useEffect(() => {
    const hasProgress = loadProgress();
    if (hasProgress) {
      console.log('Onboarding progress restored');
    }
  }, []);

  // Save progress when state changes
  useEffect(() => {
    saveProgress();
  }, [currentStep, completedSteps, skippedSteps, isSkipped]);

  // Dynamic step highlighting based on current URL
  const getStepFromUrl = (url: string): number => {
    const urlToStepMap: { [key: string]: number } = {
      '/': 0,
      '/subscription': 1,
      '/brand-purpose': 2,
      '/connect-platforms': 3,
      '/intelligent-schedule': 4,
      '/schedule': 4,
      '/analytics': 5,
      '/video-gen': 4 // Video generation is part of content step
    };
    return urlToStepMap[url] || currentStep;
  };

  // Update current step based on URL
  useEffect(() => {
    const urlStep = getStepFromUrl(location);
    if (urlStep !== currentStep && !isSkipped) {
      setCurrentStep(urlStep);
    }
  }, [location]);

  const baseWizardSteps: WizardStep[] = [
    {
      id: 1,
      title: "Welcome to TheAgencyIQ",
      description: "Your AI-powered social media automation platform",
      icon: <Target className="w-6 h-6" />,
      actionText: "Get Started",
      route: "/brand-purpose",
      content: (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">What you'll accomplish:</h3>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-gray-800" />
                <span>Define your brand purpose and target audience</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-gray-800" />
                <span>Connect all your social media platforms</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-gray-800" />
                <span>Generate 52 AI-powered posts for your business</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-gray-800" />
                <span>Schedule and publish content automatically</span>
              </li>
            </ul>
          </div>
        </div>
      ),
      tips: [
        "This wizard will take about 10 minutes to complete",
        "You can pause and resume anytime",
        "Each step builds on the previous one for best results"
      ]
    },
    {
      id: 2,
      title: "Choose Your Subscription",
      description: "Select your plan and start your 30-day content cycle",
      icon: <CreditCard className="w-6 h-6" />,
      actionText: "Choose Plan",
      actionUrl: "/subscription",
      route: "/brand-purpose",
      content: (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">⚠️ Important Subscription Rules:</h4>
            <ul className="text-sm text-gray-800 space-y-1">
              <li>Posts don't roll over - use all posts within your 30-day cycle</li>
              <li>Multiple posting builds brand recognition and trust</li>
              <li>Consistent presence keeps you top-of-mind with customers</li>
            </ul>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Starter Plan</h4>
              <p className="text-2xl font-bold text-purple-600">$19.99</p>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>12 posts per month</li>
                <li>3 platforms</li>
                <li>Basic analytics</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Growth Plan</h4>
              <p className="text-2xl font-bold text-gray-800">$41.99</p>
              <ul className="text-sm text-gray-800 space-y-1">
                <li>27 posts per month</li>
                <li>5 platforms</li>
                <li>Advanced analytics</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Professional Plan</h4>
              <p className="text-2xl font-bold text-gray-800">$99.99</p>
              <ul className="text-sm text-gray-800 space-y-1">
                <li>52 posts per month</li>
                <li>5 platforms</li>
                <li>Premium analytics</li>
              </ul>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Use all posts within 30 days - they don't carry over",
        "Higher plans unlock more content variety",
        "You can upgrade anytime during your cycle"
      ]
    },
    {
      id: 3,
      title: "Define Brand Purpose",
      description: "Tell us about your business and target audience",
      icon: <Target className="w-6 h-6" />,
      actionText: "Define Brand",
      actionUrl: "/brand-purpose",
      route: "/connect-platforms",
      content: (
        <div className="space-y-4">
          {userStatus.userType === 'returning' ? (
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">✅ Returning Subscriber:</h4>
              <p className="text-sm text-gray-800">
                You're already logged in with an active subscription! This is your main content generation hub.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">🎯 New User Guide:</h4>
              <p className="text-sm text-gray-800">
                After choosing your subscription, you'll access this powerful content generation interface.
              </p>
            </div>
          )}
          
          <div className="bg-white p-6 rounded-lg">
            <h3 className="font-semibold mb-3">🎬 Video Generation Mastery:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Video Rules:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li><strong>One video per post maximum</strong></li>
                  <li>Use auto-generated prompts or edit your own</li>
                  <li>Approve video to embed in post</li>
                  <li>Delete video if not satisfied</li>
                  <li>Can approve post without video</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Video Workflow:</h4>
                <ul className="text-sm text-gray-800 space-y-1">
                  <li>1. Click "Generate Video" button</li>
                  <li>2. Choose auto-prompt or edit custom</li>
                  <li>3. Review generated video preview</li>
                  <li>4. Approve to embed or delete</li>
                  <li>5. Edit post content if needed</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">⚠️ Connection Status:</h4>
            <p className="text-sm text-gray-800">
              If your platform connections are disconnected, you'll see reconnection prompts. Click "Reconnect Now" to fix OAuth issues.
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">✏️ Edit Post Features:</h4>
            <ul className="text-sm text-gray-800 space-y-1">
              <li>Edit content text for each platform</li>
              <li>Add or remove video content</li>
              <li>Adjust scheduling times</li>
              <li>Preview before approving</li>
              <li>Approve posts individually</li>
            </ul>
          </div>
        </div>
      ),
      tips: [
        "Master video generation: one video per post, auto or custom prompts",
        "Edit posts to match your brand voice before approval",
        "Check connection status warnings in platform connections"
      ]
    },

    {
      id: 4,
      title: "Connect Platforms",
      description: "Link your social media accounts for publishing",
      icon: <Users className="w-6 h-6" />,
      actionText: "Connect Platforms",
      actionUrl: "/connect-platforms",
      route: "/intelligent-schedule",
      content: (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">🚨 Connection Status Warnings:</h4>
            <ul className="text-sm text-gray-800 space-y-1">
              <li><strong>If disconnected:</strong> You'll see "Reconnect [Platform] Now" messages</li>
              <li><strong>OAuth errors:</strong> Click reconnect buttons immediately</li>
              <li><strong>Publishing failures:</strong> Check connection status first</li>
              <li><strong>Token expiry:</strong> Platforms disconnect after 60 days</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: "Facebook", color: "#1877F2", description: "Business pages & groups" },
              { name: "Instagram", color: "#E4405F", description: "Posts & stories" },
              { name: "LinkedIn", color: "#0A66C2", description: "Professional content" },
              { name: "YouTube", color: "#FF0000", description: "Video descriptions" },
              { name: "X (Twitter)", color: "#000000", description: "Quick updates" }
            ].map((platform) => (
              <div key={platform.name} className="border rounded-lg p-3 text-center">
                <div 
                  className="w-8 h-8 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: platform.color }}
                ></div>
                <div className="text-sm font-medium">{platform.name}</div>
                <div className="text-xs text-muted-foreground">{platform.description}</div>
              </div>
            ))}
          </div>
          
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">✅ Connection Management:</h4>
            <ul className="text-sm text-gray-800 space-y-1">
              <li>Green status = Connected and ready</li>
              <li>Red status = Disconnected, needs reconnection</li>
              <li>Click "Connect" or "Reconnect" buttons</li>
              <li>Test connections before publishing</li>
              <li>Check this page if posts fail to publish</li>
            </ul>
          </div>
          
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">🔒 Security Note:</h4>
            <p className="text-sm text-gray-800">
              We use OAuth 2.0 secure authentication. Your passwords are never stored, and you can revoke access anytime.
            </p>
          </div>
        </div>
      ),
      tips: [
        "Always check connection status before publishing",
        "Reconnect immediately when you see OAuth errors",
        "Connected platforms show green status indicators"
      ]
    },
    {
      id: 5,
      title: "Generate AI Content & Video",
      description: "Create posts with video generation features",
      icon: <Zap className="w-6 h-6" />,
      actionText: "Generate Content",
      actionUrl: "/intelligent-schedule",
      route: "/analytics",
      content: (
        <div className="space-y-4">
          {userStatus.userType === 'returning' ? (
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">✅ Returning Subscriber:</h4>
              <p className="text-sm text-gray-800">
                You're already logged in with an active subscription! This is your main content generation hub.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">🎯 New User Guide:</h4>
              <p className="text-sm text-gray-800">
                After connecting your platforms, you'll access this powerful content generation interface.
              </p>
            </div>
          )}
          
          <div className="bg-white p-6 rounded-lg">
            <h3 className="font-semibold mb-3">🎬 Video Generation Mastery:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Video Rules:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li><strong>One video per post maximum</strong></li>
                  <li>Use auto-generated prompts or edit your own</li>
                  <li>Approve video to embed in post</li>
                  <li>Delete video if not satisfied</li>
                  <li>Can approve post without video</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Video Workflow:</h4>
                <ul className="text-sm text-gray-800 space-y-1">
                  <li>1. Click "Generate Video" button</li>
                  <li>2. Choose auto-prompt or edit custom</li>
                  <li>3. Review generated video preview</li>
                  <li>4. Approve to embed or delete</li>
                  <li>5. Edit post content if needed</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">🤖 AI Content Generation:</h4>
            <ul className="text-sm text-gray-800 space-y-1">
              <li>Generate 52 posts automatically</li>
              <li>Queensland market focused content</li>
              <li>Platform-specific optimization</li>
              <li>Brand voice consistency</li>
              <li>Event-driven scheduling</li>
            </ul>
          </div>
        </div>
      ),
      tips: [
        "Master video generation: one video per post, auto or custom prompts",
        "Edit posts to match your brand voice before approval",
        "AI generates content optimized for Queensland market"
      ]
    },
    {
      id: 6,
      title: "Monitor & Optimize",
      description: "Track your content performance and improve results",
      icon: <BarChart3 className="w-6 h-6" />,
      actionText: "View Analytics",
      actionUrl: "/analytics",
      route: "/analytics",
      content: (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">📊 Your Analytics Dashboard:</h4>
            <p className="text-sm text-gray-800">
              Monitor how your 128 posts are performing across all platforms and get insights to improve engagement.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg">
            <h3 className="font-semibold mb-3">Analytics Features:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Performance Metrics:</h4>
                <ul className="text-sm text-gray-800 space-y-1">
                  <li>Reach and impressions per post</li>
                  <li>Engagement rates by platform</li>
                  <li>Click-through rates</li>
                  <li>Audience growth tracking</li>
                  <li>Best performing content types</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Optimization Insights:</h4>
                <ul className="text-sm text-gray-800 space-y-1">
                  <li>Optimal posting times analysis</li>
                  <li>Platform-specific recommendations</li>
                  <li>Content theme performance</li>
                  <li>Audience demographic insights</li>
                  <li>ROI tracking and reporting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Review analytics to see which posts perform best",
        "Use engagement data to optimize future content",
        "Mobile-responsive design with swipe navigation"
      ]
    }
  ];

  // Add demo CTA step for non-subscribers
  const demoCTAStep: WizardStep = {
    id: 7,
    title: "Ready to Get Started?",
    description: "Subscribe now to unlock all features and start automating your social media",
    icon: <CreditCard className="w-6 h-6" />,
    actionText: "Subscribe Now",
    actionUrl: "/subscription",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-[#3B82F6]/10 to-[#8B5CF6]/10 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3">🚀 What you'll unlock:</h3>
          <ul className="space-y-2">
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-gray-800" />
              <span>52 AI-generated posts per month</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-gray-800" />
              <span>Automatic publishing to all 5 platforms</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-gray-800" />
              <span>Professional video content generation</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-gray-800" />
              <span>Advanced analytics and insights</span>
            </li>
          </ul>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Start your 30-day content automation journey today
          </p>
          <Button
            onClick={() => setLocation('/subscription')}
            className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white font-bold px-8 py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            Subscribe Now
          </Button>
        </div>
      </div>
    ),
    tips: [
      "Choose the plan that fits your business needs",
      "All plans include AI content generation",
      "30-day money-back guarantee"
    ]
  };

  // Create wizard steps based on demo mode
  const wizardSteps: WizardStep[] = isDemoMode 
    ? [...baseWizardSteps, demoCTAStep]
    : baseWizardSteps;

  const handleNext = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCompletedSteps([...completedSteps, currentStep]);
      
      // Skip subscription step (step 1, index 1) for returning subscribers
      let nextStep = currentStep + 1;
      if (userStatus.userType === 'returning' && nextStep === 1) {
        nextStep = 2; // Skip to step 3 (Define Brand Purpose)
        setSkippedSteps(prev => [...prev, 1]); // Mark subscription step as skipped
      }
      
      setCurrentStep(nextStep);
      
      // Navigate to the next route if available (only in non-demo mode)
      if (!isDemoMode) {
        const nextRoute = wizardSteps[currentStep]?.route;
        if (nextRoute) {
          setLocation(nextRoute);
        }
      }
    } else {
      // Final step completed - return to landing page with animation trigger
      setCompletedSteps([...completedSteps, currentStep]);
      if (!isDemoMode) {
        setLocation('/?wizard-completed=true');
        setIsVisible(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    const stepId = wizardSteps[currentStep].id;
    setSkippedSteps([...skippedSteps, stepId]);
    handleNext();
  };

  const handleSkipWizard = () => {
    setIsSkipped(true);
    setIsVisible(false);
    localStorage.setItem('onboarding-skipped', 'true');
  };

  const handleResumeWizard = () => {
    setIsSkipped(false);
    setIsVisible(true);
    localStorage.removeItem('onboarding-skipped');
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleAction = () => {
    const step = wizardSteps[currentStep];
    
    // In demo mode, don't navigate to live routes - just advance to next step
    if (isDemoMode) {
      if (currentStep < wizardSteps.length - 1) {
        setCompletedSteps([...completedSteps, currentStep]);
        setCurrentStep(currentStep + 1);
      } else {
        // Final step in demo mode - navigate to subscription page
        setCompletedSteps([...completedSteps, currentStep]);
        setLocation('/subscription');
      }
      return;
    }
    
    // Normal mode - navigate to URLs
    if (step.actionUrl) {
      // Navigate to the URL but keep wizard open for guidance
      setLocation(step.actionUrl);
      // Move to next step instead of closing wizard
      if (currentStep < wizardSteps.length - 1) {
        setCompletedSteps([...completedSteps, currentStep]);
        setCurrentStep(currentStep + 1);
      } else {
        // Final step - complete wizard and return to landing page
        setCompletedSteps([...completedSteps, currentStep]);
        setLocation('/?wizard-completed=true');
        setIsVisible(false);
      }
    } else {
      handleNext();
    }
  };

  const progressPercentage = ((currentStep + 1) / wizardSteps.length) * 100;

  if (!isVisible) return null;

  // Skipped state - floating resume button
  if (isSkipped) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleResumeWizard}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-16 h-16 shadow-lg flex items-center justify-center"
          title="Resume Training Guide"
        >
          <Play className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  // Minimized state - floating button (always visible across pages)
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white rounded-full w-16 h-16 shadow-xl border-2 border-white/20 flex items-center justify-center"
          title="Open Training Guide"
        >
          <Target className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  // Check if we're on the splash page
  const isSplashPage = location === '/';
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isDemoMode && (
              <Badge variant="outline" className="text-xs bg-white text-gray-800 border-gray-200">
                Demo Mode
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">Step {currentStep + 1} of {wizardSteps.length}</span>
        </div>
        
        <div className="text-center space-y-3">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">{wizardSteps[currentStep].title}</h3>
            <p className="text-sm text-gray-600">
              {wizardSteps[currentStep].description}
            </p>
          </div>
          
          <div className="space-y-2">
            {wizardSteps[currentStep].tips.slice(0, 2).map((tip, index) => (
              <div key={index} className="text-sm text-gray-600">
                {tip}
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-xs text-muted-foreground">{Math.round(progressPercentage)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 space-x-2">
            {isDemoMode ? (
              // Demo mode - simple navigation
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="text-xs"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Prev
                </Button>
              </div>
            ) : (
              // Normal mode - simplified navigation
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="text-xs"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Prev
                </Button>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {isDemoMode ? (
                // Demo mode - only Next button
                <Button
                  onClick={handleNext}
                  size="sm"
                  className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white text-xs font-medium shadow-lg"
                >
                  {currentStep === wizardSteps.length - 1 ? 'Complete Demo' : 'Next'}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              ) : (
                // Normal mode - only next button
                <Button
                  onClick={handleNext}
                  size="sm"
                  className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white text-xs font-medium shadow-lg"
                >
                  Next
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}