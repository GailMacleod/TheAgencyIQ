import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface RepairResult {
  success: boolean;
  repaired: number;
  failed: number;
  requiresManualAuth: string[];
  retriedPosts: number;
  message: string;
}

export default function OAuthRepairDashboard() {
  const [isRepairing, setIsRepairing] = useState(false);
  const [lastResult, setLastResult] = useState<RepairResult | null>(null);
  const { toast } = useToast();

  const handleRepairTokens = async () => {
    setIsRepairing(true);
    try {
      const response = await fetch('/api/repair-oauth-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      
      setLastResult(result);
      
      toast({
        title: result.success ? "OAuth Repair Complete" : "OAuth Repair Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
      
    } catch (error: any) {
      toast({
        title: "Repair Failed",
        description: "Failed to repair OAuth tokens",
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Platform Connection Repair
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            All posts are failing because platform OAuth tokens are expired or invalid. 
            Use this tool to validate and repair your social media connections.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleRepairTokens}
          disabled={isRepairing}
          className="w-full"
        >
          {isRepairing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Repairing Connections...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Repair OAuth Tokens
            </>
          )}
        </Button>

        {lastResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Repaired: {lastResult.repaired}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm">Failed: {lastResult.failed}</span>
              </div>
            </div>

            {lastResult.retriedPosts > 0 && (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Posts Retried: {lastResult.retriedPosts}</span>
              </div>
            )}

            {lastResult.requiresManualAuth.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Platforms requiring re-authentication:</p>
                    <div className="flex flex-wrap gap-2">
                      {lastResult.requiresManualAuth.map(platform => (
                        <Badge key={platform} variant="destructive">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm mt-2">
                      Go to Connect Platforms to re-authenticate these accounts.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>This tool will:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Validate all platform OAuth tokens</li>
            <li>Attempt automatic token refresh where possible</li>
            <li>Mark invalid connections for re-authentication</li>
            <li>Retry failed posts with valid connections</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}