import { useLocation } from "wouter";
import { Facebook, Instagram, Linkedin, Twitter, Youtube, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import MasterHeader from "@/components/master-header";
import MasterFooter from "@/components/master-footer";
import BackButton from "@/components/back-button";

interface PlatformConnection {
  id: number;
  platform: string;
  platformUsername: string;
  isActive: boolean;
  connectedAt: string;
}

interface PlatformConfig {
  name: string;
  icon: any;
  color: string;
  description: string;
  pending?: boolean;
}

const platformConfig: Record<string, PlatformConfig> = {
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-600",
    description: "Connect your Facebook page to publish posts and engage with your audience"
  },
  instagram: {
    name: "Instagram", 
    icon: Instagram,
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    description: "Share photos and stories to grow your Instagram presence"
  },
  linkedin: {
    name: "LinkedIn",
    icon: Linkedin, 
    color: "bg-blue-700",
    description: "Build professional networks and share business content"
  },
  x: {
    name: "X (Twitter)",
    icon: Twitter,
    color: "bg-black",
    description: "Share quick updates and engage in real-time conversations"
  },
  youtube: {
    name: "YouTube",
    icon: Youtube,
    color: "bg-red-600", 
    description: "Upload videos and grow your YouTube channel"
  },
  tiktok: {
    name: "TikTok",
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 015.2-2.88V11.2a6.59 6.59 0 00-1.49-.17 6.8 6.8 0 106.8 6.8V8.77a8.14 8.14 0 004.16 1.13V6.69z"/>
      </svg>
    ),
    color: "bg-black",
    description: "Share short videos on TikTok",
    pending: true
  }
};

export default function ConnectPlatforms() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState<{[key: string]: boolean}>({});
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Fetch platform connections
  const { data: connections = [], isLoading } = useQuery<PlatformConnection[]>({
    queryKey: ['/api/platform-connections'],
    retry: 2
  });

  // OAuth connection for platforms
  const handleOAuthConnect = async (platform: string) => {
    try {
      setConnecting(prev => ({ ...prev, [platform]: true }));
      
      // Instagram OAuth fix for user_id: 2
      if (platform === 'instagram') {
        const response = await fetch('/api/brand-purpose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'instagram-oauth-fix' })
        });
        
        const result = await response.json();
        
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          toast({
            title: "Instagram OAuth Fixed",
            description: `${result.message}: ${result.username}`
          });
        } else {
          throw new Error(result.error || 'Instagram OAuth fix failed');
        }
        
        setConnecting(prev => ({ ...prev, [platform]: false }));
        return;
      }
      
      // Direct connection for Facebook to avoid OAuth redirect issues
      if (platform === 'facebook') {
        const response = await fetch('/api/auth/facebook', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.redirected) {
          // Handle the redirect result
          window.location.href = response.url;
          return;
        }
        
        const result = await response.text();
        if (result.includes('connected=facebook')) {
          queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          toast({
            title: "Facebook Connected",
            description: "Facebook connection established successfully"
          });
        }
        
        setConnecting(prev => ({ ...prev, [platform]: false }));
        return;
      }

      // Direct connection for LinkedIn to avoid OAuth issues
      if (platform === 'linkedin') {
        const response = await fetch('/api/auth/linkedin', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.redirected) {
          // Handle the redirect result
          window.location.href = response.url;
          return;
        }
        
        const result = await response.text();
        if (result.includes('success')) {
          queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          toast({
            title: "LinkedIn Connected",
            description: "LinkedIn connection established successfully"
          });
        }
        
        setConnecting(prev => ({ ...prev, [platform]: false }));
        return;
      }
      
      // Map platform names to OAuth routes (Facebook uses direct connection above)
      const oauthRoutes: { [key: string]: string } = {
        'x': '/auth/twitter',
        'youtube': '/auth/youtube',
        'instagram': '/auth/instagram'
      };
      
      const oauthUrl = oauthRoutes[platform];
      if (!oauthUrl) {
        throw new Error(`OAuth not configured for ${platform}`);
      }
      
      // Add timeout for OAuth redirects to prevent getting stuck
      const redirectTimer = setTimeout(() => {
        setConnecting(prev => ({ ...prev, [platform]: false }));
        toast({
          title: "Connection Timeout",
          description: "OAuth connection timed out. Please try again.",
          variant: "destructive"
        });
      }, 10000); // 10 second timeout
      
      // Store timer reference to clear it if successful
      window.sessionStorage.setItem('oauthTimer', redirectTimer.toString());
      
      // Redirect to OAuth flow
      window.location.href = oauthUrl;
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to initiate connection",
        variant: "destructive"
      });
      setConnecting(prev => ({ ...prev, [platform]: false }));
    }
  };

  // Disconnect platform mutation
  const disconnectMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await fetch('/api/disconnect-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform })
      });
      if (!response.ok) {
        throw new Error('Failed to disconnect platform');
      }
      return response.json();
    },
    onMutate: async (platform: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/platform-connections'] });
      
      // Snapshot the previous value
      const previousConnections = queryClient.getQueryData(['/api/platform-connections']);
      
      // Optimistically update to remove the connection
      queryClient.setQueryData(['/api/platform-connections'], (old: PlatformConnection[] = []) => {
        return old.filter(conn => conn.platform !== platform);
      });
      
      return { previousConnections };
    },
    onError: (err, platform, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousConnections) {
        queryClient.setQueryData(['/api/platform-connections'], context.previousConnections);
      }
      toast({
        title: "Disconnect Failed", 
        description: "Failed to disconnect platform. Please try again.",
        variant: "destructive"
      });
    },
    onSuccess: (data, platform) => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
      toast({
        title: "Platform Disconnected",
        description: `${platform} has been successfully disconnected`
      });
    }
  });





  const isConnected = (platform: string) => {
    if (!connections || !Array.isArray(connections)) return false;
    return connections.some((conn: PlatformConnection) => 
      conn.platform === platform && conn.isActive
    );
  };

  const getConnection = (platform: string) => {
    if (!connections || !Array.isArray(connections)) return null;
    return connections.find((conn: PlatformConnection) => 
      conn.platform === platform && conn.isActive
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading platform connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MasterHeader showUserMenu={true} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <BackButton to="/brand-purpose" label="Back to Brand Purpose" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Platforms</h1>
          <p className="text-gray-600 text-lg">
            Connect your social media accounts to enable automated posting with real API credentials
          </p>
          
          {/* OAuth Testing and Navigation */}
          <div className="flex justify-center space-x-4 mt-6">
            <Button
              onClick={async () => {
                setTesting(true);
                try {
                  const response = await fetch('/api/test-oauth-platforms', {
                    credentials: 'include'
                  });
                  const data = await response.json();
                  setTestResults(data);
                  toast({
                    title: "OAuth Test Complete",
                    description: `Tested ${Object.keys(data.platforms).length} platforms`
                  });
                } catch (error) {
                  toast({
                    title: "Test Failed",
                    description: "Could not test OAuth platforms",
                    variant: "destructive"
                  });
                } finally {
                  setTesting(false);
                }
              }}
              variant="outline"
              className="text-sm"
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test All Platforms'}
            </Button>
            <Button
              onClick={() => setLocation("/intelligent-schedule")}
              variant="outline"
              className="text-sm"
            >
              Test AI Schedule →
            </Button>
            <Button
              onClick={() => setLocation("/brand-purpose")}
              variant="outline"
              className="text-sm"
            >
              ← Back to Brand Purpose
            </Button>
          </div>
        </div>

        {/* OAuth Test Results Display */}
        {testResults && (
          <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Platform Test Results</h3>
            <div className="grid gap-3">
              {testResults.summary.map((result: any) => (
                <div key={result.platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${result.status === 'working' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium capitalize">{result.platform}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {result.status === 'working' ? '✅ Ready' : '❌ ' + result.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(platformConfig).map(([platform, config]) => {
            const connected = isConnected(platform);
            const connection = getConnection(platform);
            const Icon = config.icon;

            return (
              <Card key={platform} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${config.color} text-white`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {(config as PlatformConfig).pending ? (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Coming Soon
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Available
                        </Badge>
                      )}
                      {connected ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {config.description}
                  </p>

                  {connected && connection ? (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">Account: {connection.platformUsername}</p>
                        <p className="text-gray-500">
                          Connected {new Date(connection.connectedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => disconnectMutation.mutate(platform)}
                        variant="outline"
                        className="w-full text-red-600 border-red-300 hover:bg-red-50"
                        disabled={disconnectMutation.isPending}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(config as PlatformConfig).pending ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Coming Soon
                          </p>
                          <p className="text-xs text-gray-500">
                            TikTok connection available soon
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-4">
                            Connect using secure OAuth authentication
                          </p>
                          <div className="space-y-2">
                            <Button
                              onClick={() => handleOAuthConnect(platform)}
                              className="w-full"
                              disabled={connecting[platform]}
                            >
                              {connecting[platform] ? 'Connecting...' : 'CONNECT'}
                            </Button>
                            {platform === 'linkedin' && (
                              <Button
                                onClick={() => {
                                  setConnecting(prev => ({ ...prev, [platform]: false }));
                                  toast({
                                    title: "LinkedIn Skipped",
                                    description: "You can test other platforms and return to LinkedIn later"
                                  });
                                }}
                                variant="outline"
                                className="w-full text-xs"
                              >
                                Skip for Now
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {connections && Array.isArray(connections) && connections.length > 0 && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => setLocation("/intelligent-schedule")}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
            >
              Continue to AI Schedule
            </Button>
          </div>
        )}


        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Secure Connection</h3>
              <p className="text-blue-800 text-sm mb-3">
                We securely connect to your social media accounts. Your login details are protected and 
                your posts will be published directly to your real accounts.
              </p>
              <div className="text-xs text-blue-700">
                <p>• Your account information stays private and secure</p>
                <p>• Posts publish directly to your actual social media</p>
                <p>• All connections use official platform security</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MasterFooter />
    </div>
  );
}