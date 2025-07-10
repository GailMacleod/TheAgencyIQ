import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, HelpCircle, CheckCircle, ArrowRight, Lightbulb } from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface InteractiveGuideProps {
  steps: GuideStep[];
  isActive: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

export function InteractiveGuide({ steps, isActive, onComplete, onDismiss }: InteractiveGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!isActive || !steps.length) return;

    const targetElement = document.querySelector(steps[currentStep].target);
    if (targetElement) {
      setHighlightedElement(targetElement);
      
      // Scroll element into view
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Add highlight class
      targetElement.classList.add('interactive-guide-highlight');
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.classList.remove('interactive-guide-highlight');
      }
    };
  }, [currentStep, isActive, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepAction = () => {
    const action = steps[currentStep].action;
    if (action) {
      action.onClick();
    }
  };

  if (!isActive || !steps.length) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Guide Card */}
      <Card className="fixed z-50 max-w-sm shadow-2xl border-2 border-purple-200" 
            style={{
              top: '20%',
              right: '2rem',
              transform: 'translateY(-50%)'
            }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-900">Interactive Guide</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {currentStep + 1} / {steps.length}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onDismiss}
                className="p-1"
                aria-label="Close guide"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {currentStepData.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {currentStepData.description}
              </p>
            </div>

            {currentStepData.action && (
              <div className="bg-purple-50 p-3 rounded-lg">
                <Button 
                  onClick={handleStepAction}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  aria-label={currentStepData.action.text}
                >
                  {currentStepData.action.text}
                </Button>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                variant="outline"
                size="sm"
                aria-label="Previous step"
              >
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                aria-label={currentStep === steps.length - 1 ? "Complete guide" : "Next step"}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Complete
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlight Styles */}
      <style jsx global>{`
        .interactive-guide-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.5), 
                      0 0 20px rgba(147, 51, 234, 0.3);
          border-radius: 8px;
          animation: pulse-highlight 2s infinite;
        }

        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.5), 
                        0 0 20px rgba(147, 51, 234, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(147, 51, 234, 0.3), 
                        0 0 30px rgba(147, 51, 234, 0.5);
          }
        }
      `}</style>
    </>
  );
}

// Pre-built guide configurations
export const dashboardGuide: GuideStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Dashboard',
    description: 'This is your central hub for managing all your social media content. Let\'s explore the key features.',
    target: '[data-guide="dashboard"]',
    position: 'bottom'
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions Panel',
    description: 'Use these buttons to quickly generate content, check your quota, or access platform connections.',
    target: '[data-guide="quick-actions"]',
    position: 'bottom',
    action: {
      text: 'Try Generate Content',
      onClick: () => window.location.href = '/intelligent-schedule'
    }
  },
  {
    id: 'platform-status',
    title: 'Platform Status',
    description: 'Monitor your social media connections and refresh tokens when needed.',
    target: '[data-guide="platform-status"]',
    position: 'left',
    action: {
      text: 'Check Platform Status',
      onClick: () => window.location.href = '/platform-connections'
    }
  },
  {
    id: 'content-calendar',
    title: 'Content Calendar',
    description: 'View and manage your scheduled posts across all platforms.',
    target: '[data-guide="content-calendar"]',
    position: 'top'
  },
  {
    id: 'analytics',
    title: 'Analytics Overview',
    description: 'Track your post performance and engagement metrics.',
    target: '[data-guide="analytics"]',
    position: 'top'
  }
];

export const contentGenerationGuide: GuideStep[] = [
  {
    id: 'ai-scheduler',
    title: 'AI Content Generation',
    description: 'Our AI uses your brand purpose to create Queensland-focused content for your business.',
    target: '[data-guide="ai-scheduler"]',
    position: 'bottom'
  },
  {
    id: 'quota-display',
    title: 'Quota Management',
    description: 'Keep track of your remaining posts for the month. Quota is only deducted when posts are published.',
    target: '[data-guide="quota-display"]',
    position: 'left'
  },
  {
    id: 'platform-selection',
    title: 'Platform Selection',
    description: 'Choose which social media platforms to generate content for.',
    target: '[data-guide="platform-selection"]',
    position: 'bottom'
  },
  {
    id: 'generate-button',
    title: 'Generate Content',
    description: 'Click here to create your AI-powered content schedule.',
    target: '[data-guide="generate-button"]',
    position: 'top',
    action: {
      text: 'Generate Now',
      onClick: () => {
        const button = document.querySelector('[data-guide="generate-button"]') as HTMLButtonElement;
        if (button) button.click();
      }
    }
  }
];

export const postApprovalGuide: GuideStep[] = [
  {
    id: 'post-preview',
    title: 'Review Your Content',
    description: 'Each post is tailored for its specific platform with appropriate word counts and hashtags.',
    target: '[data-guide="post-preview"]',
    position: 'right'
  },
  {
    id: 'approve-button',
    title: 'Approve Posts',
    description: 'Approve posts you want to publish. This doesn\'t deduct from your quota yet.',
    target: '[data-guide="approve-button"]',
    position: 'top'
  },
  {
    id: 'publish-button',
    title: 'Publish Content',
    description: 'Publishing sends your content to social media platforms and deducts from your quota.',
    target: '[data-guide="publish-button"]',
    position: 'top',
    action: {
      text: 'Publish Now',
      onClick: () => {
        const button = document.querySelector('[data-guide="publish-button"]') as HTMLButtonElement;
        if (button) button.click();
      }
    }
  }
];