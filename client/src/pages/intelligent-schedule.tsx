import { useLocation } from "wouter";
import { Calendar, Clock, CheckCircle, XCircle, RotateCcw, Play, Eye, ThumbsUp, X, Sparkles, Brain, Target, Users, MapPin, Edit3, Save, Video, Plus, Trash2 } from "lucide-react";
import CalendarCard from "@/components/calendar-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format, addDays, startOfMonth, endOfMonth, isSameDay, isToday } from "date-fns";
import MasterHeader from "@/components/master-header";
import MasterFooter from "@/components/master-footer";
import BackButton from "@/components/back-button";
import { MetaPixelTracker } from "@/lib/meta-pixel";
import AutoPostingEnforcer from "@/components/auto-posting-enforcer";

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
  videoData?: {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
    style: string;
    status: 'generating' | 'completed' | 'failed';
  };
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
  const [editContent, setEditContent] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [approvedPosts, setApprovedPosts] = useState<Set<number>>(new Set());
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [approvingPosts, setApprovingPosts] = useState<Set<number>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    platform: string;
    postId: number;
    scheduledTime: string;
  } | null>(null);
  const [scheduleGenerated, setScheduleGenerated] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [calendarView, setCalendarView] = useState(true);
  const [queenslandEvents, setQueenslandEvents] = useState<any[]>([]);
  const [creatingVideo, setCreatingVideo] = useState<Set<number>>(new Set());
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedPostForVideo, setSelectedPostForVideo] = useState<Post | null>(null);

  const queryClient = useQueryClient();

  // Edit post content mutation
  const editPostMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      const response = await apiRequest("PUT", `/api/posts/${postId}`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setIsEditModalOpen(false);
      setEditingPost(null);
      setEditContent("");
      toast({
        title: "Content Updated",
        description: "Post content has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update post content. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Video creation mutation
  const createVideoMutation = useMutation({
    mutationFn: async ({ postId, script, style }: { postId: number; script: string; style: string }) => {
      const response = await apiRequest("POST", "/api/posts/video-generate", { 
        postId: postId.toString(),
        script,
        style
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Force refresh of posts data
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      refetchPosts();
      
      setCreatingVideo(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.postId);
        return newSet;
      });
      setShowVideoModal(false);
      setSelectedPostForVideo(null);
      toast({
        title: "Video Created Successfully",
        description: "Seedance 1.0 video has been generated and attached to your post. Refresh the page if you don't see it immediately.",
      });
    },
    onError: (error, variables) => {
      setCreatingVideo(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.postId);
        return newSet;
      });
      toast({
        title: "Video Creation Failed",
        description: "Failed to create video. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle video creation
  const handleCreateVideo = (post: Post) => {
    setSelectedPostForVideo(post);
    setShowVideoModal(true);
  };

  // Create video for post
  const createVideoForPost = (script: string, style: string = 'professional') => {
    if (selectedPostForVideo) {
      setCreatingVideo(prev => new Set(prev).add(selectedPostForVideo.id));
      createVideoMutation.mutate({
        postId: selectedPostForVideo.id,
        script,
        style
      });
    }
  };

  // Remove video from post
  const removeVideoFromPost = async (postId: number) => {
    try {
      const response = await apiRequest("DELETE", `/api/posts/${postId}/video`);
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        toast({
          title: "Video Removed",
          description: "Video has been removed from the post.",
        });
      }
    } catch (error) {
      toast({
        title: "Remove Failed",
        description: "Failed to remove video. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle edit content button click
  const handleEditPost = (post: Post) => {
    console.log('Edit clicked for', post.platform);
    setEditingPost({ id: post.id, content: post.content });
    setEditContent(post.content);
    setIsEditModalOpen(true);
  };

  // Save edited content
  const saveEditedContent = () => {
    if (editingPost) {
      editPostMutation.mutate({ postId: editingPost.id, content: editContent });
    }
  };

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch brand purpose data
  const { data: brandPurpose, isLoading: brandLoading } = useQuery<BrandPurpose>({
    queryKey: ["/api/brand-purpose"],
    enabled: !!user && !userLoading,
  });

  // Fetch subscription usage for quota-aware generation
  const { data: subscriptionUsage, isLoading: subscriptionLoading } = useQuery<SubscriptionUsage>({
    queryKey: ["/api/subscription-usage"],
    enabled: !!user && !userLoading,
  });

  // Fetch posts only after user is authenticated
  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ["/api/posts"],
    enabled: !!user && !userLoading,
    retry: 2,
    staleTime: 30000,
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

  // Layout synchronization with null checks for dimensions
  useEffect(() => {
    const handleLayoutSync = () => {
      try {
        const dimensions = {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1
        };
        
        // Add null check for dimensions
        if (dimensions && dimensions.width && dimensions.height) {
          // Apply mobile layout adjustments
          if (dimensions.width < 768) {
            console.log('Schedule layout adjusted for mobile');
            console.log('Mobile layout applied');
          }
          
          // Sync layout state
          const isMobile = dimensions.width < 768;
          const isTablet = dimensions.width >= 768 && dimensions.width < 1024;
          const isDesktop = dimensions.width >= 1024;
          
          // Apply responsive adjustments based on device type
          if (isMobile) {
            document.documentElement.style.setProperty('--schedule-columns', '1');
            document.documentElement.style.setProperty('--schedule-gap', '0.5rem');
          } else if (isTablet) {
            document.documentElement.style.setProperty('--schedule-columns', '2');
            document.documentElement.style.setProperty('--schedule-gap', '1rem');
          } else if (isDesktop) {
            document.documentElement.style.setProperty('--schedule-columns', '3');
            document.documentElement.style.setProperty('--schedule-gap', '1.5rem');
          }
        }
      } catch (error) {
        console.log('Layout sync error handled gracefully:', error);
      }
    };

    // Initial sync
    handleLayoutSync();
    
    // Add resize listener with null check
    const resizeListener = () => handleLayoutSync();
    window.addEventListener('resize', resizeListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeListener);
    };
  }, []);

  // Generate calendar dates for next 30 days with AEST timezone consistency
  const generateCalendarDates = () => {
    const dates = [];
    // Get current date in AEST timezone
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      // Ensure consistent AEST timezone for each generated date
      const aestDate = new Date(date.toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
      dates.push(aestDate);
    }
    
    return dates;
  };

  const calendarDates = generateCalendarDates();

  // Group posts by date with AEST timezone consistency
  const getPostsForDate = (date: Date): Post[] => {
    // Convert to AEST timezone for consistent date comparison
    const aestDate = new Date(date.toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
    const dateStr = aestDate.toISOString().split('T')[0];
    
    return postsArray.filter(post => {
      if (!post.scheduledFor) return false;
      // Convert post scheduled date to AEST
      const postDate = new Date(post.scheduledFor);
      const aestPostDate = new Date(postDate.toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
      const postDateStr = aestPostDate.toISOString().split('T')[0];
      return postDateStr === dateStr;
    });
  };

  // Get Queensland events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return queenslandEvents.filter(event => event.date === dateStr);
  };

  // Approve and schedule individual post with loading state and success modal
  const approvePost = async (postId: number) => {
    // Find the post to get platform and scheduling details
    const post = postsArray.find(p => p.id === postId);
    if (!post) return;

    // Add to loading state
    setApprovingPosts(prev => new Set(prev).add(postId));

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
        
        // Show success modal with post details
        setSuccessModalData({
          platform: post.platform,
          postId: postId,
          scheduledTime: post.scheduledFor || 'immediately'
        });
        setShowSuccessModal(true);
        
        toast({
          title: "Post Approved Successfully",
          description: `${post.platform} post scheduled for publishing`,
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
    } finally {
      // Remove from loading state
      setApprovingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
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

      // Calculate dynamic total posts based on user's remaining quota
      const remainingPosts = subscriptionUsage?.remainingPosts || 0;
      const requestedPosts = Math.min(30, remainingPosts); // Cap at 30 or remaining posts
      
      console.log(`🎯 Dynamic quota-aware generation: ${requestedPosts} posts (${remainingPosts} remaining)`);

      // Generate AI-powered schedule
      const response = await fetch('/api/generate-ai-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          brandPurpose,
          totalPosts: requestedPosts, // Dynamic quota-aware limit
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

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
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
                {postsArray.map((post: Post) => (
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
                    
                    {/* Video Display Section */}
                    {post.videoData && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Video className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="font-medium text-blue-800">Seedance 1.0 Video</span>
                            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                              {post.videoData.duration}s • {post.videoData.style}
                            </Badge>
                          </div>
                          <Button
                            onClick={() => removeVideoFromPost(post.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {post.videoData.status === 'generating' ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3" />
                            <span className="text-blue-700">Generating video...</span>
                          </div>
                        ) : post.videoData.status === 'completed' ? (
                          <div className="space-y-3">
                            <div className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                                 onClick={() => window.open(post.videoData.videoUrl, '_blank')}>
                              <img 
                                src={post.videoData.thumbnailUrl} 
                                alt="Video thumbnail"
                                className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black bg-opacity-60 rounded-full p-3 transition-all group-hover:bg-opacity-70 group-hover:scale-110">
                                  <Play className="w-6 h-6 text-white" />
                                </div>
                              </div>
                              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                {post.videoData.duration}s
                              </div>
                            </div>
                            
                            {/* Video Approval Actions */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Video Ready
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  Seedance {post.videoData.seedanceVersion || '1.0'}
                                </span>
                              </div>
                              
                              <div className="flex space-x-1">
                                <Button
                                  onClick={() => handleCreateVideo(post)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Edit video"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => window.open(post.videoData.videoUrl, '_blank')}
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Preview video"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <p className="text-xs text-blue-600 font-medium">
                              Click thumbnail to view • Video will be included when post is approved
                            </p>
                          </div>
                        ) : (
                          <div className="text-red-600 text-sm">Video generation failed</div>
                        )}
                      </div>
                    )}
                    
                    {post.aiRecommendation && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start">
                          <Brain className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                          <p className="text-purple-800 text-sm">{post.aiRecommendation}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <Button
                        onClick={() => handleEditPost(post)}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Edit Content</span>
                        <span className="sm:hidden">Edit</span>
                      </Button>
                      
                      {/* Video Creation/Management Button */}
                      {!post.videoData ? (
                        <Button
                          onClick={() => handleCreateVideo(post)}
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto border-blue-200 text-blue-600 hover:bg-blue-50"
                          disabled={creatingVideo.has(post.id)}
                        >
                          {creatingVideo.has(post.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                              <span className="hidden sm:inline">Creating...</span>
                              <span className="sm:hidden">Creating...</span>
                            </>
                          ) : (
                            <>
                              <Video className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Add Video</span>
                              <span className="sm:hidden">Video</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleCreateVideo(post)}
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Edit Video</span>
                          <span className="sm:hidden">Edit Video</span>
                        </Button>
                      )}
                      
                      {post.status !== 'published' && (
                        <Button
                          onClick={() => approvePost(post.id)}
                          className={
                            post.status === 'approved' || approvedPosts.has(post.id)
                              ? "bg-gray-600 hover:bg-gray-700 text-white cursor-not-allowed w-full sm:w-auto"
                              : post.videoData 
                                ? "bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                                : "bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                          }
                          size="sm"
                          disabled={post.status === 'approved' || approvedPosts.has(post.id) || approvingPosts.has(post.id)}
                        >
                          {approvingPosts.has(post.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              <span className="hidden sm:inline">Approving...</span>
                              <span className="sm:hidden">Processing...</span>
                            </>
                          ) : (
                            <>
                              {post.videoData ? (
                                <Video className="w-4 h-4 mr-2" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              <span className="hidden sm:inline">
                                {post.status === 'approved' || approvedPosts.has(post.id) 
                                  ? 'Approved ✓' 
                                  : post.videoData 
                                    ? 'Approve with Video'
                                    : 'Approve & Schedule'
                                }
                              </span>
                              <span className="sm:hidden">
                                {post.status === 'approved' || approvedPosts.has(post.id) 
                                  ? 'Approved ✓' 
                                  : post.videoData 
                                    ? 'Approve + Video'
                                    : 'Approve'
                                }
                              </span>
                            </>
                          )}
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

        {/* Auto-Publishing Enforcer */}
        {postsArray.length > 0 && (
          <div className="mb-8">
            <AutoPostingEnforcer />
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
                disabled={isGeneratingSchedule}
              >
                {isGeneratingSchedule ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    <span className="hidden sm:inline">Generating AI Content...</span>
                    <span className="sm:hidden">Generating...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline">Generate AI Content</span>
                    <span className="sm:hidden">Generate</span>
                  </>
                )}
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

      {/* Edit Content Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Post Content</DialogTitle>
            <DialogDescription>
              Modify the content of your social media post before approval.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Post Content
              </label>
              <Textarea
                id="content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Enter your post content..."
                rows={8}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              disabled={editPostMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveEditedContent}
              disabled={editPostMutation.isPending}
            >
              {editPostMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Confirmation Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle className="w-6 h-6 mr-2" />
              Post Approved Successfully!
            </DialogTitle>
            <DialogDescription>
              Your post has been approved and added to your content schedule for publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            {successModalData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      {successModalData.platform === 'facebook' && (
                        <div className="w-6 h-6 bg-blue-600 rounded text-white flex items-center justify-center text-xs font-bold">f</div>
                      )}
                      {successModalData.platform === 'instagram' && (
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded text-white flex items-center justify-center text-xs font-bold">ig</div>
                      )}
                      {successModalData.platform === 'linkedin' && (
                        <div className="w-6 h-6 bg-blue-800 rounded text-white flex items-center justify-center text-xs font-bold">in</div>
                      )}
                      {successModalData.platform === 'youtube' && (
                        <div className="w-6 h-6 bg-red-600 rounded text-white flex items-center justify-center text-xs font-bold">yt</div>
                      )}
                      {successModalData.platform === 'x' && (
                        <div className="w-6 h-6 bg-black rounded text-white flex items-center justify-center text-xs font-bold">x</div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {successModalData.platform} Post Approved
                    </h3>
                    <p className="text-sm text-gray-600">
                      Post ID: {successModalData.postId}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white rounded-md p-4 border border-green-200">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Scheduled for: {new Date(successModalData.scheduledTime).toLocaleString('en-AU', {
                      timeZone: 'Australia/Brisbane',
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>Your post has been approved and will be automatically published at the scheduled time.</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              onClick={() => setShowSuccessModal(false)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Great!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Creation Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Video className="w-5 h-5 text-blue-600 mr-2" />
              Create Seedance 1.0 Video
            </DialogTitle>
            <DialogDescription>
              Generate a professional video using Seedance 1.0 for your {selectedPostForVideo?.platform} post.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Script</label>
              <Textarea
                id="videoScript"
                placeholder="Enter your video script or use the post content..."
                defaultValue={selectedPostForVideo?.content || ""}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Tip: Use your post content or create a custom script for the video
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Style</label>
              <select 
                id="videoStyle"
                className="w-full p-2 border border-gray-300 rounded-md"
                defaultValue="professional"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="dynamic">Dynamic</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <Video className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-blue-800 text-sm">
                  <p className="font-medium mb-1">Seedance 1.0 Features:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Professional 1080p HD video generation</li>
                    <li>• Automatic thumbnail creation</li>
                    <li>• 15-30 second optimized duration</li>
                    <li>• Platform-specific formatting</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowVideoModal(false)}
              disabled={createVideoMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const script = (document.getElementById('videoScript') as HTMLTextAreaElement)?.value || selectedPostForVideo?.content || "";
                const style = (document.getElementById('videoStyle') as HTMLSelectElement)?.value || "professional";
                createVideoForPost(script, style);
              }}
              disabled={createVideoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createVideoMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Video...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Create Video
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MasterFooter />
    </div>
  );
}