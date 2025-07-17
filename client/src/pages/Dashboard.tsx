import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  Plus,
  Activity,
  Target,
  Zap,
  Shield,
  Check,
  X
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  subscriptionPlan: string;
  quotaUsed: number;
  quotaLimit: number;
  quotaRemaining: number;
}

interface PlatformConnection {
  id: number;
  platform: string;
  username?: string;
  isActive: boolean;
  connectedAt: string;
  expiresAt?: string;
}

interface Post {
  id: number;
  content: string;
  platforms: string[];
  status: string;
  scheduledFor?: string;
  createdAt: string;
  platformPostId?: string;
}

interface BrandPurpose {
  brandName: string;
  corePurpose: string;
  targetAudience: string;
  productsServices: string;
}

const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/user-status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch platform connections
  const { data: platformData, isLoading: platformLoading } = useQuery<{ connections: PlatformConnection[] }>({
    queryKey: ['/api/platform-connections'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch posts
  const { data: postsData, isLoading: postsLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ['/api/posts'],
    refetchInterval: 30000,
  });

  // Fetch brand purpose
  const { data: brandPurpose, isLoading: brandLoading } = useQuery<BrandPurpose>({
    queryKey: ['/api/brand-purpose'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: { content: string; platforms: string[]; scheduledFor?: string }) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-status'] });
    },
  });

  const platforms = platformData?.connections || [];
  const posts = postsData?.posts || [];
  const activePlatforms = platforms.filter(p => p.isActive);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'scheduled':
        return 'bg-blue-500';
      case 'draft':
        return 'bg-gray-500';
      case 'approved':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return '📘';
      case 'instagram':
        return '📸';
      case 'linkedin':
        return '💼';
      case 'twitter':
      case 'x':
        return '🐦';
      case 'youtube':
        return '📺';
      default:
        return '📱';
    }
  };

  const handleQuickPost = () => {
    const content = prompt('Enter your post content:');
    if (content && activePlatforms.length > 0) {
      createPostMutation.mutate({
        content,
        platforms: activePlatforms.map(p => p.platform),
      });
    }
  };

  if (userLoading || platformLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleQuickPost} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Quick Post
              </Button>
              <Link href="/posts/new">
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Post
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Quota Used</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {user?.quotaUsed || 0} / {user?.quotaLimit || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, ((user?.quotaUsed || 0) / (user?.quotaLimit || 1)) * 100)}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Connected Platforms</p>
                  <p className="text-2xl font-bold text-gray-900">{activePlatforms.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Subscription</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {user?.subscriptionPlan || 'Free'}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <Shield className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Platform Connections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Platform Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPlatformIcon(platform.platform)}</span>
                      <div>
                        <p className="font-medium capitalize">{platform.platform}</p>
                        <p className="text-sm text-gray-600">
                          {platform.username || 'Connected'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {platform.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          <X className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/auth/${platform.platform}`}>
                          {platform.isActive ? 'Refresh' : 'Connect'}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {platforms.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No platform connections yet</p>
                    <Link href="/connect">
                      <Button className="mt-4">Connect Platforms</Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {post.platforms.map((platform, index) => (
                            <span key={index} className="text-sm">
                              {getPlatformIcon(platform)}
                            </span>
                          ))}
                        </div>
                        <Badge className={`${getStatusColor(post.status)} text-white`}>
                          {post.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {post.content}
                    </p>
                    {post.platformPostId && (
                      <div className="mt-2 text-xs text-green-600">
                        Published: {post.platformPostId}
                      </div>
                    )}
                  </div>
                ))}
                {posts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No posts yet</p>
                    <Link href="/posts/new">
                      <Button className="mt-4">Create Your First Post</Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Brand Purpose Section */}
        {brandPurpose && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Brand Purpose
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Brand Name</h4>
                  <p className="text-gray-700">{brandPurpose.brandName || 'Not set'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Core Purpose</h4>
                  <p className="text-gray-700 line-clamp-3">{brandPurpose.corePurpose || 'Not set'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Target Audience</h4>
                  <p className="text-gray-700">{brandPurpose.targetAudience || 'Not set'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Products/Services</h4>
                  <p className="text-gray-700 line-clamp-3">{brandPurpose.productsServices || 'Not set'}</p>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/brand-purpose">
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Brand Purpose
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;