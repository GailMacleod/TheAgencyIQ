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
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

interface PlatformConnection {
  id: number;
  platform: string;
  platformUsername: string;
  isActive: boolean;
  connectedAt: string;
  oauthStatus?: {
    platform: string;
    isValid: boolean;
    error?: string;
    needsRefresh: boolean;
  };
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

};

export default function ConnectPlatforms() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState<{[key: string]: boolean}>({});
  const [connectedPlatforms, setConnectedPlatforms] = useState<{[key: string]: boolean}>({});
  const [reconnecting, setReconnecting] = useState<{[key: string]: boolean}>({});

  // Fetch platform connections with OAuth token validation status
  const { data: connections = [], isLoading } = useQuery<PlatformConnection[]>({
    queryKey: ['/api/platform-connections'],
    retry: 2,
    refetchOnWindowFocus: true
  });

  // Fetch session connection state
  const { data: sessionState } = useQuery({
    queryKey: ['/api/get-connection-state'],
    retry: 2
  });

  // Sync local state with session state
  useEffect(() => {
    if (sessionState?.connectedPlatforms) {
      setConnectedPlatforms(sessionState.connectedPlatforms);
    }
  }, [sessionState]);

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
        // Update connection status based on API response
        const isConnected = data.status === 'connected';
        console.log(`Platform ${plat} status:`, data.status, 'Connected:', isConnected);
        setConnectedPlatforms(prev => ({
          ...prev,
          [data.platform]: isConnected
        }));
      })
      .catch(err => console.warn(`Live status check failed for ${plat}:`, err));
    });
  }, []);

  // Refresh connection data when returning from OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') || urlParams.get('success')) {
      // OAuth callback success - refresh connection data
      queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
      
      // Clean up URL parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [queryClient]);

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
      
      // Use popup window for OAuth to avoid iframe issues
      const popup = window.open(
        oauthUrl,
        'oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        throw new Error('Popup blocked - please allow popups for OAuth');
      }
      
      // Monitor popup for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setConnecting(prev => ({ ...prev, [platform]: false }));
          
          // Refresh connection data after OAuth completion
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          }, 1000);
        }
      }, 1000);
    } catch (error: any) {
      // Enhanced user-friendly error messages
      let errorMessage = "Failed to initiate connection";
      let actionMessage = "";

      if (platform === 'x') {
        errorMessage = "X (Twitter) connection failed";
        actionMessage = "Please reconnect X now by clicking the connect button again";
      } else if (platform === 'facebook') {
        errorMessage = "Facebook connection failed";
        actionMessage = "Please reconnect Facebook now - check your Facebook account permissions";
      } else if (platform === 'instagram') {
        errorMessage = "Instagram connection failed";
        actionMessage = "Please reconnect Instagram now - ensure your Instagram is linked to Facebook";
      } else if (platform === 'linkedin') {
        errorMessage = "LinkedIn connection failed";
        actionMessage = "Please reconnect LinkedIn now - check your LinkedIn account permissions";
      } else if (platform === 'youtube') {
        errorMessage = "YouTube connection failed";
        actionMessage = "Please reconnect YouTube now - check your Google account permissions";
      }

      toast({
        title: errorMessage,
        description: actionMessage || error.message || "Failed to initiate connection",
        variant: "destructive",
        duration: 8000 // Longer duration for actionable messages
      });
      setConnecting(prev => ({ ...prev, [platform]: false }));
    }
  };

  // Reconnect platform token
  const handleReconnect = async (platform: string) => {
    try {
      setReconnecting(prev => ({ ...prev, [platform]: true }));
      
      // First try token refresh
      const refreshResponse = await fetch(`/api/oauth/refresh/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      const refreshData = await refreshResponse.json();
      
      if (refreshData.refreshResult?.success) {
        // Token refresh successful - refresh connection data
        await queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
        toast({
          title: "Token Refreshed",
          description: `${platform} token has been successfully refreshed`
        });
      } else if (refreshData.refreshResult?.needs_reauth) {
        // Token refresh failed, needs re-authentication - use popup for OAuth
        toast({
          title: "Re-authentication Required",
          description: `Opening ${platform} OAuth flow...`
        });
        
        // Map platform names to OAuth routes
        const oauthRoutes: { [key: string]: string } = {
          'facebook': '/api/auth/facebook',
          'instagram': '/api/auth/instagram',
          'linkedin': '/api/auth/linkedin',
          'x': '/api/auth/twitter',
          'youtube': '/api/auth/youtube'
        };
        
        const oauthUrl = oauthRoutes[platform];
        if (oauthUrl) {
          // Use popup window for OAuth
          const popup = window.open(
            oauthUrl,
            'oauth',
            'width=600,height=700,scrollbars=yes,resizable=yes'
          );
          
          if (popup) {
            // Monitor popup for completion
            const checkClosed = setInterval(() => {
              if (popup.closed) {
                clearInterval(checkClosed);
                
                // Refresh connection data after OAuth completion
                setTimeout(() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
                }, 1000);
              }
            }, 1000);
          }
        }
      } else {
        // Other failure - show error
        toast({
          title: "Token Refresh Failed",
          description: refreshData.refreshResult?.error || 'Unknown error occurred',
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Reconnect Failed",
        description: `Failed to reconnect ${platform}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setReconnecting(prev => ({ ...prev, [platform]: false }));
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
    
    // Get all connections for this platform and return the most recent one
    const platformConnections = connections.filter((conn: PlatformConnection) => 
      conn.platform === platform && conn.isActive
    );
    
    if (platformConnections.length === 0) return null;
    
    // Sort by connection date (most recent first) and return the first one
    return platformConnections.sort((a, b) => 
      new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
    )[0];
  };

  const getConnectionStatus = (platform: string) => {
    const connection = getConnection(platform);
    if (!connection) return 'disconnected';
    
    // Check OAuth token validity
    if (connection.oauthStatus?.isValid === false) {
      return 'expired';
    }
    
    return connection.isActive ? 'connected' : 'disconnected';
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <BackButton to="/brand-purpose" label="Back to Brand Purpose" />
          <Button 
            onClick={() => setLocation('/schedule')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Back to Dashboard
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Platforms</h1>
          <p className="text-gray-600 text-lg">
            Connect your social media accounts to enable automated posting with real API credentials
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(platformConfig).map(([platform, config]) => {
            const connected = isConnected(platform);
            const connection = getConnection(platform);
            const connectionStatus = getConnectionStatus(platform);
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
                      {connectionStatus === 'connected' ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : connectionStatus === 'expired' ? (
                        <Badge className="text-xs bg-red-100 text-red-800 border-red-300">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Expired - Reconnect
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Disconnected
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {config.description}
                  </p>

                  {connectionStatus === 'connected' && connection ? (
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
                  ) : connectionStatus === 'expired' && connection ? (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">Account: {connection.platformUsername}</p>
                        <p className="text-red-600">
                          Token expired - reconnection required
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleReconnect(platform)}
                          className="flex-1 hover:bg-yellow-700 bg-[#3250fa] text-[#fff]"
                          disabled={reconnecting[platform]}
                        >
                          {reconnecting[platform] ? 'Reconnecting...' : 'Reconnect'}
                        </Button>
                        <Button
                          onClick={() => disconnectMutation.mutate(platform)}
                          variant="outline"
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                          disabled={disconnectMutation.isPending}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(config as PlatformConfig).pending ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Coming Soon
                          </p>
                          <p className="text-xs text-gray-500">
                            Connection coming soon
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
          
          {/* Training Wizard Sidebar */}
          <div className="xl:col-span-1">
            <OnboardingWizard />
          </div>
        </div>
      </div>

      <MasterFooter />
    </div>
  );
}