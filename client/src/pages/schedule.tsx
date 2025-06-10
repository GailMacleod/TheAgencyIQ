import { useLocation } from "wouter";
import { Calendar, Clock, CheckCircle, XCircle, RotateCcw, Play, Eye, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format, addDays, startOfMonth, endOfMonth, isSameDay, isToday } from "date-fns";
import MasterHeader from "@/components/master-header";
import MasterFooter from "@/components/master-footer";
import BackButton from "@/components/back-button";
import BrandSync from "@/components/Schedule";

interface Post {
  id: number;
  platform: string;
  content: string;
  status: string;
  scheduledFor: string;
  publishedAt?: string;
  errorLog?: string;
  aiRecommendation?: string;
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

interface CalendarDay {
  date: Date;
  posts: Post[];
  aiInsight?: string;
  localEvents?: string[];
  isOptimalDay: boolean;
}

export default function Schedule() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showAIThinking, setShowAIThinking] = useState(false);
  const [aiStep, setAIStep] = useState(0);
  const [generatedPosts, setGeneratedPosts] = useState<Post[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<Set<number>>(new Set());
  const [editingPost, setEditingPost] = useState<{id: number, content: string} | null>(null);

  // Initialize brand sync component
  const brandSync = BrandSync();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (selectedDay && !target.closest('.fixed.z-50')) {
        setSelectedDay(null);
      }
    };

    if (selectedDay) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [selectedDay]);

  // Handle day selection for dropdown
  const handleDayClick = (date: Date) => {
    if (selectedDay && isSameDay(selectedDay, date)) {
      setSelectedDay(null); // Close dropdown if same day clicked
    } else {
      setSelectedDay(date); // Open dropdown for selected day
    }
  };

  // Edit post content
  const saveEditedPost = async (postId: number, newContent: string) => {
    try {
      // Update local state
      setGeneratedPosts(prev => 
        prev.map(post => 
          post.id === postId 
            ? { ...post, content: newContent }
            : post
        )
      );

      // Update database if post exists there
      const existingPost = posts?.find(p => p.id === postId);
      if (existingPost) {
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ content: newContent })
        });

        if (response.ok) {
          refetchPosts();
        }
      }

      setEditingPost(null);
      toast({
        title: "Post Updated",
        description: "Content has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving edited post:', error);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    }
  };

  // Approve post for specific day
  const approvePostForDay = async (dayDate: Date, postId?: number, publishNow?: boolean) => {
    try {
      // Find posts for this day or create a new one
      const dayPosts = generatedPosts.filter(post => 
        isSameDay(new Date(post.scheduledFor), dayDate)
      );

      if (dayPosts.length > 0) {
        // Approve existing post
        const postToApprove = postId ? 
          dayPosts.find(p => p.id === postId) : 
          dayPosts[0];
        
        if (postToApprove) {
          await approvePost(postToApprove.id, publishNow);
        }
      } else {
        // Create and approve a new post for this day
        const newPost: Post = {
          id: Date.now() + Math.random(),
          platform: 'facebook',
          content: `Auto-generated content for ${format(dayDate, 'MMMM d, yyyy')}`,
          status: 'approved',
          scheduledFor: dayDate.toISOString(),
          aiRecommendation: 'Optimized for daily engagement'
        };

        setGeneratedPosts(prev => [...prev, newPost]);
        setApprovedPosts(prev => {
          const newSet = new Set(prev);
          newSet.add(newPost.id);
          return newSet;
        });
        
        toast({
          title: publishNow ? "Post Created & Published" : "Post Created & Approved",
          description: `Content ${publishNow ? 'published' : 'scheduled'} for ${format(dayDate, 'MMM d')}`,
        });
      }
    } catch (error) {
      console.error('Error approving post for day:', error);
      toast({
        title: "Error",
        description: "Failed to approve post for this day.",
        variant: "destructive",
      });
    }
  };

  // Handle post approval and publishing to social media platforms
  const approvePost = async (postId: number, shouldPublishNow: boolean = false) => {
    try {
      // Immediately update UI state
      setApprovedPosts(prev => {
        const newSet = new Set(prev);
        newSet.add(postId);
        return newSet;
      });

      // Update generated posts state
      setGeneratedPosts(prev => 
        prev.map(post => 
          post.id === postId 
            ? { ...post, status: 'approved' }
            : post
        )
      );
      
      // Find the post in either generated posts or database posts
      const targetPost = generatedPosts.find(p => p.id === postId) || 
                        posts?.find(p => p.id === postId);
      
      if (targetPost) {
        // Save to database and potentially publish immediately
        if (generatedPosts.find(p => p.id === postId)) {
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              platform: targetPost.platform,
              content: targetPost.content,
              scheduledFor: targetPost.scheduledFor,
              status: 'approved'
            })
          });

          if (response.ok) {
            const savedPost = await response.json();
            console.log('Post saved to database:', savedPost);
            
            // Auto-publish if requested and scheduled for now or past
            if (shouldPublishNow || new Date(targetPost.scheduledFor) <= new Date()) {
              await publishPost(savedPost.id, targetPost.platform);
            }
          }
        } else {
          // Update existing database post
          const response = await fetch(`/api/posts/${postId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ status: 'approved' })
          });

          if (response.ok) {
            refetchPosts();
            
            // Auto-publish if requested
            if (shouldPublishNow) {
              await publishPost(postId, targetPost.platform);
            }
          }
        }

        toast({
          title: shouldPublishNow ? "Post Published" : "Post Approved",
          description: shouldPublishNow ? 
            "Post has been published to your platform successfully." : 
            "Post has been approved and scheduled successfully.",
        });
      }
    } catch (error) {
      console.error('Error approving post:', error);
      // Revert state changes on error
      setApprovedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
      setGeneratedPosts(prev => 
        prev.map(post => 
          post.id === postId 
            ? { ...post, status: 'draft' }
            : post
        )
      );
      toast({
        title: "Error",
        description: "Failed to approve post. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Publish post to social media platform
  const publishPost = async (postId: number, platform: string) => {
    try {
      const response = await fetch('/api/publish-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          postId,
          platform
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Post published:', result);
        refetchPosts();
        return result;
      } else {
        throw new Error('Failed to publish post');
      }
    } catch (error) {
      console.error('Error publishing post:', error);
      toast({
        title: "Publishing Error",
        description: "Failed to publish to platform. Check your connection settings.",
        variant: "destructive",
      });
    }
  };

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Fetch posts with calendar data
  const { data: posts = [], isLoading: postsLoading, refetch: refetchPosts } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    retry: false,
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Generate 30-day calendar view
  const generateCalendarDays = (): CalendarDay[] => {
    const startDate = new Date();
    const days: CalendarDay[] = [];
    
    // Combine both fetched posts and generated posts - ensure arrays exist
    const safePosts = Array.isArray(posts) ? posts : [];
    const safeGeneratedPosts = Array.isArray(generatedPosts) ? generatedPosts : [];
    const allPosts = [...safePosts, ...safeGeneratedPosts];
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(startDate, i);
      const dayPosts = allPosts.filter(post => 
        isSameDay(new Date(post.scheduledFor), date)
      );
      
      // AI optimal posting insights based on Queensland events
      const isOptimalDay = getOptimalPostingDay(date);
      const localEvents = getLocalEvents(date);
      const aiInsight = getAIInsight(date, localEvents);
      
      days.push({
        date,
        posts: dayPosts,
        aiInsight,
        localEvents,
        isOptimalDay
      });
    }
    
    return days;
  };

  const getOptimalPostingDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    
    // Grok's recommendations for Queensland businesses
    // Tuesday-Thursday are optimal for B2B content
    // Weekends for consumer engagement
    // Avoid school holiday periods unless relevant
    return dayOfWeek >= 2 && dayOfWeek <= 4 || dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getLocalEvents = (date: Date): string[] => {
    const events: string[] = [];
    const monthDay = `${date.getMonth() + 1}-${date.getDate()}`;
    const year = date.getFullYear();
    
    // June 11, 2025 specific events for paying customers
    if (year === 2025 && date.getMonth() === 5 && date.getDate() === 11) {
      events.push("Queensland SME Expo - Brisbane Convention Centre");
      events.push("Digital Marketing Workshop - Gold Coast");
      events.push("Small Business Network Event - Sunshine Coast");
    }
    
    // Brand-relevant events based on The AgencyIQ focus
    if (monthDay === "6-11") {
      events.push("Queensland Business Awards Opening");
      events.push("Local Chamber of Commerce Meeting");
    }
    
    // Queensland school holidays and local events
    const qldEvents: Record<string, string[]> = {
      '6-15': ['Queensland Day'],
      '4-25': ['ANZAC Day'],
      '12-25': ['Christmas Day'],
      '1-1': ['New Year\'s Day'],
      '1-26': ['Australia Day'],
      '4-1': ['Easter Monday'],
      '5-1': ['Labour Day QLD'],
      '10-5': ['Queen\'s Birthday QLD'],
    };
    
    // Add seasonal events
    if (date.getMonth() === 11) events.push('Summer Holiday Season');
    if (date.getMonth() === 0) events.push('Back to School Season');
    if (date.getMonth() === 6 || date.getMonth() === 7) events.push('Winter School Holidays');
    
    return events.concat(qldEvents[monthDay] || []);
  };

  const getAIInsight = (date: Date, events: string[]): string => {
    if (events.length === 0) {
      return "Standard posting day - focus on your core business messaging";
    }
    
    if (events.includes('Queensland Day')) {
      return "Perfect for local pride content - showcase your Queensland heritage and community involvement";
    }
    
    if (events.includes('Summer Holiday Season')) {
      return "High engagement period - people are relaxed and browsing social media more";
    }
    
    if (events.includes('Back to School Season')) {
      return "Great for family-focused businesses - parents are active on social media";
    }
    
    return `Local event opportunity: ${events[0]} - tailor your content to this occasion`;
  };

  const aiThinkingSteps = [
    {
      step: 1,
      title: "Analyzing Brand Purpose & Goals",
      content: "Reviewing your Strategyzer-based brand purpose to understand core messaging, target audience, and business objectives...",
      duration: 2000
    },
    {
      step: 2, 
      title: "Platform Strategy Analysis",
      content: "Evaluating which social media platforms best align with your goals: LinkedIn for B2B reach, Instagram for visual storytelling, Facebook for community building...",
      duration: 3000
    },
    {
      step: 3,
      title: "Queensland Event Integration", 
      content: "Cross-referencing local Queensland events, school holidays, and seasonal opportunities to optimize posting timing...",
      duration: 2500
    },
    {
      step: 4,
      title: "Content Creation & Refinement",
      content: "Generating platform-specific content that reflects your brand voice while maximizing engagement potential...",
      duration: 4000
    },
    {
      step: 5,
      title: "Final Review & Optimization",
      content: "Applying unpaid media best practices and ensuring each post meets your strategic objectives...",
      duration: 2000
    }
  ];

  const generateContentWithAIThinking = async () => {
    setShowAIThinking(true);
    setAIStep(0);
    
    // Start the thinking animation
    aiThinkingSteps.forEach((step, index) => {
      setTimeout(() => {
        setAIStep(index + 1);
      }, step.duration * index);
    });

    try {
      // Get subscription info from user data or localStorage
      const productsServices = localStorage.getItem('productsServices') || (user as any)?.subscriptionPlan || '';
      
      const response = await fetch('/api/generate-content-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ productsServices })
      });

      const text = await response.text();
      console.log('Schedule response - Status:', response.status, 'Body:', text);
      
      if (response.ok) {
        const data = JSON.parse(text);
        console.log('Generated content:', data);
        
        // Check calendar grid element
        const calendar = document.querySelector('.calendar-grid');
        console.log('Calendar grid:', calendar ? 'Found' : 'Calendar grid not found');
        
        // The API returns {posts: [...]} format
        const posts = data.posts || data;
        
        if (posts && posts.length > 0) {
          // Determine post count based on subscription
          let postCount = 10; // Default to Starter
          if (productsServices.includes('Growth') || productsServices.includes('growth')) postCount = 25;
          if (productsServices.includes('Professional') || productsServices.includes('professional')) postCount = 45;
          
          console.log('Subscription detected:', productsServices, 'Post limit:', postCount);
          
          // Limit posts based on subscription
          const limitedPosts = posts.slice(0, postCount);
          
          // Convert API response to Post format with unique IDs
          const newPosts = limitedPosts.map((post: any, index: number): Post => ({
            id: post.id || (Date.now() + index + Math.random() * 1000),
            platform: post.platform,
            content: post.content,
            status: 'draft', // Always start as draft
            scheduledFor: post.scheduledFor,
            aiRecommendation: `Strategic content optimized for ${post.platform} engagement`
          }));
          
          setGeneratedPosts(newPosts);
          // Clear any previous approved posts state when generating new content
          setApprovedPosts(new Set());
          console.log('Generated posts set to state:', newPosts.length, 'posts');
          
          // Also render directly to calendar grid if available
          if (calendar && newPosts.length > 0) {
            const eventCards = newPosts.map((post: Post) => 
              `<div class='event-card bg-blue-50 border border-blue-200 rounded p-2 mb-1'>
                <p class='text-xs text-blue-800'>${post.content.substring(0, 50)}...</p>
                <span class='text-xs text-blue-600'>${post.platform}</span>
              </div>`
            ).join('');
            
            // Add to first calendar day cell
            const firstDayCell = calendar.querySelector('.relative.min-h-24');
            if (firstDayCell) {
              const existingContent = firstDayCell.innerHTML;
              firstDayCell.innerHTML = existingContent + eventCards;
            }
            
            // Count and log rendered posts against subscription limit
            console.log(`Rendered posts: ${newPosts.length} (Subscription: ${productsServices || 'Unknown'}, Limit: ${postCount})`);
          }
          
          // Show success message
          toast({
            title: "Content Generated Successfully",
            description: `Generated ${newPosts.length} posts for your ${productsServices || 'subscription'} plan`,
          });
        }
      } else {
        console.error('Schedule generation failed:', text);
        toast({
          title: "Generation Failed",
          description: "Unable to generate content. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Network error:', error);
      toast({
        title: "Network Error",
        description: "Failed to connect to content generation service",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setShowAIThinking(false);
        setAIStep(0);
      }, 1000);
    }
  };

  const approvePostMutation = useMutation({
    mutationFn: (postId: number) => apiRequest("PUT", `/api/posts/${postId}`, { status: "approved" }),
    onSuccess: () => {
      toast({
        title: "Post Approved",
        description: "Post will be automatically published at the scheduled time",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed", 
        description: error.message || "Failed to approve post",
        variant: "destructive",
      });
    },
  });

  const calendarDays = generateCalendarDays();
  
  // Debug calendar generation
  console.log('Calendar days generated:', calendarDays.length);
  console.log('Generated posts in state:', generatedPosts.length);
  console.log('Approved posts state:', Array.from(approvedPosts));
  console.log('Posts with scheduled dates:', calendarDays.filter(day => day.posts.length > 0));
  
  // Debug individual post states
  generatedPosts.forEach(post => {
    console.log(`Post ${post.id}: status=${post.status}, approved=${approvedPosts.has(post.id)}, platform=${post.platform}`);
  });

  // Initialize approved posts from existing post statuses
  useEffect(() => {
    if (posts && posts.length > 0) {
      const approvedPostIds = posts
        .filter(post => post.status === 'approved')
        .map(post => post.id);
      
      if (approvedPostIds.length > 0) {
        setApprovedPosts(new Set(approvedPostIds));
      }
    }
  }, [posts]);

  const getPlatformIcon = (platform: string) => {
    const iconClass = "w-4 h-4";
    switch (platform.toLowerCase()) {
      case "facebook":
        return <div className={`${iconClass} bg-blue-600 rounded text-white flex items-center justify-center text-xs font-bold`}>f</div>;
      case "instagram":
        return <div className={`${iconClass} bg-gradient-to-br from-purple-500 to-pink-500 rounded text-white flex items-center justify-center text-xs font-bold`}>ig</div>;
      case "linkedin":
        return <div className={`${iconClass} bg-blue-700 rounded text-white flex items-center justify-center text-xs font-bold`}>in</div>;
      case "x":
        return <div className={`${iconClass} bg-black rounded text-white flex items-center justify-center text-xs font-bold`}>x</div>;
      default:
        return <div className={`${iconClass} bg-gray-500 rounded text-white flex items-center justify-center text-xs font-bold`}>{platform[0]}</div>;
    }
  };

  if (userLoading || postsLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <MasterHeader showUserMenu={true} />

      <div className="schedule-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <BackButton to="/brand-purpose" label="Back to Brand Purpose" />
        </div>
        
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 lowercase">step 3 of 3</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-purple-600 h-2 rounded-full w-full"></div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-heading font-light text-foreground lowercase mb-4">
            your 30-day social media schedule
          </h1>
          <p className="text-gray-600 text-sm lowercase">
            ai has analyzed queensland events and optimal posting times to create your personalized content calendar
          </p>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-3 mt-4 mobile-action-buttons">
            <Button
              onClick={() => window.location.href = '/analytics'}
              variant="outline"
              className="lowercase"
            >
              view analytics
            </Button>
            <Button
              onClick={generateContentWithAIThinking}
              className="generate-button bg-purple-600 hover:bg-purple-700 text-white lowercase"
              disabled={showAIThinking}
            >
              {showAIThinking ? 'ai is thinking...' : 'generate content with ai'}
            </Button>
          </div>

        {/* AI Thinking Process Modal */}
        {showAIThinking && (
          <Card className="fixed inset-0 z-50 bg-white bg-opacity-95 flex items-center justify-center">
            <CardContent className="max-w-2xl p-8">
              <div className="text-center">
                <h2 className="text-2xl font-light text-purple-700 mb-6 lowercase">
                  ai strategic analysis
                </h2>
                
                {/* Progress Steps */}
                <div className="space-y-6">
                  {aiThinkingSteps.map((step, index) => (
                    <div 
                      key={index}
                      className={`flex items-start space-x-4 p-4 rounded-lg transition-all duration-500 ${
                        aiStep > index ? 'bg-green-50 border-green-200' :
                        aiStep === index + 1 ? 'bg-purple-50 border-purple-200 shadow-md' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        aiStep > index ? 'bg-green-500 text-white' :
                        aiStep === index + 1 ? 'bg-purple-500 text-white animate-pulse' :
                        'bg-gray-300 text-gray-600'
                      }`}>
                        {aiStep > index ? '✓' : step.step}
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-gray-900 lowercase">{step.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{step.content}</p>
                      </div>
                      {aiStep === index + 1 && (
                        <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Posts Preview */}
        {generatedPosts.length > 0 && (
          <div className="generated-posts-container mb-8">
            <h2 className="text-xl font-light text-gray-900 mb-4 lowercase">
              grok's content recommendations
            </h2>
            <div className="grid gap-6">
              {generatedPosts.map((post) => (
                <Card 
                  key={post.id} 
                  className="auto-post p-6"
                >
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getPlatformIcon(post.platform)}
                        <div>
                          <h3 className="font-medium text-gray-900 lowercase">{post.platform}</h3>
                          <p className="text-sm text-gray-500">
                            scheduled for {format(new Date(post.scheduledFor), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="lowercase">
                        {post.status}
                      </Badge>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                    </div>
                    
                    {post.aiRecommendation && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                        <p className="text-purple-700 text-sm font-medium lowercase">ai strategy:</p>
                        <p className="text-purple-800 text-sm">{post.aiRecommendation}</p>
                      </div>
                    )}
                    
                    {/* Editable content for main schedule */}
                    {editingPost?.id === post.id ? (
                      <div className="mb-4">
                        <textarea
                          value={editingPost.content}
                          onChange={(e) => setEditingPost({...editingPost, content: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded text-gray-800 resize-none"
                          rows={4}
                          autoFocus
                        />
                        <div className="flex space-x-3 mt-3">
                          <Button
                            onClick={() => saveEditedPost(post.id, editingPost.content)}
                            className="bg-blue-600 hover:bg-blue-700 text-white lowercase"
                          >
                            save changes
                          </Button>
                          <Button
                            onClick={() => setEditingPost(null)}
                            variant="outline"
                            className="lowercase"
                          >
                            cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => setEditingPost({id: post.id, content: post.content})}
                          variant="outline"
                          className="lowercase"
                        >
                          edit post
                        </Button>
                        
                        {post.status !== 'approved' && !approvedPosts.has(post.id) ? (
                          <>
                            <Button
                              onClick={() => approvePost(post.id, false)}
                              className="approve-button bg-green-600 hover:bg-green-700 text-white lowercase"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              approve & schedule
                            </Button>
                            <Button
                              onClick={() => approvePost(post.id, true)}
                              className="approve-button bg-blue-600 hover:bg-blue-700 text-white lowercase"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              publish now
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => publishPost(post.id, post.platform)}
                            className="approve-button bg-blue-600 hover:bg-blue-700 text-white lowercase"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            publish now
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 30-Day Calendar Grid */}
        <div className="calendar-grid grid grid-cols-7 gap-2 mb-8">
          {/* Calendar Headers */}
          {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 p-2 lowercase">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map((day, index) => (
            <Card 
              key={index}
              className={`
                calendar-day calendar-day-card relative min-h-24 p-2 cursor-pointer transition-all duration-200 hover:shadow-md
                ${isToday(day.date) ? 'ring-2 ring-purple-400 bg-purple-50' : ''}
                ${day.isOptimalDay ? 'border-green-300 bg-green-50' : 'border-gray-200'}
                ${day.posts.length > 0 ? 'bg-blue-50 border-blue-300' : ''}
                ${selectedDay && isSameDay(selectedDay, day.date) ? 'ring-2 ring-blue-500 bg-blue-100' : ''}
              `}
              onClick={() => handleDayClick(day.date)}
              onMouseEnter={() => setHoveredDay(day.date)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <CardContent className="calendar-day-content p-0">
                {/* Date */}
                <div className="text-xs font-medium text-gray-700 mb-1">
                  {format(day.date, 'd')}
                </div>
                
                {/* Optimal Day Indicator */}
                {day.isOptimalDay && (
                  <div className="absolute top-1 right-1">
                    <ThumbsUp className="w-3 h-3 text-green-600" />
                  </div>
                )}
                
                {/* Posts for this day */}
                <div className="space-y-1">
                  {day.posts.slice(0, 2).map(post => (
                    <div 
                      key={post.id}
                      className="flex items-center space-x-1 bg-white rounded px-1 py-0.5 shadow-sm"
                    >
                      {getPlatformIcon(post.platform)}
                      <span className="text-xs text-gray-600 truncate lowercase">
                        {post.content.substring(0, 20)}...
                      </span>
                    </div>
                  ))}
                  

                  
                  {day.posts.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{day.posts.length - 2} more
                    </div>
                  )}
                </div>
                
                {/* Local Events */}
                {day.localEvents && day.localEvents.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {day.localEvents.map((event, idx) => (
                      <div key={idx} className="event-card bg-orange-50 border border-orange-200 rounded px-2 py-1">
                        <div className="text-xs text-orange-700 font-medium">
                          {event.split(' - ')[0]}
                        </div>
                        {event.includes(' - ') && (
                          <div className="text-xs text-orange-600">
                            {event.split(' - ')[1]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stable Day Dropdown for Approve & Post */}
        {selectedDay && (
          <Card className="fixed z-50 bg-white border-2 border-blue-500 shadow-xl p-6 max-w-md" style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 lowercase">
                  {format(selectedDay, 'MMMM d, yyyy')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDay(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Posts for this day */}
              <div className="mb-4">
                {(() => {
                  // Combine generated posts and brand posts for this day
                  const generatedDayPosts = generatedPosts.filter(post => 
                    isSameDay(new Date(post.scheduledFor), selectedDay)
                  );
                  const brandDayPosts = brandSync.getPostsForDay(selectedDay);
                  const dayPosts = [...generatedDayPosts, ...brandDayPosts];
                  
                  if (dayPosts.length > 0) {
                    return (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 lowercase">scheduled posts:</p>
                        {dayPosts.map(post => (
                          <div key={post.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              {getPlatformIcon(post.platform)}
                              <span className="text-sm font-medium lowercase">{post.platform}</span>
                              <Badge variant={post.status === 'approved' ? 'default' : 'outline'}>
                                {post.status}
                              </Badge>
                            </div>
                            
                            {/* Editable content */}
                            {editingPost?.id === post.id ? (
                              <div className="mb-3">
                                <textarea
                                  value={editingPost.content}
                                  onChange={(e) => setEditingPost({...editingPost, content: e.target.value})}
                                  className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex space-x-2 mt-2">
                                  <Button
                                    onClick={() => saveEditedPost(post.id, editingPost.content)}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white lowercase"
                                  >
                                    save changes
                                  </Button>
                                  <Button
                                    onClick={() => setEditingPost(null)}
                                    size="sm"
                                    variant="outline"
                                    className="lowercase"
                                  >
                                    cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700 mb-3">{post.content}</p>
                            )}

                            {/* Action buttons */}
                            {editingPost?.id !== post.id && (
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => setEditingPost({id: post.id, content: post.content})}
                                  size="sm"
                                  variant="outline"
                                  className="lowercase"
                                >
                                  edit
                                </Button>
                                
                                {post.status !== 'approved' ? (
                                  <>
                                    <Button
                                      onClick={() => approvePostForDay(selectedDay, post.id, false)}
                                      className="approve-button bg-green-600 hover:bg-green-700 text-white text-sm lowercase"
                                      size="sm"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      approve & schedule
                                    </Button>
                                    <Button
                                      onClick={() => approvePostForDay(selectedDay, post.id, true)}
                                      className="approve-button bg-blue-600 hover:bg-blue-700 text-white text-sm lowercase"
                                      size="sm"
                                    >
                                      <Play className="w-4 h-4 mr-2" />
                                      publish now
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    onClick={() => publishPost(post.id, post.platform)}
                                    className="approve-button bg-blue-600 hover:bg-blue-700 text-white text-sm lowercase"
                                    size="sm"
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    publish now
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600 mb-4 lowercase">no content scheduled for this day</p>
                        <Button
                          onClick={() => approvePostForDay(selectedDay)}
                          className="approve-button bg-blue-600 hover:bg-blue-700 text-white lowercase"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          create & approve post
                        </Button>
                      </div>
                    );
                  }
                })()}
              </div>

              <div className="text-xs text-gray-500 text-center lowercase">
                click outside to close
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hover Tooltip - Grok Insights */}
        {hoveredDay && (
          <Card className="fixed z-50 bg-white border shadow-lg p-4 max-w-sm" style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}>
            <CardContent className="p-0">
              <h3 className="font-medium text-purple-700 mb-2 lowercase">
                ai insights for {format(hoveredDay, 'MMM d')}
              </h3>
              {calendarDays.find(day => isSameDay(day.date, hoveredDay))?.aiInsight && (
                <p className="text-sm text-gray-600 mb-3">
                  {calendarDays.find(day => isSameDay(day.date, hoveredDay))?.aiInsight}
                </p>
              )}
              
              {/* Local Events */}
              {calendarDays.find(day => isSameDay(day.date, hoveredDay))?.localEvents?.length! > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1 lowercase">local events:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {calendarDays.find(day => isSameDay(day.date, hoveredDay))?.localEvents?.map((event, idx) => (
                      <li key={idx} className="lowercase">• {event}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Posts for this day */}
              {calendarDays.find(day => isSameDay(day.date, hoveredDay))?.posts.length! > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2 lowercase">scheduled posts:</p>
                  <div className="space-y-2">
                    {calendarDays.find(day => isSameDay(day.date, hoveredDay))?.posts.map(post => (
                      <div key={post.id} className="bg-gray-50 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            {getPlatformIcon(post.platform)}
                            <span className="text-xs font-medium lowercase">{post.platform}</span>
                          </div>
                          <Badge 
                            variant={post.status === 'approved' ? 'default' : 'outline'}
                            className="text-xs lowercase"
                          >
                            {post.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{post.content}</p>
                        {post.status === 'scheduled' && (
                          <Button
                            size="sm"
                            onClick={() => approvePostMutation.mutate(post.id)}
                            className="w-full text-xs h-6 bg-purple-600 hover:bg-purple-700 lowercase"
                          >
                            approve & auto-post
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      <MasterFooter />
    </div>
  );
}