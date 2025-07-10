import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { QuickActionsPanel } from '@/components/navigation/QuickActionsPanel';
import { PlatformStatusWidget } from '@/components/navigation/PlatformStatusWidget';
import { EnhancedDashboard } from '@/components/navigation/EnhancedDashboard';
import { InteractiveGuide, dashboardGuide } from '@/components/onboarding/InteractiveGuide';
import { 
  Calendar,
  BarChart3,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Rocket,
  Target,
  Zap
} from 'lucide-react';

export default function EnhancedDashboardPage() {
  const [, setLocation] = useLocation();
  const [showGuide, setShowGuide] = useState(false);

  // Data queries
  const { data: user } = useQuery({ queryKey: ['/api/user'] });
  const { data: quotaData } = useQuery({ queryKey: ['/api/subscription-usage'] });
  const { data: recentPosts } = useQuery({ queryKey: ['/api/posts?limit=5'] });
  const { data: platformStatus } = useQuery({ queryKey: ['/api/oauth-status'] });
  const { data: brandPurpose } = useQuery({ queryKey: ['/api/brand-purpose'] });

  // Check if this is first visit
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('dashboard_guide_seen');
    const isFirstVisit = !hasSeenGuide;
    
    if (isFirstVisit) {
      setShowGuide(true);
    }
  }, []);

  // Onboarding completion check
  const isOnboardingComplete = () => {
    const hasConnectedPlatforms = platformStatus?.platforms?.some(p => p.connected);
    const hasBrandPurpose = brandPurpose?.brandName && brandPurpose?.corePurpose;
    const hasSubscription = quotaData?.subscriptionActive;
    
    return hasConnectedPlatforms && hasBrandPurpose && hasSubscription;
  };

  const handleGuideComplete = () => {
    localStorage.setItem('dashboard_guide_seen', 'true');
    setShowGuide(false);
  };

  const connectedPlatforms = platformStatus?.platforms?.filter(p => p.connected) || [];
  const completionProgress = [
    { step: 'Platform Connections', completed: connectedPlatforms.length >= 2, weight: 25 },
    { step: 'Brand Purpose', completed: !!brandPurpose?.brandName, weight: 25 },
    { step: 'Subscription', completed: !!quotaData?.subscriptionActive, weight: 25 },
    { step: 'First Content', completed: (recentPosts?.length || 0) > 0, weight: 25 }
  ];

  const overallProgress = completionProgress.reduce((acc, item) => 
    acc + (item.completed ? item.weight : 0), 0
  );

  if (!isOnboardingComplete()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="container mx-auto p-6">
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center space-x-2">
                <Rocket className="w-6 h-6 text-purple-600" />
                <span>Complete Your Setup</span>
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Finish setting up your TheAgencyIQ account to start generating content
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Setup Progress</span>
                  <span className="font-medium">{overallProgress}% Complete</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>

              <div className="space-y-3">
                {completionProgress.map((item) => (
                  <div key={item.step} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      {item.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                      )}
                      <span className={`font-medium ${item.completed ? 'text-green-900' : 'text-gray-900'}`}>
                        {item.step}
                      </span>
                    </div>
                    <Badge variant={item.completed ? 'default' : 'secondary'}>
                      {item.completed ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={() => setLocation('/onboarding')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
                  aria-label="Continue setup process"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Continue Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-guide="dashboard">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.email?.split('@')[0]}!
              </h1>
              <p className="text-gray-600 mt-2">
                Your Queensland SME social media automation dashboard
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowGuide(true)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                aria-label="Show interactive guide"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Help Guide</span>
              </Button>
              
              <Badge className="bg-green-100 text-green-800 px-3 py-1">
                <Zap className="w-3 h-3 mr-1" />
                All Systems Ready
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <QuickActionsPanel 
              remainingPosts={quotaData?.remainingPosts || 0}
              totalPosts={quotaData?.totalAllocation || 52}
            />
            
            {/* Content Calendar Preview */}
            <Card data-guide="content-calendar">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span>Recent Content</span>
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setLocation('/schedule')}
                    aria-label="View full content calendar"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentPosts?.length > 0 ? (
                  <div className="space-y-3">
                    {recentPosts.slice(0, 3).map((post: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {post.platform} - {post.content?.substring(0, 40)}...
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {post.scheduledFor ? new Date(post.scheduledFor).toLocaleDateString() : 'Draft'}
                          </div>
                        </div>
                        <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                          {post.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No content generated yet</p>
                    <Button 
                      onClick={() => setLocation('/intelligent-schedule')}
                      className="mt-3"
                      aria-label="Generate your first content"
                    >
                      Generate Your First Content
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Status & Analytics */}
          <div className="space-y-6">
            <PlatformStatusWidget />
            
            {/* Analytics Summary */}
            <Card data-guide="analytics">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <span>Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <Badge variant="outline">
                      {quotaData?.usedPosts || 0} posts published
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">
                        {connectedPlatforms.length}
                      </div>
                      <div className="text-xs text-blue-700">Platforms</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">
                        {quotaData?.remainingPosts || 0}
                      </div>
                      <div className="text-xs text-green-700">Posts Left</div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation('/yearly-analytics')}
                    aria-label="View detailed analytics"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Brand Purpose Summary */}
            {brandPurpose?.brandName && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    <span>Brand Focus</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-medium text-gray-900">{brandPurpose.brandName}</div>
                    <p className="text-sm text-gray-600">
                      {brandPurpose.corePurpose?.substring(0, 100)}...
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setLocation('/brand-purpose')}
                      aria-label="Edit brand purpose"
                    >
                      Edit Purpose
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Guide */}
      <InteractiveGuide
        steps={dashboardGuide}
        isActive={showGuide}
        onComplete={handleGuideComplete}
        onDismiss={() => setShowGuide(false)}
      />
    </div>
  );
}