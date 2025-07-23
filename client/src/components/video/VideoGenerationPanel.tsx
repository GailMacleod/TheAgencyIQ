import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Play, Download, Sparkles, Video, Clock, CheckCircle, XCircle } from 'lucide-react';

interface VideoJob {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  videoUri?: string;
  error?: string;
  ready: boolean;
  failed: boolean;
}

interface JTBDContext {
  situation: string;
  motivation: string;
  outcome: string;
  cinematicElements: string[];
}

export function VideoGenerationPanel() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [useJTBD, setUseJTBD] = useState(true);
  const [videoType, setVideoType] = useState<'cinematic' | 'documentary' | 'commercial'>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [duration, setDuration] = useState(30);
  const [businessContext, setBusinessContext] = useState({
    industry: '',
    targetAudience: '',
    location: 'Queensland, Australia'
  });
  const [currentJob, setCurrentJob] = useState<VideoJob | null>(null);
  const [jtbdContext, setJtbdContext] = useState<JTBDContext | null>(null);

  // Generate JTBD prompts query
  const { data: jtbdPrompts, isLoading: isLoadingPrompts } = useQuery({
    queryKey: ['/api/video/prompts/generate', businessContext],
    enabled: false // Only fetch when user requests
  });

  // Video generation mutation
  const generateVideoMutation = useMutation({
    mutationFn: async (videoData: any) => {
      const response = await apiRequest('/api/video/generate', {
        method: 'POST',
        body: JSON.stringify(videoData)
      });
      return response;
    },
    onSuccess: (data) => {
      setCurrentJob({
        jobId: data.jobId,
        status: 'PENDING',
        ready: false,
        failed: false
      });
      setJtbdContext(data.jtbdContext);
      
      toast({
        title: "Video Generation Started",
        description: `Cinematic video creation in progress. Estimated time: ${data.estimatedTime}`,
      });

      // Start polling for status
      pollVideoStatus(data.jobId);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to start video generation",
        variant: "destructive",
      });
    }
  });

  // Video status polling
  const pollVideoStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await apiRequest(`/api/video/status/${jobId}`);
        
        setCurrentJob(prev => prev ? {
          ...prev,
          status: status.status,
          videoUri: status.videoUri,
          error: status.error,
          ready: status.ready,
          failed: status.failed
        } : null);

        if (status.ready) {
          clearInterval(pollInterval);
          toast({
            title: "Video Ready!",
            description: "Your cinematic video has been generated successfully",
          });
        } else if (status.failed) {
          clearInterval(pollInterval);
          toast({
            title: "Generation Failed",
            description: status.error || "Video generation failed",
            variant: "destructive",
          });
        }
      } catch (error) {
        clearInterval(pollInterval);
        console.error('Status polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Clear polling after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000);
  };

  // Download video mutation
  const downloadVideoMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/video/download/${jobId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theagencyiq_video_${jobId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Download Started",
        description: "Your video is downloading now",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleGenerateVideo = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a video prompt",
        variant: "destructive",
      });
      return;
    }

    generateVideoMutation.mutate({
      prompt,
      useJTBD,
      videoType,
      aspectRatio,
      duration,
      businessContext
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'RUNNING':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getProgressValue = (status?: string) => {
    switch (status) {
      case 'PENDING': return 25;
      case 'RUNNING': return 75;
      case 'SUCCEEDED': return 100;
      case 'FAILED': return 0;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            VEO 2.0 Cinematic Video Generation
          </CardTitle>
          <CardDescription>
            Create professional cinematic videos for Queensland small businesses using AI and JTBD framework
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Video Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the video you want to create (e.g., 'A local café owner greeting customers with a warm smile while serving fresh coffee')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          {/* JTBD Enhancement */}
          <div className="flex items-center space-x-2">
            <Switch
              id="use-jtbd"
              checked={useJTBD}
              onCheckedChange={setUseJTBD}
            />
            <Label htmlFor="use-jtbd" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Enhance with Jobs-to-be-Done Framework
            </Label>
          </div>

          {/* Video Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Video Style</Label>
              <Select value={videoType} onValueChange={(value: any) => setVideoType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={(value: any) => setAspectRatio(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                min="15"
                max="60"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Business Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                placeholder="e.g., Restaurant, Retail, Consulting"
                value={businessContext.industry}
                onChange={(e) => setBusinessContext(prev => ({ ...prev, industry: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input
                placeholder="e.g., Local families, Young professionals"
                value={businessContext.targetAudience}
                onChange={(e) => setBusinessContext(prev => ({ ...prev, targetAudience: e.target.value }))}
              />
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateVideo}
            disabled={generateVideoMutation.isPending || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {generateVideoMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Starting Generation...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Generate Cinematic Video
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Job Status */}
      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(currentJob.status)}
              Video Generation Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Job ID: {currentJob.jobId}</span>
                <Badge variant={currentJob.ready ? 'default' : currentJob.failed ? 'destructive' : 'secondary'}>
                  {currentJob.status}
                </Badge>
              </div>
              <Progress value={getProgressValue(currentJob.status)} className="w-full" />
            </div>

            {currentJob.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-sm text-red-700 dark:text-red-300">{currentJob.error}</p>
              </div>
            )}

            {currentJob.ready && (
              <Button
                onClick={() => downloadVideoMutation.mutate(currentJob.jobId)}
                disabled={downloadVideoMutation.isPending}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* JTBD Context Display */}
      {jtbdContext && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              JTBD Framework Applied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Situation</Label>
                <p className="text-sm text-muted-foreground mt-1">{jtbdContext.situation}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Motivation</Label>
                <p className="text-sm text-muted-foreground mt-1">{jtbdContext.motivation}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Desired Outcome</Label>
                <p className="text-sm text-muted-foreground mt-1">{jtbdContext.outcome}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Cinematic Elements</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {jtbdContext.cinematicElements.map((element, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {element}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}