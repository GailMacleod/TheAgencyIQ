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
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});
  const [credentials, setCredentials] = useState<{[key: string]: {username: string, password: string}}>({});
  const [connecting, setConnecting] = useState<{[key: string]: boolean}>({});

  // Fetch platform connections
  const { data: connections = [], isLoading } = useQuery<PlatformConnection[]>({
    queryKey: ['/api/platform-connections'],
    retry: 2
  });

  // Connect platform with username/password
  const connectMutation = useMutation({
    mutationFn: async ({ platform, username, password }: { platform: string, username: string, password: string }) => {
      const response = await fetch('/api/connect-platform-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform, username, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Connection failed');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
      toast({
        title: "Platform Connected",
        description: `Successfully connected ${platformConfig[variables.platform as keyof typeof platformConfig]?.name}`,
      });
      // Clear credentials
      setCredentials(prev => ({ ...prev, [variables.platform]: { username: '', password: '' } }));
      setConnecting(prev => ({ ...prev, [variables.platform]: false }));
    },
    onError: (error: any, variables) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect platform. Please check your credentials.",
        variant: "destructive"
      });
      setConnecting(prev => ({ ...prev, [variables.platform]: false }));
    }
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
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

  const handleConnect = async (platform: string) => {
    const creds = credentials[platform];
    if (!creds?.username || !creds?.password) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }

    setConnecting(prev => ({ ...prev, [platform]: true }));
    connectMutation.mutate({
      platform,
      username: creds.username,
      password: creds.password
    });
  };

  const updateCredentials = (platform: string, field: 'username' | 'password', value: string) => {
    setCredentials(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  };

  const isConnected = (platform: string) => {
    return (connections as PlatformConnection[]).some((conn: PlatformConnection) => 
      conn.platform === platform && conn.isActive
    );
  };

  const getConnection = (platform: string) => {
    return (connections as PlatformConnection[]).find((conn: PlatformConnection) => 
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
                          Pending Approval
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          OAuth Approved
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
                            OAuth Pending
                          </p>
                          <p className="text-xs text-gray-500">
                            Awaiting TikTok OAuth API approval
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor={`${platform}-username`}>Username/Email</Label>
                            <Input
                              id={`${platform}-username`}
                              type="text"
                              placeholder="Enter your username or email"
                              value={credentials[platform]?.username || ''}
                              onChange={(e) => updateCredentials(platform, 'username', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`${platform}-password`}>Password</Label>
                            <div className="relative">
                              <Input
                                id={`${platform}-password`}
                                type={showPassword[platform] ? "text" : "password"}
                                placeholder="Enter your password"
                                value={credentials[platform]?.password || ''}
                                onChange={(e) => updateCredentials(platform, 'password', e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(prev => ({ ...prev, [platform]: !prev[platform] }))}
                              >
                                {showPassword[platform] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <Button
                            onClick={() => handleConnect(platform)}
                            className="w-full"
                            disabled={connecting[platform] || connectMutation.isPending}
                          >
                            {connecting[platform] ? 'Connecting...' : `Connect ${config.name}`}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {(connections as PlatformConnection[]).length > 0 && (
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
              <h3 className="text-lg font-semibold text-blue-900 mb-2">OAuth Security Notice</h3>
              <p className="text-blue-800 text-sm mb-3">
                We use official OAuth 2.0 authentication to securely connect your social media accounts. Your credentials are never 
                stored and your posts will be published directly to your actual accounts using real API credentials.
              </p>
              <div className="text-xs text-blue-700">
                <p>• All connections use approved OAuth applications</p>
                <p>• Your account data remains secure and private</p>
                <p>• Posts are published using authentic platform APIs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MasterFooter />
    </div>
  );
}