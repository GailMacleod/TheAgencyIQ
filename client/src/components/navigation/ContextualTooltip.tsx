import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, X, Info } from 'lucide-react';

interface ContextualTooltipProps {
  term: string;
  explanation: string;
  children: React.ReactNode;
  trigger?: 'hover' | 'click';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function ContextualTooltip({ 
  term, 
  explanation, 
  children, 
  trigger = 'hover',
  position = 'top'
}: ContextualTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-gray-900 border-l-4 border-r-4 border-t-4',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-gray-900 border-l-4 border-r-4 border-b-4',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-gray-900 border-t-4 border-b-4 border-l-4',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-gray-900 border-t-4 border-b-4 border-r-4'
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="cursor-help">
        {children}
      </div>

      {isVisible && (
        <>
          {/* Backdrop for click-triggered tooltips */}
          {trigger === 'click' && (
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsVisible(false)}
            />
          )}

          {/* Tooltip */}
          <div className={`absolute z-20 ${positionClasses[position]}`}>
            <Card className="shadow-lg border-2 border-gray-800 bg-gray-900 text-white max-w-xs">
              <CardContent className="p-4">
                <div className="flex items-start justify-between space-x-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Info className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-sm text-blue-400">
                        {term}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed">
                      {explanation}
                    </p>
                  </div>
                  
                  {trigger === 'click' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVisible(false);
                      }}
                      className="p-1 h-auto text-gray-400 hover:text-white"
                      aria-label="Close tooltip"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Arrow */}
            <div className={`absolute ${arrowClasses[position]}`} />
          </div>
        </>
      )}
    </div>
  );
}

// Pre-built tooltip configurations for common terms
export const tooltipConfigs = {
  'quota-deduction': {
    term: 'Quota Deduction',
    explanation: 'Posts only count against your monthly quota when they are actually published to social media platforms. Drafts, approvals, and edits are free.'
  },
  'oauth-connection': {
    term: 'OAuth Connection',
    explanation: 'OAuth allows TheAgencyIQ to securely post to your social media accounts without storing your passwords. Connections may need periodic refresh.'
  },
  'brand-purpose': {
    term: 'Brand Purpose',
    explanation: 'Your brand purpose helps our AI generate content that matches your business values and resonates with your Queensland audience.'
  },
  'ai-content-generation': {
    term: 'AI Content Generation',
    explanation: 'Our AI uses your brand purpose and Queensland market data to create engaging, platform-specific content for your business.'
  },
  'platform-publishing': {
    term: 'Platform Publishing',
    explanation: 'Content is automatically formatted for each platform (Facebook, Instagram, LinkedIn, X, YouTube) with appropriate hashtags and character limits.'
  },
  'subscription-plan': {
    term: 'Subscription Plan',
    explanation: 'Your plan determines how many AI-generated posts you can publish per month. Unused posts don\'t roll over.'
  },
  'analytics-tracking': {
    term: 'Analytics Tracking',
    explanation: 'We track engagement metrics from your published posts to help you understand what content performs best with your audience.'
  },
  'queensland-focus': {
    term: 'Queensland Focus',
    explanation: 'Content is optimized for Queensland SME audiences with local events, Brisbane Ekka coverage, and regional business insights.'
  }
};

// Helper component for common tooltips
export function QuickTooltip({ 
  configKey, 
  children, 
  trigger = 'hover' 
}: { 
  configKey: keyof typeof tooltipConfigs;
  children: React.ReactNode;
  trigger?: 'hover' | 'click';
}) {
  const config = tooltipConfigs[configKey];
  
  return (
    <ContextualTooltip 
      term={config.term}
      explanation={config.explanation}
      trigger={trigger}
    >
      {children}
    </ContextualTooltip>
  );
}