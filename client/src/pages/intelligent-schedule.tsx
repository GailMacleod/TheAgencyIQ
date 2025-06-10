import { useLocation } from "wouter";
import { Calendar, Clock, CheckCircle, XCircle, RotateCcw, Play, Eye, ThumbsUp, X, Sparkles, Brain, Target, Users, MapPin } from "lucide-react";
import CalendarCard from "@/components/calendar-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format, addDays, startOfMonth, endOfMonth, isSameDay, isToday } from "date-fns";
import MasterHeader from "@/components/master-header";
import MasterFooter from "@/components/master-footer";
import BackButton from "@/components/back-button";

interface Post {
  id: number;
  platform: string;
  content: string;
  status: string;
  scheduledFor: string;
  publishedAt?: string;
  errorLog?: string;
  aiRecommendation?: string;
  aiScore?: number;
  localEvent?: string;
  analytics?: {
    reach: number;
    engagement: number;
    impressions: number;
  };
}

interface User {
  id: number;
  email: string;
  phone: string;
  subscriptionPlan: string;
  remainingPosts: number;
  totalPosts: number;
}

interface SubscriptionUsage {
  subscriptionPlan: string;
  totalAllocation: number;
  remainingPosts: number;
  usedPosts: number;
  publishedPosts: number;
  failedPosts: number;
  partialPosts: number;
  planLimits: {
    posts: number;
    reach: number;
    engagement: number;
  };
  usagePercentage: number;
}

interface BrandPurpose {
  id: number;
  brandName: string;
  productsServices: string;
  corePurpose: string;
  audience: string;
  jobToBeDone: string;
  motivations: string;
  painPoints: string;
  goals: any;
  contactDetails: any;
}

interface AIScheduleData {
  posts: Post[];
  analysis: {
    jtbdScore: number;
    platformWeighting: { [platform: string]: number };
    tone: string;
    postTypeAllocation: { [type: string]: number };
    suggestions: string[];
  };
  schedule: {
    optimalTimes: { [platform: string]: string[] };
    eventAlignment: string[];
    contentThemes: string[];
  };
}

export default function IntelligentSchedule() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<{id: number, content: string} | null>(null);
  const [approvedPosts, setApprovedPosts] = useState<Set<number>>(new Set());
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [scheduleGenerated, setScheduleGenerated] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [calendarView, setCalendarView] = useState(true);
  const [queenslandEvents, setQueenslandEvents] = useState<any[]>([]);

  const queryClient = useQueryClient();

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch brand purpose data
  const { data: brandPurpose, isLoading: brandLoading } = useQuery<BrandPurpose>({
    queryKey: ["/api/brand-purpose"],
    enabled: !!user && !userLoading,
  });

  // Fetch posts only after user is authenticated
  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ["/api/posts"],
    enabled: !!user && !userLoading,
    retry: 2,
    staleTime: 30000,
  });

  // Fetch subscription status for post limits
  const { data: subscriptionUsage } = useQuery<SubscriptionUsage>({
    queryKey: ["/api/subscription-usage"],
    enabled: !!user && !userLoading,
  });

  // Type-safe posts array
  const postsArray: Post[] = Array.isArray(posts) ? posts : [];

  // Fetch Queensland events for calendar optimization
  useEffect(() => {
    const fetchQueenslandEvents = async () => {
      try {
        const response = await fetch('/api/queensland-events');
        if (response.ok) {
          const events = await response.json();
          setQueenslandEvents(events);
        }
      } catch (error) {
        console.log('Queensland events unavailable, using basic calendar');
      }
    };
    
    fetchQueenslandEvents();
  }, []);

  // Generate calendar dates for next 30 days
  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const calendarDates = generateCalendarDates();

  // Group posts by date
  const getPostsForDate = (date: Date): Post[] => {
    const dateStr = date.toISOString().split('T')[0];
    return postsArray.filter(post => {
      const postDate = new Date(post.scheduledFor).toISOString().split('T')[0];
      return postDate === dateStr;
    });
  };

  // Get Queensland events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return queenslandEvents.filter(event => event.date === dateStr);
  };

  // Approve and schedule individual post
  const approvePost = async (postId: number) => {
    try {
      const response = await fetch('/api/approve-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ postId })
      });

      if (response.ok) {
        setApprovedPosts(prev => {
          const newSet = new Set(prev);
          newSet.add(postId);
          return newSet;
        });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        
        toast({
          title: "Post Approved",
          description: "Post has been approved and scheduled for publishing.",
        });
      } else {
        throw new Error('Failed to approve post');
      }
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve post. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate AI-powered content schedule
  const generateIntelligentSchedule = async () => {
    if (!brandPurpose) {
      toast({
        title: "Brand Purpose Required",
        description: "Please complete your brand purpose setup first.",
        variant: "destructive",
      });
      setLocation("/brand-purpose");
      return;
    }

    // Check subscription limits before generating
    if (subscriptionUsage && subscriptionUsage.remainingPosts <= 0) {
      toast({
        title: "Post Limit Reached",
        description: `You've used all ${subscriptionUsage.totalAllocation} posts for this billing cycle. Upgrade your plan or wait for next cycle.`,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingSchedule(true);
    
    try {
      toast({
        title: "AI Analysis in Progress",
        description: "Analyzing your brand purpose and generating intelligent content...",
      });

      // Generate AI-powered schedule
      const response = await fetch('/api/generate-ai-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          brandPurpose,
          totalPosts: 30, // 30-day schedule
          platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
        })
      });

      if (response.ok) {
        const aiScheduleData: AIScheduleData = await response.json();
        
        // Store AI insights
        setAiInsights(aiScheduleData.analysis);
        setScheduleGenerated(true);
        
        toast({
          title: "Intelligent Schedule Generated",
          description: `Created ${aiScheduleData.posts.length} AI-optimized posts with JTBD score: ${aiScheduleData.analysis.jtbdScore}/100`,
        });

        // Refresh posts to show new schedule
        refetchPosts();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate schedule');
      }
    } catch (error: any) {
      console.error('Error generating AI schedule:', error);
      toast({
        title: "Schedule Generation Failed",
        description: error.message || "Failed to generate intelligent schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  // Auto-post entire intelligent schedule
  const autoPostIntelligentSchedule = async () => {
    try {
      toast({
        title: "Publishing Intelligent Schedule",
        description: "Auto-posting all AI-optimized content to your platforms...",
      });

      const response = await fetch('/api/auto-post-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Intelligent Schedule Published",
          description: `${result.successCount}/${result.totalPosts} AI-optimized posts published successfully`,
        });

        refetchPosts();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to auto-post schedule');
      }
    } catch (error: any) {
      console.error('Error auto-posting schedule:', error);
      toast({
        title: "Auto-posting Error",
        description: error.message || "Failed to auto-post schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Platform icons
  const getPlatformIcon = (platform: string) => {
    const iconClass = "w-4 h-4";
    switch (platform.toLowerCase()) {
      case 'facebook': return <div className={`${iconClass} bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold`}>f</div>;
      case 'instagram': return <div className={`${iconClass} bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded flex items-center justify-center text-xs font-bold`}>ig</div>;
      case 'linkedin': return <div className={`${iconClass} bg-blue-700 text-white rounded flex items-center justify-center text-xs font-bold`}>in</div>;
      case 'x': return <div className={`${iconClass} bg-black text-white rounded flex items-center justify-center text-xs font-bold`}>x</div>;
      case 'youtube': return <div className={`${iconClass} bg-red-600 text-white rounded flex items-center justify-center text-xs font-bold`}>yt</div>;
      default: return <div className={`${iconClass} bg-gray-500 text-white rounded flex items-center justify-center text-xs`}>?</div>;
    }
  };

  // Show loading states
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please wait while we authenticate your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MasterHeader showUserMenu={true} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <BackButton to="/brand-purpose" label="Back to Brand Purpose" />
        </div>
        
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600">Step 3 of 3</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-purple-600 h-2 rounded-full w-full"></div>
          </div>
        </div>

        {/* AI Intelligence Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">
              AI-Powered Content Schedule
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-500 ml-3" />
          </div>
          <p className="text-gray-600 text-lg mb-6">
            xAI analyzes your brand purpose, audience insights, and Queensland market data to create intelligent, strategic content
          </p>

          {/* Brand Purpose Status */}
          {brandPurpose ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Brand Purpose Connected</span>
              </div>
              <p className="text-green-700 text-sm">
                <strong>{brandPurpose.brandName}</strong> targeting <strong>{brandPurpose.audience}</strong>
              </p>
              <p className="text-green-600 text-sm mt-1">
                Job to be Done: {brandPurpose.jobToBeDone}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">Brand Purpose Required</span>
              </div>
              <p className="text-yellow-700 text-sm mb-3">
                Complete your brand purpose to enable AI content generation
              </p>
              <Button
                onClick={() => setLocation("/brand-purpose")}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Complete Brand Purpose
              </Button>
            </div>
          )}

          {/* AI Analysis Insights */}
          {aiInsights && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900">JTBD Score</h3>
                  <p className="text-2xl font-bold text-blue-600">{aiInsights.jtbdScore}/100</p>
                  <p className="text-xs text-gray-500">Strategic clarity</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900">Tone</h3>
                  <p className="text-lg font-medium text-green-600 capitalize">{aiInsights.tone}</p>
                  <p className="text-xs text-gray-500">Content style</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Sparkles className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900">Platform Focus</h3>
                  <p className="text-lg font-medium text-purple-600">
                    {Object.entries(aiInsights.platformWeighting)
                      .sort(([,a], [,b]) => (b as number) - (a as number))[0][0]}
                  </p>
                  <p className="text-xs text-gray-500">Primary platform</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!scheduleGenerated ? (
              <Button
                onClick={generateIntelligentSchedule}
                disabled={!brandPurpose || isGeneratingSchedule}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
                size="lg"
              >
                {isGeneratingSchedule ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating AI Schedule...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-2" />
                    Generate AI-Powered Schedule
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={autoPostIntelligentSchedule}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Auto-Post Intelligent Schedule
              </Button>
            )}
          </div>
        </div>

        {/* Posts Loading State */}
        {postsLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your intelligent content...</p>
          </div>
        )}

        {/* AI-Generated Posts Display */}
        {!postsLoading && postsArray.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
                Your AI-Generated Content ({postsArray.length} posts)
              </h2>
              
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCalendarView(true)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    calendarView ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-1 inline" />
                  Calendar
                </button>
                <button
                  onClick={() => setCalendarView(false)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    !calendarView ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            {calendarView ? (
              // Calendar Grid View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {calendarDates.map((date, index) => {
                  const postsForDate = getPostsForDate(date);
                  const eventsForDate = getEventsForDate(date);
                  
                  return (
                    <CalendarCard
                      key={index}
                      date={date}
                      posts={postsForDate}
                      events={eventsForDate}
                    />
                  );
                })}
              </div>
            ) : (
              // List View
              <div className="grid gap-6">
                {postsArray.slice(0, 10).map((post: Post) => (
                <Card key={post.id} className="overflow-hidden border-l-4 border-purple-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getPlatformIcon(post.platform)}
                        <span className="font-medium text-gray-900 capitalize">{post.platform}</span>
                        <Badge variant={
                          post.status === 'published' ? 'default' : 
                          post.status === 'approved' ? 'secondary' : 'outline'
                        } className={
                          post.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' : ''
                        }>
                          {post.status === 'approved' ? 'Approved ✓' : post.status}
                        </Badge>
                        {post.aiScore && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            AI Score: {post.aiScore}/100
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(post.scheduledFor), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    
                    <p className="text-gray-800 mb-4 leading-relaxed">{post.content}</p>
                    
                    {post.aiRecommendation && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start">
                          <Brain className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                          <p className="text-purple-800 text-sm">{post.aiRecommendation}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => setEditingPost({id: post.id, content: post.content})}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Edit Content
                      </Button>
                      
                      {post.status !== 'published' && (
                        <Button
                          onClick={() => approvePost(post.id)}
                          className={
                            post.status === 'approved' || approvedPosts.has(post.id)
                              ? "bg-gray-600 hover:bg-gray-700 text-white cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          }
                          size="sm"
                          disabled={post.status === 'approved' || approvedPosts.has(post.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {post.status === 'approved' || approvedPosts.has(post.id) ? 'Approved ✓' : 'Approve & Schedule'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!postsLoading && postsArray.length === 0 && !isGeneratingSchedule && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No AI Content Generated Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Generate your intelligent content schedule using xAI analysis of your brand purpose and audience insights.
            </p>
            {brandPurpose ? (
              <Button
                onClick={generateIntelligentSchedule}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="lg"
              >
                <Brain className="w-5 h-5 mr-2" />
                Generate AI Content
              </Button>
            ) : (
              <Button
                onClick={() => setLocation("/brand-purpose")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Target className="w-5 h-5 mr-2" />
                Complete Brand Purpose First
              </Button>
            )}
          </div>
        )}
      </div>

      <MasterFooter />
    </div>
  );
}