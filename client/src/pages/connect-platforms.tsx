import { useLocation } from "wouter";
import { Facebook, Instagram, Linkedin, Youtube, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
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
    name: "X",
    icon: SiX,
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
  const [reconnecting, setReconnecting] = useState<{[key: string]: boolean}>({});

  // UNIFIED STATE MANAGEMENT: Single source of truth from /api/platform-connections
  const { data: connections = [], isLoading, refetch } = useQuery<PlatformConnection[]>({
    queryKey: ['/api/platform-connections'],
    retry: 2,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // More frequent refresh for better UI sync
    staleTime: 0 // Always consider data stale to force refresh
  });

  // Derive connection state from single source of truth
  const platformConnectionState = useMemo(() => {
    const state: {[key: string]: boolean} = {};
    connections.forEach(conn => {
      // Use database connection status as single source of truth
      // A connection is considered active if it exists and is marked as active in the database
      if (conn.isActive) {
        state[conn.platform] = true;
      }
    });
    
    // Debug logging for connection state changes
    console.log('🔄 Platform connection state updated:', {
      totalConnections: connections.length,
      activeConnections: Object.keys(state).length,
      platformStates: state,
      connections: connections.map(c => ({
        platform: c.platform,
        id: c.id,
        isActive: c.isActive,
        username: c.platformUsername
      }))
    });
    
    return state;
  }, [connections]);

  // Unified OAuth success/failure message handling
  useEffect(() => {
    if (!refetch) return; // Ensure refetch is defined

    const handleMessage = (e: MessageEvent) => {
      console.log('OAuth popup message received:', e.data);
      
      if (e.data === 'oauth_success') {
        // Clear connecting states
        setConnecting({});
        setReconnecting({});
        
        // Force refresh of unified connection state with multiple attempts
        queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
        
        // Sequential refresh attempts
        setTimeout(() => {
          refetch();
        }, 500);
        
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          refetch();
        }, 1500);
        
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          refetch();
        }, 3000);
        
        toast({
          title: "Connection Successful",
          description: "Platform has been connected successfully",
          variant: "default",
          duration: 4000
        });
      } else if (e.data === 'oauth_failure') {
        // Clear connecting states
        setConnecting({});
        setReconnecting({});
        
        toast({
          title: "OAuth Failed",
          description: "Authentication failed. Please try again.",
          variant: "destructive",
          duration: 5000
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetch, toast, queryClient]);

  // Refresh connection data when returning from OAuth callback
  useEffect(() => {
    if (!refetch) return; // Ensure refetch is defined

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') || urlParams.get('success')) {
      // OAuth callback success - refresh unified connection state with multiple attempts
      queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
      
      setTimeout(() => {
        refetch();
      }, 500);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
        refetch();
      }, 1500);
      
      // Clean up URL parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [refetch, queryClient]);

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
          // Force refresh of unified connection state and invalidate cache
          queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          refetch();
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
      
      // Listen for OAuth completion messages
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data === 'oauth_success') {
          console.log(`✅ OAuth success for ${platform}`);
          
          // Delay popup close to allow for processing
          setTimeout(() => {
            popup.close();
          }, 2000);
          
          // Clear connecting state
          setConnecting(prev => ({ ...prev, [platform]: false }));
          
          // Force refresh of unified connection state with multiple attempts
          queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          
          // Sequential refresh attempts to ensure state sync
          setTimeout(() => {
            refetch();
          }, 500);
          
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
            refetch();
          }, 1500);
          
          // Show success message
          toast({
            title: "Connection Successful",
            description: `Successfully connected to ${platform}`,
            variant: "default",
            duration: 4000
          });
        } else if (event.data === 'oauth_failure') {
          console.log(`❌ OAuth failure for ${platform}`);
          
          // Delay popup close to show error
          setTimeout(() => {
            popup.close();
          }, 1500);
          
          // Clear connecting state
          setConnecting(prev => ({ ...prev, [platform]: false }));
          
          toast({
            title: "Connection Failed",
            description: `Failed to connect to ${platform}. Please try again.`,
            variant: "destructive",
            duration: 5000
          });
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Monitor popup for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          
          // Always clear connecting state when popup closes
          setConnecting(prev => ({ ...prev, [platform]: false }));
          
          // Force refresh of unified connection state with extended timing
          queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          
          // Multiple refresh attempts to ensure state sync
          setTimeout(() => {
            refetch();
          }, 500);
          
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
            refetch();
          }, 1500);
          
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
            refetch();
          }, 3000);
        }
      }, 1000);
    } catch (error: any) {
      // Enhanced user-friendly error messages
      let errorMessage = "Failed to initiate connection";
      let actionMessage = "";

      if (platform === 'x') {
        errorMessage = "X connection failed";
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
    } finally {
      // Always clear connecting state
      setConnecting(prev => ({ ...prev, [platform]: false }));
    }
  };

  // Reconnect platform token
  const handleReconnect = async (platform: string) => {
    try {
      setReconnecting(prev => ({ ...prev, [platform]: true }));
      
      // Map platform names to OAuth routes with force_reauth
      const oauthRoutes: { [key: string]: string } = {
        'facebook': '/api/auth/facebook?force_reauth=true',
        'instagram': '/api/auth/instagram?force_reauth=true',
        'linkedin': '/api/auth/linkedin?force_reauth=true',
        'x': '/api/auth/x?force_reauth=true',
        'youtube': '/api/auth/youtube?force_reauth=true'
      };
      
      const oauthUrl = oauthRoutes[platform];
      if (!oauthUrl) {
        throw new Error(`OAuth not configured for ${platform}`);
      }
      
      // Open OAuth popup
      const popup = window.open(
        oauthUrl,
        'oauth',
        'width=600,height=700'
      );
      
      if (!popup) {
        throw new Error('Popup blocked - please allow popups for OAuth');
      }
      
      // Monitor popup for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          
          // Always clear reconnecting state when popup closes
          setReconnecting(prev => ({ ...prev, [platform]: false }));
          
          // Force refresh of unified connection state and invalidate cache
          queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
          setTimeout(() => {
            refetch();
          }, 1000);
        }
      }, 1000);
      
    } catch (error: any) {
      toast({
        title: "Reconnection Failed",
        description: error.message || "Failed to reconnect platform",
        variant: "destructive"
      });
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
      // Force refresh of unified connection state and invalidate cache
      queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
      refetch();
      
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

  // Test publishing functionality with automatic token refresh
  const testPublishMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/direct-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'test_publish_all',
          content: 'OAuth Token Test - Platform Connection Verification',
          platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Force refresh of unified connection state and invalidate cache
      queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
      refetch();
      
      const successCount = data.summary?.successCount || 0;
      const failureCount = data.summary?.failureCount || 0;
      
      if (successCount > 0) {
        toast({
          title: "Test Publishing Successful",
          description: `Published to ${successCount} platforms successfully. ${failureCount} failed.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Test Publishing Failed",
          description: "All platforms failed publishing. Please reconnect your OAuth accounts.",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Test Publishing Failed", 
        description: "Failed to test publish. Please check your connections.",
        variant: "destructive"
      });
    }
  });





  const isConnected = (platform: string) => {
    // Use unified connection state derived from database
    return platformConnectionState[platform] === true;
  };

  const getConnection = (platform: string) => {
    if (!connections || !Array.isArray(connections)) return null;
    
    // Get all connections for this platform and return the most recent one
    const platformConnections = connections.filter((conn: PlatformConnection) => 
      conn.platform === platform && conn.isActive
    );
    
    if (platformConnections.length === 0) return null;
    
    // Sort by connection date (most recent first) and return the first one
    const mostRecentConnection = platformConnections.sort((a, b) => 
      new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
    )[0];
    
    return mostRecentConnection;
  };

  const getConnectionStatus = (platform: string) => {
    const connection = getConnection(platform);
    if (!connection) return 'disconnected';
    
    // Check OAuth token validity if available
    if (connection.oauthStatus?.isValid === false) {
      return 'expired';
    }
    
    // If connection exists and is active, it's connected
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
          <div className="mt-4 flex justify-center gap-4">
            <Button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
                refetch();
                toast({
                  title: "Refreshed",
                  description: "Connection status updated",
                  variant: "default"
                });
              }}
              variant="outline"
              size="sm"
            >
              Refresh Status
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3">
            <div className="space-y-4">
              {Object.entries(platformConfig).map(([platform, config]) => {
                const connected = isConnected(platform);
                const connection = getConnection(platform);
                const connectionStatus = getConnectionStatus(platform);
                const Icon = config.icon;
                
                // Debug logging for button state
                console.log(`🔘 Button state for ${platform}:`, {
                  connected,
                  connectionStatus,
                  hasConnection: !!connection,
                  platformConnectionState: platformConnectionState[platform]
                });
                
                return (
                  <Card key={platform} className="w-full mb-4">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-6 flex-1">
                          <div className={`p-3 rounded-lg ${config.color} text-white flex-shrink-0`}>
                            <Icon className="w-8 h-8" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">{config.name}</h3>
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
                                <Badge className="bg-gray-100 text-gray-800 text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Disconnected
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {config.description}
                            </p>
                            {connectionStatus === 'connected' && connection ? (
                              <div className="text-sm">
                                <p className="font-medium text-gray-900">Account: {connection.platformUsername}</p>
                                <p className="text-gray-500">
                                  Connected {new Date(connection.connectedAt).toLocaleDateString()}
                                </p>
                              </div>
                            ) : connectionStatus === 'expired' && connection ? (
                              <div className="text-sm">
                                <p className="font-medium text-gray-900">Account: {connection.platformUsername}</p>
                                <p className="text-red-600">
                                  Token expired - reconnection required
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 flex-shrink-0">
                          {connectionStatus === 'connected' && connection ? (
                            <Button
                              onClick={() => disconnectMutation.mutate(platform)}
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50 min-w-[120px]"
                              disabled={disconnectMutation.isPending}
                            >
                              Disconnect
                            </Button>
                          ) : connectionStatus === 'expired' && connection ? (
                            <>
                              <Button
                                onClick={() => handleReconnect(platform)}
                                className="text-white border-0 min-w-[160px]"
                                style={{ backgroundColor: '#00f0ff' }}
                                disabled={reconnecting[platform]}
                              >
                                {reconnecting[platform] ? 'Reconnecting...' : 'Expired - Reconnect'}
                              </Button>
                              <Button
                                onClick={() => disconnectMutation.mutate(platform)}
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 min-w-[120px]"
                                disabled={disconnectMutation.isPending}
                              >
                                Disconnect
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => handleOAuthConnect(platform)}
                              className="text-white border-0 min-w-[120px]"
                              style={{ backgroundColor: connectionStatus === 'connected' ? '#3250fa' : '#00f0ff' }}
                              disabled={connecting[platform]}
                            >
                              {connecting[platform] ? 'Connecting...' : 'CONNECT'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {connections && Array.isArray(connections) && connections.length > 0 && (
              <div className="mt-8 text-center space-y-4">
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={() => testPublishMutation.mutate()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={testPublishMutation.isPending}
                  >
                    {testPublishMutation.isPending ? 'Testing...' : 'Test Publishing'}
                  </Button>
                  <Button
                    onClick={() => setLocation("/intelligent-schedule")}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="lg"
                  >
                    Continue to AI Schedule
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Test publishing will verify OAuth tokens with automatic refresh and won't consume your quota
                </p>
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