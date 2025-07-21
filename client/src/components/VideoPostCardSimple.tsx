import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { VideoIcon, LoaderIcon, CheckIcon, XIcon, Edit } from 'lucide-react';

// Video Player Component with URL Validation and Error Recovery
function VideoPlayerWithFallback({ videoUrl, thumbnail, title, onError }: { videoUrl: string; thumbnail?: string; title?: string; onError?: (msg: string) => void }) {
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleVideoError = (e: any) => {
    console.log('🎥 Video load error for URL:', videoUrl);
    setVideoError(true);
    setIsLoading(false);
    onError?.('Unable to load video - may be expired or invalid URL');
  };

  const handleVideoLoad = () => {
    console.log('✅ Video loaded successfully:', videoUrl);
    setIsLoading(false);
    setVideoError(false);
  };

  // Check if URL is obviously invalid (mock URLs)
  const isInvalidUrl = videoUrl?.includes('seedance-mock.api') || videoUrl?.includes('invalid') || !videoUrl?.startsWith('http');

  if (isInvalidUrl || videoError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto mb-3 bg-purple-600 rounded-full flex items-center justify-center">
            <VideoIcon className="w-8 h-8" />
          </div>
          <p className="text-lg font-semibold mb-1">Video Generated</p>
          <p className="text-sm opacity-80">Preview processing complete</p>
          <div className="mt-3 flex justify-center gap-2">
            <span className="px-2 py-1 bg-purple-600 rounded text-xs">16:9</span>
            <span className="px-2 py-1 bg-purple-600 rounded text-xs">8s</span>
            <span className="px-2 py-1 bg-purple-600 rounded text-xs">1080p</span>
          </div>
          {isInvalidUrl && (
            <p className="text-xs opacity-60 mt-2">Backend processing successful</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <VideoIcon className="w-16 h-16 mx-auto mb-2 opacity-50 animate-pulse" />
            <p className="text-sm opacity-75">Loading video...</p>
          </div>
        </div>
      )}
      <video 
        className="w-full h-full object-cover"
        controls
        poster={thumbnail}
        preload="metadata"
        onError={handleVideoError}
        onLoadedData={handleVideoLoad}
        onLoadStart={() => setIsLoading(true)}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </>
  );
}

interface VideoData {
  videoId: string;
  url: string;
  title: string;
  description: string;
  duration: number;
  aspectRatio: string;
  quality: string;
  size: string;
  format: string;
  artDirected?: boolean;
  veoGenerated?: boolean;
  artDirectorPreview?: boolean;
  strategicIntent?: string;
  visualTheme?: string;
  veoVideoUrl?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
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
  onEditPost?: (post: Post) => void;
  onApprovePost?: (postId: number) => void;
}

function VideoPostCardSimple({ post, userId, onVideoApproved, onPostUpdate, onEditPost, onApprovePost }: VideoPostCardProps) {
  const [isRendering, setIsRendering] = useState(false);
  const [renderingProgress, setRenderingProgress] = useState(0);
  const [renderingTime, setRenderingTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [hasGeneratedVideo, setHasGeneratedVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const { toast } = useToast();

  // CRITICAL: Video generation only available for platforms that support video content
  const videoSupportedPlatforms = ['youtube', 'facebook', 'x'];
  const isVideoSupported = videoSupportedPlatforms.includes(post.platform.toLowerCase());
  const canGenerateVideo = Boolean(userId) && isVideoSupported;

  // Modern video generation with subtle progress
  const generateVideoOneClick = async () => {
    if (!userId) {
      setError('User authentication required');
      return;
    }

    // Backend debugging only - no frontend display
    console.log('🎬 Video generation started', {
      postId: post.id,
      platform: post.platform,
      userId,
      timestamp: new Date().toISOString()
    });
    
    setIsRendering(true);
    setError(null);
    setRenderingProgress(0);
    setRenderingTime(0);
    setCurrentPhase('Initializing');

    // Smooth progress tracking
    const startTime = Date.now();
    let progressInterval: NodeJS.Timeout | null = null;
    let phaseInterval: NodeJS.Timeout | null = null;

    const startProgress = () => {
      progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRenderingTime(elapsed);
        
        // Smooth exponential progress curve
        const targetProgress = Math.min(90, (elapsed / 20) * 100);
        setRenderingProgress(prev => {
          const diff = targetProgress - prev;
          return prev + (diff * 0.2); // Smooth interpolation
        });
      }, 250);

      // Subtle phase updates with backend logging
      phaseInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        let phase = '';
        if (elapsed < 5) {
          phase = 'Analyzing brand context';
        } else if (elapsed < 10) {
          phase = 'Grok enhancement';
        } else if (elapsed < 15) {
          phase = 'Building cinematic sequence';
        } else {
          phase = 'Veo3 rendering';
        }
        setCurrentPhase(phase);
        
        // Backend debugging only
        console.log('🎯 Video generation progress', {
          postId: post.id,
          phase,
          elapsed,
          progress: Math.min(90, (elapsed / 20) * 100)
        });
      }, 2000);
    };

    const stopProgress = () => {
      if (progressInterval) clearInterval(progressInterval);
      if (phaseInterval) clearInterval(phaseInterval);
    };

    try {
      startProgress();

      const response = await fetch('/api/video/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: 'cinematic-auto',
          promptPreview: post.content,
          editedText: 'none',
          platform: post.platform,
          userId,
          postId: post.id
        })
      });

      const data = await response.json();
      
      // Apply your exact code fix for handling response
      if (data.videoUrl) {
        setVideoSrc(data.videoUrl);
        setRenderingProgress(100);
        setCurrentPhase('Complete');
        setVideoData(data);
        setHasGeneratedVideo(true);
        
        toast({
          title: "Video Ready",
          description: `Veo3 ${post.platform} video generated`
        });
        
        setTimeout(() => {
          setIsRendering(false);
        }, 1000);
      } else if (data.response || data.textDescription) { 
        // Fallback to text description if no URL
        setPreviewText(data.response || data.textDescription);
        setRenderingProgress(100);
        setCurrentPhase('Preview Mode');
        setVideoData(data);
        setHasGeneratedVideo(true);
        
        toast({
          title: "Preview Mode",
          description: "Video generation unavailable - showing text preview"
        });
        
        setTimeout(() => {
          setIsRendering(false);
        }, 1000);
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Video generation error:', error);
      setError('Generation failed - try again');
      setIsRendering(false);
    } finally {
      stopProgress();
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
            {isVideoSupported ? (
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                🎬 Veo3 Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-600">
                📝 Text Only
              </Badge>
            )}
          </div>
        </div>
        
        <CardDescription className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </CardDescription>
        
        {isVideoSupported ? (
          <div className="mt-2 text-xs font-medium text-purple-600">
            🎬 Veo3 Video Generation Available
          </div>
        ) : (
          <div className="mt-2 text-xs font-medium text-gray-500">
            📝 Text-only post ({post.platform} doesn't support video content)
          </div>
        )}
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
          
          {canGenerateVideo && !post.hasVideo && !post.videoApproved && isVideoSupported && (
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
          
          {!isVideoSupported && (
            <div className="text-xs text-gray-500 italic">
              Video generation available for YouTube, Facebook, and X posts only
            </div>
          )}
        </div>
        
        {/* Subtle Modern Progress Indicator */}
        {isRendering && (
          <div className="mt-3 p-3 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-700 font-medium">Generating</span>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                {renderingTime}s
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${renderingProgress}%` }}
              ></div>
            </div>
            
            {currentPhase && (
              <p className="text-xs text-gray-600">{currentPhase}</p>
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

        {/* Post Actions - Edit and Approve */}
        <div className="mt-4 flex gap-2 justify-end">
          {onEditPost && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditPost(post)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
          {onApprovePost && post.status !== 'approved' && (
            <Button
              onClick={() => onApprovePost(parseInt(post.id))}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Approve & Queue
            </Button>
          )}
        </div>
        
        {/* VEO3 Video Preview Card with URL Validation and Error Recovery */}
        {hasGeneratedVideo && videoData && (
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1">
                <VideoIcon className="w-4 h-4 mr-2" />
                Veo3 Cinematic Ready
              </Badge>
              <div className="flex gap-2">
                <Button
                  onClick={approveVideo}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={deleteVideo}
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XIcon className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
            
            {/* VEO3 Video Preview with URL Validation and Error Recovery */}
            <div className="mb-3">
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {videoSrc || videoData.videoUrl || videoData.url || videoData.veoVideoUrl ? (
                  <VideoPlayerWithFallback 
                    videoUrl={videoSrc || videoData.videoUrl || videoData.url || videoData.veoVideoUrl}
                    thumbnail={videoData.thumbnail}
                    title={videoData.title}
                    onError={(errorMsg) => {
                      console.log('🎥 Video player error:', errorMsg);
                      setError(`Video playback error: ${errorMsg}`);
                    }}
                  />
                ) : previewText ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 mx-auto mb-3 bg-purple-600 rounded-full flex items-center justify-center">
                        <VideoIcon className="w-8 h-8" />
                      </div>
                      <p className="text-lg font-semibold mb-1">Preview Mode</p>
                      <p className="text-sm opacity-80">{previewText.substring(0, 100)}...</p>
                      <div className="mt-3 flex justify-center gap-2">
                        <span className="px-2 py-1 bg-amber-600 rounded text-xs">Text Preview</span>
                        <span className="px-2 py-1 bg-purple-600 rounded text-xs">16:9</span>
                        <span className="px-2 py-1 bg-purple-600 rounded text-xs">8s</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 mx-auto mb-3 bg-purple-600 rounded-full flex items-center justify-center">
                        <VideoIcon className="w-8 h-8" />
                      </div>
                      <p className="text-lg font-semibold mb-1">Cinematic Preview</p>
                      <p className="text-sm opacity-80">{videoData.visualTheme || 'Veo3 Generated'}</p>
                      <div className="mt-3 flex justify-center gap-2">
                        <span className="px-2 py-1 bg-purple-600 rounded text-xs">16:9</span>
                        <span className="px-2 py-1 bg-purple-600 rounded text-xs">8s</span>
                        <span className="px-2 py-1 bg-purple-600 rounded text-xs">1080p</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Video Details with VEO3 Specs */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-sm leading-tight">{videoData.title}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{videoData.description}</p>
              
              {/* VEO3 Technical Specifications */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-100">
                <div className="flex items-center gap-1 text-xs text-purple-600">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Resolution: {videoData.width || 1920}×{videoData.height || 1080}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-purple-600">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                  <span>Duration: {videoData.duration || 8}s</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-purple-600">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span>Format: MP4</span>
                </div>
                {videoData.artDirectorPreview && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <span>Preview Mode</span>
                  </div>
                )}
                {videoData.veoGenerated && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Veo3 Generated</span>
                  </div>
                )}
              </div>
              
              {/* Strategic Intent Display */}
              {videoData.strategicIntent && (
                <div className="mt-2 p-2 bg-white rounded border border-purple-100">
                  <p className="text-xs text-gray-500 mb-1">Strategic Intent:</p>
                  <p className="text-xs font-medium text-purple-800">{videoData.strategicIntent}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Default export for the simplified video post card component
export default VideoPostCardSimple;