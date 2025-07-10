import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowRight, ArrowLeft, Info, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ContextualTooltip } from '@/components/navigation/ContextualTooltip';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  completed: boolean;
  required: boolean;
  tooltip?: string;
}

interface OnboardingWizardProps {
  onComplete?: () => void;
  initialStep?: number;
}

// Step Components
const WelcomeStep = ({ onNext }: { onNext: () => void }) => (
  <div className="text-center space-y-6">
    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
      <CheckCircle className="w-8 h-8 text-white" />
    </div>
    <div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TheAgencyIQ</h3>
      <p className="text-gray-600 max-w-md mx-auto">
        Your AI-powered social media automation platform for Queensland SMEs. 
        Let's get you set up in just a few minutes.
      </p>
    </div>
    <div className="bg-blue-50 p-4 rounded-lg">
      <h4 className="font-semibold text-blue-900 mb-2">What you'll accomplish:</h4>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• Connect your social media accounts</li>
        <li>• Set up your brand purpose</li>
        <li>• Choose your subscription plan</li>
        <li>• Generate your first AI posts</li>
      </ul>
    </div>
    <Button onClick={onNext} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3">
      Get Started
      <ArrowRight className="ml-2 w-4 h-4" />
    </Button>
  </div>
);

const OAuthStep = ({ onNext }: { onNext: () => void }) => {
  const { data: platformStatus } = useQuery({
    queryKey: ['/api/oauth-status'],
    refetchInterval: 5000
  });

  const [, setLocation] = useLocation();
  const connectedPlatforms = platformStatus?.platforms?.filter(p => p.connected) || [];
  const totalPlatforms = 5;
  const isComplete = connectedPlatforms.length >= 2; // Require at least 2 platforms

  const platformConfig = [
    { name: 'Facebook', color: 'bg-blue-600', required: true },
    { name: 'Instagram', color: 'bg-pink-600', required: true },
    { name: 'LinkedIn', color: 'bg-blue-700', required: false },
    { name: 'X (Twitter)', color: 'bg-black', required: false },
    { name: 'YouTube', color: 'bg-red-600', required: false }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Platforms</h3>
        <p className="text-gray-600">
          Connect at least 2 social media accounts to start publishing content
        </p>
      </div>

      <div className="grid gap-4">
        {platformConfig.map((platform) => {
          const isConnected = connectedPlatforms.some(p => 
            p.platform.toLowerCase() === platform.name.toLowerCase() || 
            (platform.name === 'X (Twitter)' && p.platform.toLowerCase() === 'x')
          );
          
          return (
            <div 
              key={platform.name}
              className={`p-4 border rounded-lg flex items-center justify-between ${
                isConnected ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{platform.name}</span>
                    {platform.required && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {isConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setLocation(`/connect/${platform.name.toLowerCase().replace(' (twitter)', '').replace('x (twitter)', 'x')}`)}
                    aria-label={`Connect ${platform.name} account`}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ContextualTooltip 
        term="OAuth Connection"
        explanation="OAuth lets you securely connect your social media accounts without sharing passwords. Your tokens are encrypted and stored safely."
      >
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            <span>Why do I need to connect accounts?</span>
          </div>
        </div>
      </ContextualTooltip>

      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-gray-600">
          {connectedPlatforms.length} of {totalPlatforms} platforms connected
        </div>
        <Button 
          onClick={onNext}
          disabled={!isComplete}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          aria-label="Continue to brand purpose setup"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const BrandPurposeStep = ({ onNext }: { onNext: () => void }) => {
  const { data: brandPurpose } = useQuery({
    queryKey: ['/api/brand-purpose']
  });

  const [, setLocation] = useLocation();
  const isComplete = brandPurpose?.brandName && brandPurpose?.corePurpose;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Define Your Brand Purpose</h3>
        <p className="text-gray-600">
          Help our AI understand your business to create targeted content
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg">
        <h4 className="font-semibold text-purple-900 mb-3">Your Brand Information</h4>
        
        {isComplete ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">Brand Name:</span>
              <span className="text-gray-700">{brandPurpose.brandName}</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <span className="font-medium">Core Purpose:</span>
                <p className="text-gray-700 mt-1">{brandPurpose.corePurpose}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-orange-700">Brand purpose not defined</span>
            </div>
            <Button 
              onClick={() => setLocation('/brand-purpose')}
              variant="outline"
              className="w-full"
              aria-label="Set up brand purpose"
            >
              Set Up Brand Purpose
            </Button>
          </div>
        )}
      </div>

      <ContextualTooltip 
        term="Brand Purpose"
        explanation="Your brand purpose helps our AI generate content that reflects your business values and resonates with your Queensland audience. It includes your mission, target audience, and key messaging."
      >
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            <span>Why is brand purpose important?</span>
          </div>
        </div>
      </ContextualTooltip>

      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-gray-600">
          {isComplete ? 'Brand purpose configured' : 'Brand purpose required'}
        </div>
        <Button 
          onClick={onNext}
          disabled={!isComplete}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          aria-label="Continue to subscription setup"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const SubscriptionStep = ({ onNext }: { onNext: () => void }) => {
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['/api/subscription-usage']
  });

  const [, setLocation] = useLocation();
  const hasActiveSubscription = subscriptionStatus?.subscriptionActive;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Your Plan</h3>
        <p className="text-gray-600">
          Select the perfect plan for your Queensland SME needs
        </p>
      </div>

      <div className="grid gap-4">
        {[
          { name: 'Starter', posts: 12, price: '$29', features: ['Basic AI content', 'Queensland events', '2 platforms'] },
          { name: 'Professional', posts: 52, price: '$99', features: ['Advanced AI content', 'Brisbane Ekka focus', '5 platforms', 'Analytics'], recommended: true },
          { name: 'Enterprise', posts: 104, price: '$199', features: ['Custom AI training', 'Priority support', 'White-label options'] }
        ].map((plan) => (
          <div 
            key={plan.name}
            className={`p-4 border rounded-lg ${
              plan.recommended ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-lg">{plan.name}</h4>
                  {plan.recommended && (
                    <Badge className="bg-purple-600 text-white">Recommended</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">{plan.price}/month</p>
                <p className="text-sm text-gray-600">{plan.posts} posts per month</p>
              </div>
              <Button 
                size="sm" 
                variant={plan.recommended ? 'default' : 'outline'}
                onClick={() => setLocation(`/subscription?plan=${plan.name.toLowerCase()}`)}
                aria-label={`Select ${plan.name} plan`}
              >
                Select
              </Button>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {hasActiveSubscription && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Subscription Active</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Your {subscriptionStatus.subscriptionPlan} plan is ready to use
          </p>
        </div>
      )}

      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-gray-600">
          {hasActiveSubscription ? 'Subscription configured' : 'Subscription required'}
        </div>
        <Button 
          onClick={onNext}
          disabled={!hasActiveSubscription}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          aria-label="Complete onboarding"
        >
          Complete Setup
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const CompletionStep = ({ onComplete }: { onComplete?: () => void }) => {
  const [, setLocation] = useLocation();

  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-white" />
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Your TheAgencyIQ account is ready. You can now generate AI-powered content 
          for your Queensland SME and start publishing to your connected platforms.
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg">
        <h4 className="font-semibold text-purple-900 mb-3">What's Next?</h4>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full" />
            <span>Generate your first AI content schedule</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full" />
            <span>Review and approve posts</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full" />
            <span>Monitor analytics and engagement</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          onClick={() => setLocation('/intelligent-schedule')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
          aria-label="Generate first AI content"
        >
          Generate First Content
        </Button>
        <Button 
          onClick={() => {
            onComplete?.();
            setLocation('/dashboard');
          }}
          variant="outline"
          className="px-8 py-3"
          aria-label="Go to dashboard"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export function OnboardingWizard({ onComplete, initialStep = 0 }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Introduction to TheAgencyIQ',
      component: WelcomeStep,
      completed: completedSteps.has(0),
      required: true
    },
    {
      id: 'oauth',
      title: 'Connect Platforms',
      description: 'Link your social media accounts',
      component: OAuthStep,
      completed: completedSteps.has(1),
      required: true,
      tooltip: 'OAuth connections allow secure posting to your social media accounts'
    },
    {
      id: 'brand-purpose',
      title: 'Brand Purpose',
      description: 'Define your business identity',
      component: BrandPurposeStep,
      completed: completedSteps.has(2),
      required: true,
      tooltip: 'Brand purpose helps AI generate content that matches your business values'
    },
    {
      id: 'subscription',
      title: 'Choose Plan',
      description: 'Select your subscription',
      component: SubscriptionStep,
      completed: completedSteps.has(3),
      required: true,
      tooltip: 'Your subscription determines how many AI posts you can generate monthly'
    },
    {
      id: 'completion',
      title: 'Complete',
      description: 'Setup finished',
      component: CompletionStep,
      completed: completedSteps.has(4),
      required: true
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Setup Your Account
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            
            <div className="flex justify-between items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => handleStepClick(index)}
                    disabled={index > currentStep && !completedSteps.has(index)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      index === currentStep 
                        ? 'bg-purple-600 text-white' 
                        : completedSteps.has(index)
                          ? 'bg-green-600 text-white'
                          : index < currentStep
                            ? 'bg-gray-400 text-white'
                            : 'bg-gray-200 text-gray-400'
                    }`}
                    aria-label={`Go to ${step.title} step`}
                  >
                    {completedSteps.has(index) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </button>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">{step.title}</div>
                    <div className="text-xs text-gray-500 hidden sm:block">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <CurrentStepComponent 
            onNext={handleNext}
            onPrevious={handlePrevious}
            onComplete={onComplete}
          />
          
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <div className="flex justify-between items-center mt-8 pt-4 border-t">
              <Button
                onClick={handlePrevious}
                variant="outline"
                className="flex items-center space-x-2"
                aria-label="Go to previous step"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
              
              <div className="text-sm text-gray-600">
                {steps[currentStep].tooltip && (
                  <ContextualTooltip 
                    term={steps[currentStep].title}
                    explanation={steps[currentStep].tooltip!}
                  >
                    <div className="flex items-center space-x-1">
                      <Info className="w-4 h-4" />
                      <span>Need help?</span>
                    </div>
                  </ContextualTooltip>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}