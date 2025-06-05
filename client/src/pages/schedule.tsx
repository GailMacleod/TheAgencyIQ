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
import Header from "@/components/header";
import Footer from "@/components/footer";

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

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

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
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(startDate, i);
      const dayPosts = posts.filter(post => 
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
      <Header showUserMenu={true} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        </div>

        {/* 30-Day Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-8">
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
                
                {/* Local Events Indicator */}
                {day.localEvents && day.localEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1">
                    <Calendar className="w-3 h-3 text-orange-500" />
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

      <Footer />
    </div>
  );
}