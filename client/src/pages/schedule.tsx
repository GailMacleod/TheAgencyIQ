import { useLocation } from "wouter";
import { Calendar, Clock, CheckCircle, XCircle, RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AnalyticsBar from "@/components/analytics-bar";

interface Post {
  id: number;
  platform: string;
  content: string;
  status: string;
  scheduledFor: string;
  publishedAt?: string;
  errorLog?: string;
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

export default function Schedule() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingContent, setGeneratingContent] = useState(false);

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Fetch posts
  const { data: posts = [], isLoading: postsLoading, refetch: refetchPosts } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  // Auto-generate content calendar on page load if no posts exist
  useEffect(() => {
    if (!postsLoading && posts.length === 0 && user && !generatingContent) {
      handleGenerateContent();
    }
  }, [posts, postsLoading, user]);

  const generateContentMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/generate-content-calendar", {}),
    onSuccess: () => {
      toast({
        title: "Content Calendar Generated",
        description: "Your personalized posts have been created successfully",
      });
      refetchPosts();
      setGeneratingContent(false);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content calendar",
        variant: "destructive",
      });
      setGeneratingContent(false);
    },
  });

  const approvePostMutation = useMutation({
    mutationFn: (postId: number) => apiRequest("POST", `/api/posts/${postId}/approve`, {}),
    onSuccess: () => {
      toast({
        title: "Post Approved",
        description: "Post has been scheduled for publishing",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve post",
        variant: "destructive",
      });
    },
  });

  const replacePostMutation = useMutation({
    mutationFn: (postId: number) => apiRequest("POST", `/api/posts/${postId}/replace`, {}),
    onSuccess: () => {
      toast({
        title: "Post Replaced",
        description: "A new post has been generated to replace the failed one",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Replace Failed",
        description: error.message || "Failed to replace post",
        variant: "destructive",
      });
    },
  });

  const handleGenerateContent = () => {
    setGeneratingContent(true);
    generateContentMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Scheduled</Badge>;
      case "published":
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Published</Badge>;
      case "failed":
        return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-5 w-5";
    switch (platform.toLowerCase()) {
      case "facebook":
        return <div className={`${iconClass} bg-blue-600 rounded text-white flex items-center justify-center text-xs font-bold`}>f</div>;
      case "instagram":
        return <div className={`${iconClass} bg-gradient-to-br from-purple-500 to-pink-500 rounded text-white flex items-center justify-center text-xs font-bold`}>ig</div>;
      case "linkedin":
        return <div className={`${iconClass} bg-blue-700 rounded text-white flex items-center justify-center text-xs font-bold`}>in</div>;
      default:
        return <div className={`${iconClass} bg-gray-500 rounded text-white flex items-center justify-center text-xs font-bold`}>{platform[0]}</div>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const successfulPosts = posts.filter(post => post.status === "published").length;
  const remainingPosts = user?.remainingPosts || 0;

  if (userLoading || (postsLoading && !generatingContent)) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <Header showUserMenu={true} />

      {/* Analytics Bar */}
      <AnalyticsBar className="border-b" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600">step 3 of 3</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full w-full"></div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-normal" style={{ color: '#333333' }}>
              Your Content Calendar
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Successful posts: {successfulPosts}</span>
              <span>Remaining posts: {remainingPosts}</span>
            </div>
          </div>
          
          {generatingContent && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                <p className="text-gray-600">Generating your personalized content calendar...</p>
              </div>
            </div>
          )}

          {posts.length === 0 && !generatingContent && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts generated yet</h3>
              <p className="text-gray-600 mb-4">Generate your personalized content calendar to get started.</p>
              <Button 
                onClick={handleGenerateContent}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                style={{ backgroundColor: '#3250fa' }}
              >
                <Play className="h-4 w-4 mr-2" />
                Generate Content Calendar
              </Button>
            </div>
          )}
        </div>

        {/* Posts List */}
        {posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getPlatformIcon(post.platform)}
                    <div>
                      <h3 className="font-medium text-gray-900 capitalize">{post.platform}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(post.scheduledFor)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(post.status)}
                    
                    {post.status === "scheduled" && (
                      <Button 
                        size="sm"
                        onClick={() => approvePostMutation.mutate(post.id)}
                        disabled={approvePostMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    
                    {post.status === "failed" && (
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => replacePostMutation.mutate(post.id)}
                        disabled={replacePostMutation.isPending}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Replace
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                </div>

                {post.status === "failed" && post.errorLog && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-600 text-sm font-medium">Error:</p>
                    <p className="text-red-700 text-sm">{post.errorLog}</p>
                  </div>
                )}

                {post.status === "published" && post.analytics && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-green-600 font-medium">Reach</p>
                        <p className="text-green-800">{post.analytics.reach.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">Engagement</p>
                        <p className="text-green-800">{post.analytics.engagement.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-green-600 font-medium">Impressions</p>
                        <p className="text-green-800">{post.analytics.impressions.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}