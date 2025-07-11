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
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [isSkipped, setIsSkipped] = useState(false);
  const [, setLocation] = useLocation();

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

  const wizardSteps: WizardStep[] = [
    {
      id: 1,
      title: "Welcome to TheAgencyIQ",
      description: "Your AI-powered social media automation platform",
      icon: <Target className="w-6 h-6" />,
      actionText: "Get Started",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[#3b5cff]/10 to-purple-500/10 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">What you'll accomplish:</h3>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Define your brand purpose and target audience</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Connect all your social media platforms</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Generate 52 AI-powered posts for your business</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
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
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">⚠️ Important Subscription Rules:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Posts don't roll over - use all posts within your 30-day cycle</li>
              <li>• Multiple posting builds brand recognition and trust</li>
              <li>• Consistent presence keeps you top-of-mind with customers</li>
            </ul>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Starter Plan</h4>
              <p className="text-2xl font-bold text-purple-600">$19.99</p>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• 12 posts per month</li>
                <li>• 3 platforms</li>
                <li>• Basic analytics</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Growth Plan</h4>
              <p className="text-2xl font-bold text-blue-600">$41.99</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 27 posts per month</li>
                <li>• 5 platforms</li>
                <li>• Advanced analytics</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Professional Plan</h4>
              <p className="text-2xl font-bold text-green-600">$99.99</p>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 52 posts per month</li>
                <li>• 5 platforms</li>
                <li>• Premium analytics</li>
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
      title: "Generate AI Content",
      description: "Create your posts automatically (returning subscribers start here)",
      icon: <Zap className="w-6 h-6" />,
      actionText: "Generate Posts",
      actionUrl: "/intelligent-schedule",
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">✅ Returning Subscribers:</h4>
            <p className="text-sm text-green-700">
              You're already logged in with an active subscription! This is your main content generation hub.
            </p>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-3">What You Can Do Here:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Content Management:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• View your existing 128 posts</li>
                  <li>• Edit and approve posts</li>
                  <li>• Generate new content</li>
                  <li>• Schedule posts for optimal times</li>
                  <li>• Add videos to posts</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Smart Features:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Platform-specific optimization</li>
                  <li>• Queensland events integration</li>
                  <li>• AI-powered content suggestions</li>
                  <li>• Calendar and list views</li>
                  <li>• Professional plan (52 posts/month)</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use "Generate AI-Powered Schedule" for fresh content</li>
              <li>• Edit posts before approving to match your voice</li>
              <li>• Add videos to increase engagement</li>
              <li>• Check analytics to see what's working</li>
            </ul>
          </div>
        </div>
      ),
      tips: [
        "This is your main content hub - you're already here!",
        "Existing posts show you're set up and ready",
        "Use the video generation feature for more engaging content"
      ]
    },
    {
      id: 4,
      title: "Define Your Brand Purpose",
      description: "Fine-tune your AI content by updating your brand purpose",
      icon: <Target className="w-6 h-6" />,
      actionText: "Update Brand Purpose",
      actionUrl: "/brand-purpose",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📝 Brand Purpose helps AI create better content:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your business name and what you do</li>
              <li>• Who your target audience is</li>
              <li>• What problems you solve for customers</li>
              <li>• Your unique value proposition</li>
              <li>• Your business goals and motivations</li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">✅ AI Content Benefits:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Content matches your business voice</li>
              <li>• Posts target your specific audience</li>
              <li>• Mentions your products/services naturally</li>
              <li>• Queensland market optimization</li>
              <li>• Brand consistency across all platforms</li>
            </ul>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">💡 Pro Tip:</h4>
            <p className="text-sm text-purple-700">
              The more detailed your brand purpose, the better your AI-generated content will be. Take time to fill it out completely!
            </p>
          </div>
        </div>
      ),
      tips: [
        "Update your brand purpose to improve AI content quality",
        "Add specific details about your target audience",
        "Include your unique selling points and goals"
      ]
    },
    {
      id: 5,
      title: "Connect Social Platforms",
      description: "Link your social media accounts for seamless posting",
      icon: <Users className="w-6 h-6" />,
      actionText: "Connect Platforms",
      actionUrl: "/connect-platforms",
      content: (
        <div className="space-y-4">
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
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h4 className="font-medium text-amber-900 mb-2">Security Note:</h4>
            <p className="text-sm text-amber-700">
              We use OAuth 2.0 secure authentication. Your passwords are never stored, and you can revoke access anytime.
            </p>
          </div>
        </div>
      ),
      tips: [
        "Check platform connection status",
        "Reconnect if you see OAuth errors",
        "Add more platforms to expand reach"
      ]
    },
    {
      id: 6,
      title: "Monitor & Optimize",
      description: "Track your content performance and improve results",
      icon: <BarChart3 className="w-6 h-6" />,
      actionText: "View Analytics",
      actionUrl: "/analytics",
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">📊 Your Analytics Dashboard:</h4>
            <p className="text-sm text-green-700">
              Monitor how your 128 posts are performing across all platforms and get insights to improve engagement.
            </p>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-3">Analytics Features:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Performance Metrics:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Reach and impressions per post</li>
                  <li>• Engagement rates by platform</li>
                  <li>• Click-through rates</li>
                  <li>• Audience growth tracking</li>
                  <li>• Best performing content types</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Optimization Insights:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Optimal posting times analysis</li>
                  <li>• Platform-specific recommendations</li>
                  <li>• Content theme performance</li>
                  <li>• Audience demographic insights</li>
                  <li>• ROI tracking and reporting</li>
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

  const handleNext = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCompletedSteps([...completedSteps, currentStep]);
      setCurrentStep(currentStep + 1);
    } else {
      // Final step completed - return to landing page with animation trigger
      setCompletedSteps([...completedSteps, currentStep]);
      setLocation('/?wizard-completed=true');
      setIsVisible(false);
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
          className="bg-[#3b5cff] hover:bg-[#2a4bd8] text-white rounded-full w-16 h-16 shadow-lg flex items-center justify-center"
          title="Open Training Guide"
        >
          <Target className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="card-atomiq p-8 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Training Guide</span>
          <span className="text-xs text-muted-foreground">Step {currentStep + 1} of {wizardSteps.length}</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-[#3b5cff] rounded-full flex items-center justify-center">
              {wizardSteps[currentStep].icon && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
            <span className="text-sm font-medium">{wizardSteps[currentStep].title}</span>
          </div>
          
          <div className="pl-6 space-y-2">
            <p className="text-xs text-muted-foreground">
              {wizardSteps[currentStep].description}
            </p>
            
            <div className="space-y-1">
              {wizardSteps[currentStep].tips.slice(0, 2).map((tip, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#3b5cff] rounded-full"></div>
                  <span className="text-xs">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-xs text-muted-foreground">{Math.round(progressPercentage)}% Complete</span>
            </div>
            <div className="w-full bg-gradient-to-r from-blue-200 to-cyan-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 space-x-2">
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
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipWizard}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Skip All
              </Button>
              
              <Button
                onClick={handleAction}
                size="sm"
                className="bg-[#3b5cff] hover:bg-[#2a4bd8] text-white text-xs"
              >
                {wizardSteps[currentStep].actionText}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}