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
  const [connectedPlatforms, setConnectedPlatforms] = useState<{[key: string]: boolean}>({});

  // Fetch platform connections from database
  const { data: connections = [], isLoading } = useQuery<PlatformConnection[]>({
    queryKey: ['/api/platform-connections'],
    retry: 2
  });

  // Fetch live connection state with validation
  const { data: liveState } = useQuery({
    queryKey: ['/api/get-connection-state'],
    retry: 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Sync local state with live validation results with error handling
  useEffect(() => {
    if (liveState?.success && liveState?.connectedPlatforms) {
      console.log('Live connection state for connect-platforms:', liveState.connectedPlatforms);
      setConnectedPlatforms(liveState.connectedPlatforms);
    } else if (liveState?.error) {
      console.warn('Live state check failed in connect-platforms:', liveState.error);
      // Maintain existing state on error
    }
  }, [liveState]);

  // Check live platform status on component load
  useEffect(() => {
    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    validPlatforms.forEach(plat => {
      fetch('/api/check-live-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: plat })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConnectedPlatforms(prev => ({
            ...prev,
            [data.platform]: data.isConnected
          }));
        }
      })
      .catch(err => console.warn(`Live status check failed for ${plat}:`, err));
    });
  }, []);

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
      
      // Try LinkedIn OAuth directly - let's see if the credentials work
      if (platform === 'linkedin') {
        console.log('Attempting LinkedIn OAuth with existing credentials');
      }
      
      // Map platform names to OAuth routes
      const oauthRoutes: { [key: string]: string } = {
        'facebook': '/api/auth/facebook',
        'linkedin': '/api/auth/linkedin',
        'x': '/api/auth/x',
        'youtube': '/api/auth/youtube'
      };
      
      const oauthUrl = oauthRoutes[platform];
      if (!oauthUrl) {
        throw new Error(`OAuth not configured for ${platform}`);
      }
      
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
      return response.json();
    },
    onSuccess: (data) => {
      // Update local state based on backend response
      if (data.action === 'syncState' && data.version === '1.3') {
        setConnectedPlatforms(prev => ({
          ...prev,
          [data.platform]: data.isConnected
        }));
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/get-connection-state'] });
      
      toast({
        title: "Platform Disconnected",
        description: "Platform has been successfully disconnected"
      });
    },
    onError: () => {
      toast({
        title: "Disconnect Failed", 
        description: "Failed to disconnect platform. Please try again.",
        variant: "destructive"
      });
    }
  });





  const isConnected = (platform: string) => {
    // Check session state first (for UI sync), then database connections
    if (connectedPlatforms.hasOwnProperty(platform)) {
      return connectedPlatforms[platform] === true;
    }
    
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
        </div>

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
                          <Button
                            onClick={() => handleOAuthConnect(platform)}
                            className="w-full"
                            disabled={connecting[platform]}
                          >
                            {connecting[platform] ? 'Connecting...' : 'CONNECT'}
                          </Button>
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