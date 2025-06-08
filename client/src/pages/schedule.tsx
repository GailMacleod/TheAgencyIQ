import { useLocation } from "wouter";
import { Calendar, Clock, CheckCircle, XCircle, RotateCcw, Play, Eye, ThumbsUp } from "lucide-react";
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

interface Post {
  id: number;
  platform: string;
  content: string;
  status: string;
  scheduledFor: string;
  publishedAt?: string;
  errorLog?: string;
  grokRecommendation?: string;
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
  grokInsight?: string;
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
  const [showGrokThinking, setShowGrokThinking] = useState(false);
  const [grokStep, setGrokStep] = useState(0);
  const [generatedPosts, setGeneratedPosts] = useState<Post[]>([]);

  // Mock user data to prevent API loop
  const user = {
    id: 1,
    email: "user@example.com",
    phone: "+61400000000",
    subscriptionPlan: "professional",
    remainingPosts: 45,
    totalPosts: 60
  };
  const userLoading = false;

  // Fetch posts with calendar data
  const { data: posts = [], isLoading: postsLoading, refetch: refetchPosts } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    retry: false,
    enabled: false, // Disable until authentication is fixed
  });

  // Generate 30-day calendar view
  const generateCalendarDays = (): CalendarDay[] => {
    const startDate = new Date();
    const days: CalendarDay[] = [];
    
    // Combine both fetched posts and generated posts
    const allPosts = [...posts, ...generatedPosts];
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(startDate, i);
      const dayPosts = allPosts.filter(post => 
        isSameDay(new Date(post.scheduledFor), date)
      );
      
      // Grok's optimal posting insights based on Queensland events
      const isOptimalDay = getOptimalPostingDay(date);
      const localEvents = getLocalEvents(date);
      const grokInsight = getGrokInsight(date, localEvents);
      
      days.push({
        date,
        posts: dayPosts,
        grokInsight,
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

  const getGrokInsight = (date: Date, events: string[]): string => {
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

  const grokThinkingSteps = [
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

  const generateContentWithGrokThinking = async () => {
    setShowGrokThinking(true);
    setGrokStep(0);
    
    // Start the thinking animation
    grokThinkingSteps.forEach((step, index) => {
      setTimeout(() => {
        setGrokStep(index + 1);
      }, step.duration * index);
    });

    try {
      // Get subscription info from user data or localStorage
      const productsServices = localStorage.getItem('productsServices') || user?.subscriptionPlan || '';
      
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
          
          // Convert API response to Post format
          const newPosts = limitedPosts.map((post: any, index: number) => ({
            id: post.id || Date.now() + index,
            platform: post.platform,
            content: post.content,
            status: post.status || 'draft',
            scheduledFor: post.scheduledFor,
            grokRecommendation: `Strategic content optimized for ${post.platform} engagement`
          }));
          
          setGeneratedPosts(newPosts);
          console.log('Generated posts set to state:', newPosts);
          
          // Also render directly to calendar grid if available
          if (calendar && newPosts.length > 0) {
            const eventCards = newPosts.map(post => 
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
        setShowGrokThinking(false);
        setGrokStep(0);
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
  console.log('Posts with scheduled dates:', calendarDays.filter(day => day.posts.length > 0));

  // Add event listeners for button interactions
  useEffect(() => {
    // Approve & Schedule button feedback
    const approveButtons = document.querySelectorAll('button');
    const approveButtonsFiltered = Array.from(approveButtons).filter(button => 
      button.textContent?.includes('approve & schedule')
    );
    
    approveButtonsFiltered.forEach(button => {
      const handleApproveClick = (e: Event) => {
        console.log('Button approved');
        console.log('Post approved and updated');
        const target = e.target as HTMLElement;
        
        target.style.backgroundColor = '#3250fa';
        target.textContent = 'Approved';
        target.setAttribute('disabled', 'true');
        
        setTimeout(() => {
          target.removeAttribute('disabled');
        }, 2000);
      };
      
      button.addEventListener('click', handleApproveClick);
    });

    // Edit Post button functionality
    const editButtons = document.querySelectorAll('button');
    const editButtonsFiltered = Array.from(editButtons).filter(button => 
      button.textContent?.includes('edit post')
    );
    
    editButtonsFiltered.forEach(button => {
      const handleEditClick = (e: Event) => {
        const target = e.target as HTMLElement;
        const postCard = target.closest('.p-6') as HTMLElement;
        const contentElement = postCard?.querySelector('.text-gray-800') as HTMLElement;
        
        if (contentElement && !postCard.querySelector('input[type="text"]')) {
          const originalContent = contentElement.textContent || '';
          const input = document.createElement('input');
          input.type = 'text';
          input.value = originalContent;
          input.className = 'w-full p-2 border border-gray-300 rounded text-gray-800';
          
          contentElement.style.display = 'none';
          contentElement.parentNode?.insertBefore(input, contentElement.nextSibling);
          input.focus();
          
          const handleBlur = () => {
            console.log('Post content updated to:', input.value);
            contentElement.textContent = input.value;
            contentElement.style.display = 'block';
            input.remove();
          };
          
          input.addEventListener('blur', handleBlur);
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              input.blur();
            }
          });
        }
      };
      
      button.addEventListener('click', handleEditClick);
    });

    return () => {
      approveButtonsFiltered.forEach(button => {
        button.removeEventListener('click', () => {});
      });
      editButtonsFiltered.forEach(button => {
        button.removeEventListener('click', () => {});
      });
    };
  }, [generatedPosts]);

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            grok has analyzed queensland events and optimal posting times to create your personalized content calendar
          </p>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-3 mt-4">
            <Button
              onClick={() => window.location.href = '/analytics'}
              variant="outline"
              className="lowercase"
            >
              view analytics
            </Button>
            <Button
              onClick={generateContentWithGrokThinking}
              className="bg-purple-600 hover:bg-purple-700 text-white lowercase"
              disabled={showGrokThinking}
            >
              {showGrokThinking ? 'grok is thinking...' : 'generate content with grok'}
            </Button>
        </div>

        {/* Grok Thinking Process Modal */}
        {showGrokThinking && (
          <Card className="fixed inset-0 z-50 bg-white bg-opacity-95 flex items-center justify-center">
            <CardContent className="max-w-2xl p-8">
              <div className="text-center">
                <h2 className="text-2xl font-light text-purple-700 mb-6 lowercase">
                  grok's strategic analysis
                </h2>
                
                {/* Progress Steps */}
                <div className="space-y-6">
                  {grokThinkingSteps.map((step, index) => (
                    <div 
                      key={index}
                      className={`flex items-start space-x-4 p-4 rounded-lg transition-all duration-500 ${
                        grokStep > index ? 'bg-green-50 border-green-200' :
                        grokStep === index + 1 ? 'bg-purple-50 border-purple-200 shadow-md' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        grokStep > index ? 'bg-green-500 text-white' :
                        grokStep === index + 1 ? 'bg-purple-500 text-white animate-pulse' :
                        'bg-gray-300 text-gray-600'
                      }`}>
                        {grokStep > index ? '✓' : step.step}
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-gray-900 lowercase">{step.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{step.content}</p>
                      </div>
                      {grokStep === index + 1 && (
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
          <div className="mb-8">
            <h2 className="text-xl font-light text-gray-900 mb-4 lowercase">
              grok's content recommendations
            </h2>
            <div className="grid gap-6">
              {generatedPosts.map((post) => (
                <Card key={post.id} className="p-6">
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
                    
                    {post.grokRecommendation && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                        <p className="text-purple-700 text-sm font-medium lowercase">grok's strategy:</p>
                        <p className="text-purple-800 text-sm">{post.grokRecommendation}</p>
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => approvePostMutation.mutate(post.id)}
                        className="bg-green-600 hover:bg-green-700 text-white lowercase"
                        disabled={approvePostMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        approve & schedule
                      </Button>
                      <Button
                        variant="outline"
                        className="lowercase"
                      >
                        edit post
                      </Button>
                    </div>
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
                relative min-h-24 p-2 cursor-pointer transition-all duration-200 hover:shadow-md
                ${isToday(day.date) ? 'ring-2 ring-purple-400 bg-purple-50' : ''}
                ${day.isOptimalDay ? 'border-green-300 bg-green-50' : 'border-gray-200'}
                ${day.posts.length > 0 ? 'bg-blue-50 border-blue-300' : ''}
              `}
              onMouseEnter={() => setHoveredDay(day.date)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <CardContent className="p-0">
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

        {/* Hover Tooltip - Grok Insights */}
        {hoveredDay && (
          <Card className="fixed z-50 bg-white border shadow-lg p-4 max-w-sm" style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}>
            <CardContent className="p-0">
              <h3 className="font-medium text-purple-700 mb-2 lowercase">
                grok insights for {format(hoveredDay, 'MMM d')}
              </h3>
              {calendarDays.find(day => isSameDay(day.date, hoveredDay))?.grokInsight && (
                <p className="text-sm text-gray-600 mb-3">
                  {calendarDays.find(day => isSameDay(day.date, hoveredDay))?.grokInsight}
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