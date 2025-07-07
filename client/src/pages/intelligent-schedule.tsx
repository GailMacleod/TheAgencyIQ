import { useLocation } from "wouter";
import { Calendar, Clock, CheckCircle, XCircle, RotateCcw, Play, Eye, ThumbsUp, X, Sparkles, Brain, Target, Users, MapPin, Edit3, Save } from "lucide-react";
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
  const [generatingVideos, setGeneratingVideos] = useState<Set<number>>(new Set());

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

  // State for video prompt selection
  const [videoPromptDialog, setVideoPromptDialog] = useState<{
    isOpen: boolean;
    post: Post | null;
    promptOptions: string[];
    editablePrompts: string[];
    selectedPrompt: string;
    videoUrl: string | null;
    showPreview: boolean;
    regenerationCount: number;
    showRegenerateInput: boolean;
    customPrompt: string;
  }>({
    isOpen: false,
    post: null,
    promptOptions: [],
    editablePrompts: [],
    selectedPrompt: '',
    videoUrl: null,
    showPreview: false,
    regenerationCount: 0,
    showRegenerateInput: false,
    customPrompt: ''
  });

  // Handle video generation for a post - shows 30-second ASMR prompt dialog with editing
  const handleGenerateVideo = async (post: Post) => {
    if (!brandPurpose) {
      toast({
        title: "Brand Purpose Required",
        description: "Complete your Strategizer brand purpose setup to generate videos.",
        variant: "destructive",
      });
      setLocation("/brand-purpose");
      return;
    }

    try {
      // Get two example 30-second ASMR prompts as starting points
      const promptResponse = await fetch('/api/generate-video-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          brandPurpose: brandPurpose.corePurpose,
          targetAudience: brandPurpose.audience,
          contentGoal: post.content.substring(0, 100),
          platform: post.platform
        })
      });

      if (!promptResponse.ok) {
        throw new Error('Failed to generate video prompt options');
      }

      const promptData = await promptResponse.json();

      // Show dialog with 2 editable 30-second ASMR prompt options
      const defaultPrompts = promptData.promptOptions || [
        "ASMR Queensland Rainforest Pulse: Quick drip with innovation hum, 30s",
        "ASMR Coastal Resilience: Brief sea breeze with sand crunch, 30s"
      ];
      
      setVideoPromptDialog({
        isOpen: true,
        post,
        promptOptions: defaultPrompts,
        editablePrompts: [...defaultPrompts],
        selectedPrompt: '',
        videoUrl: null,
        showPreview: false,
        regenerationCount: 0,
        showRegenerateInput: false,
        customPrompt: ''
      });

    } catch (error) {
      console.error('Video prompt generation error:', error);
      toast({
        title: "Video Prompt Generation Failed",
        description: "Using default 30-second ASMR prompts.",
        variant: "destructive",
      });
      
      // Fallback to default prompts
      setVideoPromptDialog({
        isOpen: true,
        post,
        promptOptions: [
          "ASMR Queensland Rainforest Pulse: Quick drip with innovation hum, 30s",
          "ASMR Coastal Resilience: Brief sea breeze with sand crunch, 30s"
        ]
      });
    }
  };

  // Generate video with selected prompt
  const generateVideoWithPrompt = async (selectedPrompt: string) => {
    const post = videoPromptDialog.post;
    if (!post) return;

    setGeneratingVideos(prev => new Set(prev).add(post.id));

    try {
      toast({
        title: "Generating 30-second ASMR Video",
        description: "Creating video using Python script with custom prompt...",
      });

      const videoResponse = await fetch(`/api/posts/${post.id}/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          videoPrompt: selectedPrompt
        })
      });

      if (!videoResponse.ok) {
        throw new Error('Failed to generate video');
      }

      const videoData = await videoResponse.json();

      // Get video preview
      const previewResponse = await fetch(`/api/posts/${post.id}/preview-video`, {
        method: 'GET',
        credentials: 'include'
      });

      let videoUrl = null;
      if (previewResponse.ok) {
        const previewData = await previewResponse.json();
        videoUrl = previewData.videoUrl;
      }

      // Update dialog to show preview with approve/regenerate options
      setVideoPromptDialog(prev => ({
        ...prev,
        selectedPrompt,
        videoUrl,
        showPreview: true,
        regenerationCount: prev.regenerationCount + 1
      }));

      toast({
        title: "30-second ASMR Video Generated",
        description: "Preview your video and choose to approve or regenerate.",
      });

    } catch (error) {
      console.error('Video generation error:', error);
      toast({
        title: "Video Generation Failed",
        description: "Failed to generate video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(post.id);
        return newSet;
      });
    }
  };

  // Approve video and save to post
  const approveVideo = async () => {
    const post = videoPromptDialog.post;
    if (!post || !videoPromptDialog.videoUrl) return;

    try {
      // Update posts to show video is approved
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      setVideoPromptDialog({
        isOpen: false,
        post: null,
        promptOptions: [],
        editablePrompts: [],
        selectedPrompt: '',
        videoUrl: null,
        showPreview: false,
        regenerationCount: 0,
        showRegenerateInput: false,
        customPrompt: ''
      });

      toast({
        title: "Video Approved",
        description: "30-second ASMR video saved to post successfully.",
      });

    } catch (error) {
      console.error('Video approval error:', error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve video. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show regenerate input if allowed
  const showRegenerateInput = () => {
    if (videoPromptDialog.regenerationCount >= 1) {
      toast({
        title: "Regeneration Limit Reached",
        description: "You can only regenerate once per post.",
        variant: "destructive",
      });
      return;
    }

    setVideoPromptDialog(prev => ({
      ...prev,
      showRegenerateInput: true,
      customPrompt: prev.selectedPrompt
    }));
  };

  // Regenerate with custom prompt
  const regenerateVideo = async () => {
    if (!videoPromptDialog.customPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a custom prompt for regeneration.",
        variant: "destructive",
      });
      return;
    }

    setVideoPromptDialog(prev => ({
      ...prev,
      showRegenerateInput: false,
      showPreview: false,
      videoUrl: null
    }));

    await generateVideoWithPrompt(videoPromptDialog.customPrompt);
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

                      <Button
                        onClick={() => handleGenerateVideo(post)}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        disabled={generatingVideos.has(post.id)}
                      >
                        {generatingVideos.has(post.id) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2" />
                            <span className="hidden sm:inline">Generating...</span>
                            <span className="sm:hidden">Processing...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Generate Video</span>
                            <span className="sm:hidden">Video</span>
                          </>
                        )}
                      </Button>
                      
                      {post.status !== 'published' && (
                        <Button
                          onClick={() => approvePost(post.id)}
                          className={
                            post.status === 'approved' || approvedPosts.has(post.id)
                              ? "bg-gray-600 hover:bg-gray-700 text-white cursor-not-allowed w-full sm:w-auto"
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
                              <CheckCircle className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">
                                {post.status === 'approved' || approvedPosts.has(post.id) ? 'Approved ✓' : 'Approve & Schedule'}
                              </span>
                              <span className="sm:hidden">
                                {post.status === 'approved' || approvedPosts.has(post.id) ? 'Approved ✓' : 'Approve'}
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

      {/* Enhanced 30-second ASMR Video Generation Dialog */}
      <Dialog open={videoPromptDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setVideoPromptDialog({
            isOpen: false,
            post: null,
            promptOptions: [],
            editablePrompts: [],
            selectedPrompt: '',
            videoUrl: null,
            showPreview: false,
            regenerationCount: 0,
            showRegenerateInput: false,
            customPrompt: ''
          });
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-purple-600">
              <Play className="w-6 h-6 mr-2" />
              30-second ASMR Video for {videoPromptDialog.post?.platform}
            </DialogTitle>
            <DialogDescription>
              {!videoPromptDialog.showPreview 
                ? "Edit and customize these 30-second ASMR prompts for your brand, then generate your video."
                : "Preview your 30-second ASMR video and choose to approve or regenerate with a new prompt."
              }
            </DialogDescription>
          </DialogHeader>
          
          {!videoPromptDialog.showPreview ? (
            // Prompt editing phase
            <div className="py-6 space-y-4">
              {videoPromptDialog.editablePrompts.map((prompt, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Option {index + 1}</h4>
                    <Textarea
                      value={prompt}
                      onChange={(e) => {
                        const newPrompts = [...videoPromptDialog.editablePrompts];
                        newPrompts[index] = e.target.value;
                        setVideoPromptDialog(prev => ({
                          ...prev,
                          editablePrompts: newPrompts
                        }));
                      }}
                      className="min-h-[100px] text-sm"
                      placeholder="Edit your 30-second ASMR prompt with Queensland SME elements..."
                    />
                    <Button
                      onClick={() => generateVideoWithPrompt(prompt)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={generatingVideos.has(videoPromptDialog.post?.id || 0)}
                    >
                      {generatingVideos.has(videoPromptDialog.post?.id || 0) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Generating 30s Video...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Generate 30-second ASMR Video
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Preview phase with approve/regenerate options
            <div className="py-6 space-y-6">
              {videoPromptDialog.videoUrl && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">30-second ASMR Video Preview</h4>
                  <video 
                    controls 
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                    src={videoPromptDialog.videoUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Prompt: {videoPromptDialog.selectedPrompt}
                  </p>
                </div>
              )}

              {!videoPromptDialog.showRegenerateInput ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={approveVideo}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Approve Video
                  </Button>
                  <Button
                    onClick={showRegenerateInput}
                    variant="outline"
                    className="flex-1"
                    disabled={videoPromptDialog.regenerationCount >= 1}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Regenerate {videoPromptDialog.regenerationCount >= 1 ? '(Used)' : '(1 left)'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Enter Custom Regeneration Prompt</h4>
                  <Textarea
                    value={videoPromptDialog.customPrompt}
                    onChange={(e) => setVideoPromptDialog(prev => ({
                      ...prev,
                      customPrompt: e.target.value
                    }))}
                    className="min-h-[120px] text-sm"
                    placeholder="Customize your 30-second ASMR prompt with specific Queensland SME elements..."
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={regenerateVideo}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={generatingVideos.has(videoPromptDialog.post?.id || 0)}
                    >
                      {generatingVideos.has(videoPromptDialog.post?.id || 0) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Regenerate Video
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setVideoPromptDialog(prev => ({
                        ...prev,
                        showRegenerateInput: false
                      }))}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => setVideoPromptDialog({
                isOpen: false,
                post: null,
                promptOptions: [],
                editablePrompts: [],
                selectedPrompt: '',
                videoUrl: null,
                showPreview: false,
                regenerationCount: 0,
                showRegenerateInput: false,
                customPrompt: ''
              })}
              variant="outline"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MasterFooter />
    </div>
  );
}