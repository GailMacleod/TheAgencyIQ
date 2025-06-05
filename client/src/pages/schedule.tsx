import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import AnalyticsBar from "@/components/analytics-bar";
import Footer from "@/components/footer";
import GrokWidget from "@/components/grok-widget";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiFacebook, SiInstagram, SiLinkedin, SiYoutube, SiTiktok, SiX } from "react-icons/si";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: number;
  platform: string;
  content: string;
  status: string;
  scheduledFor: string;
  publishedAt?: string;
  errorLog?: string;
}

interface User {
  id: number;
  email: string;
  phone: string;
  subscriptionPlan: string;
  remainingPosts: number;
  totalPosts: number;
}

export default function Schedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const approvePostMutation = useMutation({
    mutationFn: (postId: number) => apiRequest("POST", "/api/schedule-post", { postId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Post Approved",
        description: "Post has been scheduled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to approve post",
        variant: "destructive",
      });
    },
  });

  const replacePostMutation = useMutation({
    mutationFn: (postId: number) => apiRequest("POST", "/api/replace-post", { postId }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Post Replaced",
        description: response.recommendation || "Post has been replaced with new content",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to replace post",
        variant: "destructive",
      });
    },
  });

  const getPlatformIcon = (platform: string) => {
    const icons = {
      facebook: SiFacebook,
      instagram: SiInstagram,
      linkedin: SiLinkedin,
      youtube: SiYoutube,
      tiktok: SiTiktok,
      x: SiX,
    };
    return icons[platform as keyof typeof icons] || SiFacebook;
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: 'platform-facebook',
      instagram: 'platform-instagram', 
      linkedin: 'platform-linkedin',
      youtube: 'platform-youtube',
      tiktok: 'platform-tiktok',
      x: 'platform-x',
    };
    return colors[platform as keyof typeof colors] || 'platform-facebook';
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'scheduled':
        return {
          dot: 'status-dot-scheduled',
          text: 'status-scheduled',
          border: '',
        };
      case 'published':
        return {
          dot: 'status-dot-published',
          text: 'status-published',
          border: 'border-l-4 border-green-500',
        };
      case 'failed':
        return {
          dot: 'status-dot-failed',
          text: 'status-failed',
          border: 'border-l-4 border-red-500',
        };
      default:
        return {
          dot: 'status-dot-scheduled',
          text: 'status-scheduled',
          border: '',
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (userLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const successfulPosts = posts.filter(p => p.status === 'published').length;
  const failedPosts = posts.filter(p => p.status === 'failed').length;

  return (
    <div className="min-h-screen bg-background">
      <Header 
        showBack="/platform-connections" 
        showUserMenu 
      />
      
      {/* Analytics Bar */}
      <AnalyticsBar />
      
      {/* Banner */}
      <div className="banner-gradient border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-sm text-primary font-medium lowercase">plan status</div>
              <div className="text-lg text-foreground lowercase">
                {user?.subscriptionPlan} plan - active
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-primary font-medium lowercase">posts remaining</div>
              <div className="text-lg text-foreground lowercase">
                {user?.remainingPosts} posts remaining of {user?.totalPosts} total
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-primary font-medium lowercase">performance</div>
              <div className="text-lg text-foreground lowercase">
                {successfulPosts} successful, {failedPosts} failed this period
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-primary font-medium lowercase">cycle</div>
              <div className="text-lg text-foreground lowercase">
                day 1, june 05, 2025, 09:45 AM AEST
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-accent lowercase">
              linkedin posts had 20% higher engagement last cycle
            </p>
          </div>
        </div>
      </div>

      {/* Post List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-sections">
          {posts.length === 0 ? (
            <Card className="card-agencyiq">
              <CardContent className="p-8 text-center">
                <p className="text-foreground lowercase">no posts found. please complete the setup process.</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => {
              const Icon = getPlatformIcon(post.platform);
              const platformColor = getPlatformColor(post.platform);
              const statusStyles = getStatusStyles(post.status);

              return (
                <Card key={post.id} className={`card-agencyiq ${statusStyles.border}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className={`w-8 h-8 ${platformColor} rounded flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground lowercase">{post.platform}</div>
                            <div className="text-sm text-muted-foreground lowercase">
                              {formatDate(post.scheduledFor)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={statusStyles.dot}></div>
                            <span className={`text-sm font-medium lowercase ${statusStyles.text}`}>
                              {post.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-foreground mb-4 lowercase">
                          {post.content}
                        </div>
                        
                        {post.errorLog && (
                          <div className="text-sm text-destructive mb-4 lowercase">
                            failed: {post.errorLog}
                          </div>
                        )}
                        
                        {post.status === 'published' && (
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>12 likes</span>
                            <span>3 comments</span>
                            <span>2 shares</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-6 flex flex-col space-y-2">
                        {post.status === 'scheduled' && (
                          <div className="relative group">
                            <Button
                              onClick={() => approvePostMutation.mutate(post.id)}
                              className="btn-secondary text-sm"
                              disabled={approvePostMutation.isPending}
                            >
                              {approvePostMutation.isPending ? 'approving...' : 'approve'}
                            </Button>
                            <div className="tooltip">
                              this post will maximize engagement—last cycle's data shows {post.platform} performs best at this time
                            </div>
                          </div>
                        )}
                        
                        {post.status === 'failed' && (
                          <>
                            <Button
                              onClick={() => approvePostMutation.mutate(post.id)}
                              className="bg-gray-500 text-white hover:bg-gray-600 text-sm"
                            >
                              retry
                            </Button>
                            <Button
                              onClick={() => replacePostMutation.mutate(post.id)}
                              className="bg-accent text-white hover:bg-purple-600 text-sm"
                              disabled={replacePostMutation.isPending}
                            >
                              {replacePostMutation.isPending ? 'replacing...' : 'replace'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Footer />
      <GrokWidget />
    </div>
  );
}
