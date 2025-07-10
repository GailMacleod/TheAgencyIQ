import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ArrowRight, ArrowLeft, X, Target, Users, Zap, Calendar, BarChart3, Play } from "lucide-react";
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
  const [, setLocation] = useLocation();

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
      title: "Define Your Brand Purpose",
      description: "Tell us about your business so AI can create perfect content",
      icon: <Target className="w-6 h-6" />,
      actionText: "Define Brand Purpose",
      actionUrl: "/brand-purpose",
      content: (
        <div className="space-y-4">
          <div className="border-l-4 border-[#3b5cff] pl-4">
            <h3 className="font-semibold mb-2">Why this matters:</h3>
            <p className="text-muted-foreground">
              Our AI uses your brand purpose to create content that resonates with your specific audience and business goals.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What we'll ask:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your business name and industry</li>
                <li>• Core products or services</li>
                <li>• Target audience demographics</li>
                <li>• Business goals and challenges</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">What you'll get:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Personalized content strategy</li>
                <li>• Brand-aligned post generation</li>
                <li>• Audience-specific messaging</li>
                <li>• Queensland market optimization</li>
              </ul>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Be specific about your target audience for better results",
        "Include your unique value proposition",
        "Mention any local Queensland connections"
      ]
    },
    {
      id: 3,
      title: "Connect Social Platforms",
      description: "Link your social media accounts for seamless posting",
      icon: <Users className="w-6 h-6" />,
      actionText: "Connect Platforms",
      actionUrl: "/platform-connections",
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
        "Connect at least 3 platforms for maximum reach",
        "Business accounts work better than personal ones",
        "You can add more platforms later"
      ]
    },
    {
      id: 4,
      title: "Generate AI Content",
      description: "Create 52 professional posts tailored to your brand",
      icon: <Zap className="w-6 h-6" />,
      actionText: "Generate Content",
      actionUrl: "/intelligent-schedule",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-3">AI Content Generation Features:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Content Types:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Educational posts</li>
                  <li>• Behind-the-scenes content</li>
                  <li>• Customer testimonials</li>
                  <li>• Product showcases</li>
                  <li>• Industry insights</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Smart Features:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Platform-specific optimization</li>
                  <li>• Queensland events integration</li>
                  <li>• Optimal posting times</li>
                  <li>• Hashtag optimization</li>
                  <li>• Call-to-action suggestions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Review and edit posts before approving",
        "AI learns from your preferences over time",
        "You can regenerate individual posts if needed"
      ]
    },
    {
      id: 5,
      title: "Schedule & Publish",
      description: "Set up automated posting for consistent presence",
      icon: <Calendar className="w-6 h-6" />,
      actionText: "View Schedule",
      actionUrl: "/intelligent-schedule",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-[#3b5cff]" />
                Smart Scheduling
              </h4>
              <ul className="text-sm space-y-2">
                <li>• Optimal posting times for each platform</li>
                <li>• Even distribution across the month</li>
                <li>• Queensland timezone optimization</li>
                <li>• Weekend and holiday adjustments</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center">
                <Play className="w-4 h-4 mr-2 text-green-500" />
                Publishing Options
              </h4>
              <ul className="text-sm space-y-2">
                <li>• Automatic publishing (recommended)</li>
                <li>• Manual approval for each post</li>
                <li>• Bulk approval for trusted content</li>
                <li>• Emergency pause functionality</li>
              </ul>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Start with manual approval to build confidence",
        "Monitor analytics to optimize posting times",
        "Use the emergency pause if needed"
      ]
    },
    {
      id: 6,
      title: "Monitor & Optimize",
      description: "Track performance and improve your strategy",
      icon: <BarChart3 className="w-6 h-6" />,
      actionText: "View Analytics",
      actionUrl: "/analytics",
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">🎉 You're all set!</h3>
            <p className="text-green-700 mb-4">
              Your social media automation is now active. Here's what happens next:
            </p>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                <div>
                  <div className="font-medium">Posts publish automatically</div>
                  <div className="text-sm text-green-600">Based on your schedule and platform optimization</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
                <div>
                  <div className="font-medium">Analytics track performance</div>
                  <div className="text-sm text-green-600">Monitor reach, engagement, and growth metrics</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                <div>
                  <div className="font-medium">Monthly content refresh</div>
                  <div className="text-sm text-green-600">New posts generated based on performance data</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Check analytics weekly for insights",
        "Adjust strategy based on performance",
        "Engage with comments and messages manually"
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

  // Minimized state - floating button
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-[#3b5cff] hover:bg-[#2a4bd8] text-white rounded-full w-16 h-16 shadow-lg flex items-center justify-center"
        >
          <Target className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <CardTitle className="text-2xl text-[#3b5cff]">
                Getting Started Guide
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Step {currentStep + 1} of {wizardSteps.length}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="text-muted-foreground hover:text-foreground"
                title="Minimize wizard"
              >
                <Circle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground"
                title="Close wizard"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <Progress value={progressPercentage} className="mb-4" />
          
          {/* Step indicators */}
          <div className="flex justify-between items-center mb-6 overflow-x-auto">
            {wizardSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors min-w-0 ${
                  index === currentStep
                    ? 'bg-[#3b5cff]/10 text-[#3b5cff]'
                    : completedSteps.includes(index)
                    ? 'text-green-600 hover:bg-green-50'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === currentStep
                    ? 'bg-[#3b5cff] text-white'
                    : completedSteps.includes(index)
                    ? 'bg-green-500 text-white'
                    : 'border-2 border-muted-foreground'
                }`}>
                  {completedSteps.includes(index) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span className="text-xs text-center truncate max-w-20">
                  {step.title.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#3b5cff] to-purple-500 rounded-full flex items-center justify-center text-white">
                {wizardSteps[currentStep].icon}
              </div>
            </div>
            <h2 className="text-2xl font-bold">{wizardSteps[currentStep].title}</h2>
            <p className="text-muted-foreground text-lg">{wizardSteps[currentStep].description}</p>
          </div>

          <div className="space-y-6">
            {wizardSteps[currentStep].content}
            
            {/* Tips section */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips:</h4>
              <ul className="space-y-1">
                {wizardSteps[currentStep].tips.map((tip, index) => (
                  <li key={index} className="text-sm text-blue-700 flex items-start space-x-2">
                    <Circle className="w-3 h-3 mt-0.5 fill-current" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsMinimized(true)}
              >
                Minimize
              </Button>
              
              <Button
                onClick={handleAction}
                className="bg-[#3b5cff] hover:bg-[#2a4bd8] text-white flex items-center space-x-2"
              >
                <span>{wizardSteps[currentStep].actionText}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}