import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { VideoIcon, LoaderIcon, CheckIcon, XIcon } from 'lucide-react';

interface VideoData {
  id: string;
  url: string;
  title: string;
  description: string;
  duration: number;
  aspectRatio: string;
  quality: string;
  size: string;
  artDirected: boolean;
  realVideo: boolean;
}

interface Post {
  id: string;
  platform: string;
  content: string;
  status: string;
  scheduledFor?: string;
  hasVideo?: boolean;
  videoApproved?: boolean;
  videoData?: VideoData;
}

interface VideoPostCardProps {
  post: Post;
  userId?: string;
  onVideoApproved: (postId: string, videoData: VideoData) => void;
  onPostUpdate?: () => void;
}

function VideoPostCardSimple({ post, userId, onVideoApproved, onPostUpdate }: VideoPostCardProps) {
  const [isRendering, setIsRendering] = useState(false);
  const [renderingProgress, setRenderingProgress] = useState(0);
  const [renderingTime, setRenderingTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [hasGeneratedVideo, setHasGeneratedVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const canGenerateVideo = Boolean(userId);

  // One-click video generation function
  const generateVideoOneClick = async () => {
    if (!userId) {
      setError('User authentication required');
      return;
    }

    try {
      setIsRendering(true);
      setError(null);
      setRenderingProgress(0);
      setRenderingTime(0);
      setCurrentPhase('Initializing Veo3 Generation...');

      // Progress timer
      const startTime = Date.now();
      const progressTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRenderingTime(elapsed);
        setRenderingProgress(prev => Math.min(prev + 2, 95));
      }, 500);

      // Phase updates
      const phaseTimer = setInterval(() => {
        setCurrentPhase(prev => {
          if (prev.includes('Initializing')) return 'Creating Cinematic Business Scenario';
          if (prev.includes('Cinematic')) return 'Applying MayorkingAI Techniques';
          if (prev.includes('MayorkingAI')) return 'Generating Veo3 Video';
          if (prev.includes('Generating')) return 'Finalizing Video Content';
          if (prev.includes('Finalizing')) return 'Video Generation Complete';
          return prev;
        });
      }, 3000);

      // Direct one-click generation without prompt selection
      const response = await fetch('/api/video/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: 'cinematic-auto', // Auto-select best cinematic prompt
          promptPreview: post.content,
          editedText: 'none',
          platform: post.platform,
          userId,
          postId: post.id
        })
      });

      const data = await response.json();

      clearInterval(progressTimer);
      clearInterval(phaseTimer);

      if (data.success && data.videoData) {
        setRenderingProgress(100);
        setCurrentPhase('✅ Veo3 Video Generation Complete!');
        setVideoData(data.videoData);
        setHasGeneratedVideo(true);
        
        toast({
          title: "Video Generated Successfully!",
          description: `Cinematic ${post.platform} video ready for approval`
        });
      } else {
        setError(data.error || 'Video generation failed');
      }
    } catch (error) {
      console.error('One-click video generation failed:', error);
      setError('Video generation temporarily unavailable');
    } finally {
      setIsRendering(false);
    }
  };

  const approveVideo = async () => {
    if (!videoData || !userId) return;

    try {
      const response = await fetch('/api/video/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          postId: post.id,
          videoData
        })
      });

      const data = await response.json();

      if (data.success) {
        onVideoApproved(post.id, videoData);
        toast({
          title: "Video Approved!",
          description: "Video ready for publishing"
        });
        onPostUpdate?.();
      } else {
        setError('Failed to approve video');
      }
    } catch (error) {
      console.error('Video approval failed:', error);
      setError('Failed to approve video');
    }
  };

  const deleteVideo = () => {
    setVideoData(null);
    setHasGeneratedVideo(false);
    setError(null);
    toast({
      title: "Video Deleted",
      description: "Reverted to text-only post"
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">
              {post.platform} Post
            </CardTitle>
            {post.scheduledFor && (
              <div className="text-xs text-gray-600">
                {new Date(post.scheduledFor).toLocaleDateString('en-AU', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })} at {new Date(post.scheduledFor).toLocaleTimeString('en-AU', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={post.status === 'approved' ? 'default' : 'secondary'}>
              {post.status}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              🎬 Veo3 Ready
            </Badge>
          </div>
        </div>
        
        <CardDescription className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </CardDescription>
        
        <div className="mt-2 text-xs font-medium text-purple-600">
          Cinematic Video Generation Available
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasGeneratedVideo && (
              <Badge variant="outline" className="text-xs">
                <VideoIcon className="w-3 h-3 mr-1" />
                Video Ready
              </Badge>
            )}
          </div>
          
          {canGenerateVideo && !post.hasVideo && !post.videoApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={generateVideoOneClick}
              disabled={isRendering || hasGeneratedVideo}
              aria-label="Generate cinematic video for this post"
            >
              {isRendering ? (
                <>
                  <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                  Creating Video... ({renderingTime}s)
                </>
              ) : (
                <>
                  <VideoIcon className="w-4 h-4 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Simple Progress Display for One-Click Generation */}
        {isRendering && (
          <div className="mt-4 space-y-2">
            <Progress value={renderingProgress} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{renderingProgress}% complete</span>
              <span>{renderingTime}s elapsed</span>
            </div>
            {currentPhase && (
              <p className="text-xs text-purple-600 text-center">{currentPhase}</p>
            )}
          </div>
        )}
        
        {/* Simple Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setError(null)}
            >
              Try Again
            </Button>
          </div>
        )}
        
        {/* Simple Video Display */}
        {hasGeneratedVideo && videoData && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-purple-600 text-white">
                <VideoIcon className="w-3 h-3 mr-1" />
                Veo3 Video Ready
              </Badge>
              <div className="flex gap-2">
                <Button
                  onClick={approveVideo}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={deleteVideo}
                  variant="outline"
                  size="sm"
                >
                  <XIcon className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
            <p className="text-xs text-purple-600">{videoData.title}</p>
            <p className="text-xs text-purple-500">{videoData.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Default export for the simplified video post card component
export default VideoPostCardSimple;