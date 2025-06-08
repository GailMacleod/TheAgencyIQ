import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import MasterHeader from "@/components/master-header";
import MasterFooter from "@/components/master-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";
import { SiFacebook, SiInstagram, SiLinkedin, SiYoutube, SiTiktok, SiX } from "react-icons/si";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function PlatformConnections() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch existing platform connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ["/api/platform-connections"],
  });

  const connectedPlatforms = Array.isArray(connections) ? connections.map((conn: any) => conn.platform) : [];

  // Handle OAuth callback messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');
    
    if (connected) {
      toast({
        title: "Platform Connected",
        description: `${connected} has been connected successfully`,
      });
      // Clear URL parameters
      window.history.replaceState({}, '', '/platform-connections');
    }
    
    if (error) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect platform: ${error.replace(/_/g, ' ')}`,
        variant: "destructive",
      });
      // Clear URL parameters
      window.history.replaceState({}, '', '/platform-connections');
    }
  }, [toast]);

  const platforms = [
    { id: 'facebook', name: 'facebook', icon: SiFacebook, color: 'platform-facebook' },
    { id: 'instagram', name: 'instagram', icon: SiInstagram, color: 'platform-instagram' },
    { id: 'linkedin', name: 'linkedin', icon: SiLinkedin, color: 'platform-linkedin' },
    { id: 'youtube', name: 'youtube', icon: SiYoutube, color: 'platform-youtube' },
    { id: 'tiktok', name: 'tiktok', icon: SiTiktok, color: 'platform-tiktok' },
    { id: 'x', name: 'x (twitter)', icon: SiX, color: 'platform-x' },
  ];

  const connectPlatform = async (platformId: string) => {
    setLoading(platformId);
    console.log(`Connecting platform: ${platformId}`);
    
    // Get platform-specific credentials from user
    const platform = platforms.find(p => p.id === platformId);
    let username = '';
    let password = '';
    
    if (platformId === 'facebook' || platformId === 'instagram') {
      username = window.prompt(`Enter your ${platform?.name} email or phone:`) || '';
      password = window.prompt(`Enter your ${platform?.name} password:`) || '';
    } else if (platformId === 'linkedin') {
      username = window.prompt(`Enter your LinkedIn email:`) || '';
      password = window.prompt(`Enter your LinkedIn password:`) || '';
    } else if (platformId === 'youtube') {
      username = window.prompt(`Enter your Google email (for YouTube):`) || '';
      password = window.prompt(`Enter your Google password:`) || '';
    } else if (platformId === 'tiktok') {
      username = window.prompt(`Enter your TikTok username or email:`) || '';
      password = window.prompt(`Enter your TikTok password:`) || '';
    } else if (platformId === 'x') {
      username = window.prompt(`Enter your X (Twitter) username or email:`) || '';
      password = window.prompt(`Enter your X (Twitter) password:`) || '';
    }
    
    if (!username || !password) {
      setLoading(null);
      return;
    }
    
    try {
      const response = await apiRequest("POST", "/api/connect-platform", {
        platform: platformId,
        username,
        password
      });
      
      // Log successful connection and store token in localStorage
      if (response && response.accessToken) {
        console.log(`token_${platformId}: ${response.accessToken}`);
        localStorage.setItem(`token_${platformId}`, response.accessToken);
      } else {
        console.log(`token_${platformId}: success but no token returned`);
      }
      
      toast({
        title: "Platform Connected",
        description: `${platform?.name} has been connected successfully`,
      });
      
      // Refresh the page to show updated connections
      window.location.reload();
      
    } catch (error: any) {
      console.log(`token_${platformId}: error - ${error.message || 'connection failed'}`);
      toast({
        title: "Connection Failed",
        description: error.message || `Failed to connect ${platform?.name}`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const disconnectPlatform = async (platformId: string) => {
    setLoading(platformId);
    console.log(`Disconnecting platform: ${platformId}`);
    
    try {
      await apiRequest("DELETE", `/api/platform-connections/${platformId}`, {});
      
      // Remove token from localStorage
      localStorage.removeItem(`token_${platformId}`);
      console.log(`token_${platformId}: removed from localStorage`);
      
      toast({
        title: "Platform Disconnected",
        description: `${platformId} has been disconnected successfully`,
      });
      
      // Refresh the page to show updated connections
      window.location.reload();
      
    } catch (error: any) {
      console.log(`disconnect_${platformId}: error - ${error.message || 'disconnection failed'}`);
      toast({
        title: "Disconnection Failed",
        description: error.message || `Failed to disconnect ${platformId}`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleNext = async () => {
    try {
      // Generate content calendar
      await apiRequest("POST", "/api/generate-content-calendar", {});
      
      toast({
        title: "Content Calendar Generated",
        description: "Your content calendar has been created",
      });
      
      setLocation("/schedule");
    } catch (error: any) {
      console.error("Content generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate content calendar",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MasterHeader />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <p className="text-sm text-foreground lowercase">step 3 of 3</p>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div className="bg-primary h-2 rounded-full w-full"></div>
          </div>
        </div>

        <Card className="card-agencyiq">
          <CardContent className="p-8">
            <h2 className="text-heading font-light text-foreground text-center mb-8 lowercase">
              connect your platforms
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {platforms.map((platform) => {
                const isConnected = connectedPlatforms.includes(platform.id);
                const isLoading = loading === platform.id;
                const Icon = platform.icon;

                return (
                  <div
                    key={platform.id}
                    className={`relative border rounded-xl p-4 text-center transition-all duration-200 ${
                      isConnected 
                        ? 'border-green-300 bg-green-50 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Success tick overlay */}
                    {isConnected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    <div className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-medium text-foreground mb-3 text-sm lowercase">{platform.name}</h3>
                    
                    {isConnected ? (
                      <div className="space-y-2">
                        <Button
                          disabled
                          className="w-full bg-green-100 text-green-700 cursor-not-allowed text-xs py-2 h-8 border border-green-200"
                          variant="outline"
                        >
                          connected
                        </Button>
                        <Button
                          onClick={() => disconnectPlatform(platform.id)}
                          className="w-full text-xs py-2 h-8 text-red-600 border-red-200 hover:bg-red-50"
                          variant="outline"
                          disabled={isLoading}
                        >
                          {isLoading ? 'disconnecting...' : 'disconnect'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => connectPlatform(platform.id)}
                        className="w-full text-xs py-2 h-8"
                        variant="outline"
                        disabled={isLoading}
                      >
                        {isLoading ? 'connecting...' : 'connect'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <Button
                onClick={handleNext}
                className="btn-secondary px-8 py-3"
                disabled={connectedPlatforms.length === 0}
              >
                next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <MasterFooter />
    </div>
  );
}
