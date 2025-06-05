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

  const connectedPlatforms = connections.map((conn: any) => conn.platform);

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
    try {
      setLoading(platformId);
      
      // For platforms with configured OAuth credentials, redirect to OAuth endpoint
      if (['facebook', 'instagram', 'linkedin', 'x'].includes(platformId)) {
        window.location.href = `/api/auth/${platformId}`;
      } else {
        // For demo purposes, simulate connection for other platforms
        setTimeout(() => {
          toast({
            title: "Platform Connected",
            description: `${platformId} has been connected successfully (demo)`,
          });
          setLoading(null);
        }, 2000);
      }
      
    } catch (error: any) {
      console.error("Platform connection error:", error);
      toast({
        title: "Connection Failed",
        description: `Failed to connect ${platformId}`,
        variant: "destructive",
      });
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
      <MasterHeader showBack="/brand-purpose" />
      
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
                      <Button
                        disabled
                        className="w-full bg-green-100 text-green-700 cursor-not-allowed text-xs py-2 h-8 border border-green-200"
                        variant="outline"
                      >
                        connected
                      </Button>
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
