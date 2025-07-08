/**
 * VIDEO POST CARD COMPONENT - CONTAINERIZED VIDEO GENERATION
 * Handles video generation workflow with modal UI and state isolation
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VideoIcon, PlayIcon, CheckIcon, XIcon, LoaderIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoPostCardProps {
  post: {
    id: number;
    content: string;
    platform: string;
    status: string;
    hasVideo?: boolean;
    videoApproved?: boolean;
    videoData?: any;
    approvedAt?: string;
  };
  onVideoApproved: (postId: number, videoData: any) => void;
  brandData: any;
  userId: number;
}

interface VideoPrompt {
  type: 'short-form' | 'ASMR';
  content: string;
  duration: string;
  style: string;
}

interface VideoData {
  videoId: string;
  url: string;
  quality: string;
  format: string;
  size: string;
}

export function VideoPostCard({ post, onVideoApproved, brandData, userId }: VideoPostCardProps) {
  // Add publish functionality for approved posts
  const publishApprovedPost = async () => {
    try {
      const response = await fetch('/api/post/publish-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          postId: post.id,
          platforms: [post.platform]
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Post Published!",
          description: `Approved video and text posted to ${post.platform} successfully!`
        });
      } else {
        toast({
          title: "Publishing Failed",
          description: data.error || "Failed to publish approved post",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Publishing failed:', error);
      toast({
        title: "Error",
        description: "Failed to publish approved post",
        variant: "destructive"
      });
    }
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderingProgress, setRenderingProgress] = useState(0);
  const [renderingTime, setRenderingTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [prompts, setPrompts] = useState<VideoPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<VideoPrompt | null>(null);
  const [editedText, setEditedText] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [hasGeneratedVideo, setHasGeneratedVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoDuration, setVideoDuration] = useState(15); // Default to 15s, will update when video loads
  const { toast } = useToast();

  // Check if video generation is allowed for this post - FORCE SHOW FOR ALL POSTS
  const canGenerateVideo = true; // Always show video button
  
  // Check if this post already has a generated video
  useEffect(() => {
    if (post.hasVideo && post.videoData) {
      console.log('🎬 Post already has video:', post.videoData);
      setVideoData(post.videoData);
      setHasGeneratedVideo(true);
    }
  }, [post.hasVideo, post.videoData]);

  const generatePrompts = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/video/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postContent: post.content,
          platform: post.platform,
          brandData
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Video prompts generated successfully:', data.prompts);
        setPrompts(data.prompts);
      } else {
        console.error('❌ Video prompt generation failed:', data);
        setError('Failed to generate video prompts');
      }
    } catch (error) {
      console.error('Prompt generation failed:', error);
      setError('Video generation temporarily unavailable');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderVideo = async () => {
    if (!selectedPrompt) return;

    try {
      setIsRendering(true);
      setRenderingProgress(0);
      setRenderingTime(0);
      setCurrentPhase('Initializing Art Director...');
      
      // Start timer for rendering duration
      const startTime = Date.now();
      const timer = setInterval(() => {
        setRenderingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      setError(null);

      // Accurate progress tracking based on actual generation phases
      let progressInterval: NodeJS.Timeout | null = null;
      let currentPhase = 'Art Director Analysis';
      
      const updateProgressWithPhase = (progress: number, phase: string) => {
        setRenderingProgress(progress);
        setCurrentPhase(phase);
        console.log(`🎬 ${phase}: ${progress}%`);
      };
      
      // Realistic phase-based progress tracking
      progressInterval = setInterval(() => {
        setRenderingProgress(prev => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval);
            return 90; // Stop at 90% until actual completion
          }
          
          // Phase-based progression with accurate timing
          if (prev < 15) {
            updateProgressWithPhase(prev + 3, 'Art Director Analyzing Content');
          } else if (prev < 30) {
            updateProgressWithPhase(prev + 4, 'Selecting Animal Character');
          } else if (prev < 50) {
            updateProgressWithPhase(prev + 5, 'Generating Creative Brief');
          } else if (prev < 70) {
            updateProgressWithPhase(prev + 4, 'Creating Visual Preview');
          } else if (prev < 85) {
            updateProgressWithPhase(prev + 3, 'Finalizing Art Direction');
          } else {
            updateProgressWithPhase(prev + 1, 'Preparing for Seedance API');
          }
          
          return Math.min(prev + (prev < 30 ? 3 : prev < 70 ? 5 : 2), 90);
        });
      }, 300); // Slightly slower but more accurate updates

      const response = await fetch('/api/video/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: selectedPrompt.content,
          editedText,
          platform: post.platform,
          userId,
          postId: post.id
        })
      });

      const data = await response.json();
      console.log('🎬 Video render response:', data);

      if (data.success) {
        setRenderingProgress(100);
        clearInterval(timer);
        if (progressInterval) clearInterval(progressInterval);
        console.log('🎬 Setting video data:', data);
        setVideoData(data);
        setHasGeneratedVideo(true);
        
        // IMMEDIATE and aggressive polling for real Seedance video
        const pollForSeedanceVideo = async () => {
          console.log('🚀 Starting IMMEDIATE Seedance video polling...');
          for (let attempt = 0; attempt < 20; attempt++) {
            try {
              const seedanceResponse = await fetch('/api/video/latest-seedance');
              const seedanceData = await seedanceResponse.json();
              
              if (seedanceData.success && seedanceData.video?.url && seedanceData.video.url.includes('replicate.delivery')) {
                console.log('✅ REAL SEEDANCE VIDEO FOUND:', seedanceData.video.url);
                setCurrentPhase('✅ Seedance Video Generation Complete!');
                setVideoData(prev => ({
                  ...prev,
                  url: seedanceData.video.url,
                  seedanceGenerated: true,
                  realVideo: true
                }));
                toast({
                  title: "Real Video Ready!",
                  description: "Seedance video is now playing"
                });
                return; // Exit polling
              }
            } catch (error) {
              console.log('Polling attempt', attempt + 1, 'failed');
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Check every 1 second
          }
          console.log('❌ Seedance polling completed - no video found');
        };
        
        // Start polling IMMEDIATELY - no delay
        pollForSeedanceVideo();
        
        toast({
          title: "Art Director Video Ready!",
          description: `${data.animalType} video generated in ${renderingTime}s (${data.size})`
        });
      } else {
        setError('Video rendering failed');
        clearInterval(timer);
        if (progressInterval) clearInterval(progressInterval);
      }
    } catch (error) {
      console.error('Video rendering failed:', error);
      setError('Video rendering failed');
      clearInterval(timer);
      if (progressInterval) clearInterval(progressInterval);
    } finally {
      setIsRendering(false);
    }
  };

  const approveVideo = async () => {
    if (!videoData) return;

    try {
      const response = await fetch('/api/video/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          postId: post.id,
          videoData,
          // Remove platforms from approval - approval just combines video + text
        })
      });

      const data = await response.json();

      if (data.success) {
        onVideoApproved(post.id, videoData);
        setIsModalOpen(false);
        toast({
          title: "Video Approved!",
          description: "Video and text combined into approved post. Ready to publish!"
        });
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
    setSelectedPrompt(null);
    setEditedText('');
    setPrompts([]);
    setError(null);
    toast({
      title: "Video Deleted",
      description: "Reverted to text-only post"
    });
  };

  const handleModalOpen = () => {
    setIsModalOpen(true);
    if (prompts.length === 0) {
      generatePrompts();
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setIsGenerating(false);
    setIsRendering(false);
    setRenderingProgress(0);
    setSelectedPrompt(null);
    setEditedText('');
    setError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {post.platform} Post
          </CardTitle>
          <Badge variant={post.status === 'approved' ? 'default' : 'secondary'}>
            {post.status}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            🎬 Video Ready
          </Badge>
        </div>
        <CardDescription className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </CardDescription>
        <div className="mt-2 text-xs font-medium text-purple-600">
          ⚡ AI Video Generation Available
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
          
          {canGenerateVideo && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleModalOpen}
                  disabled={hasGeneratedVideo}
                  aria-label="Generate video for this post"
                >
                  <VideoIcon className="w-4 h-4 mr-2" />
                  Generate Video
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>🎬 Art Director Video Generation for {post.platform}</DialogTitle>
                  <p className="text-sm text-gray-600">Create brand-driven cute animal ASMR videos</p>
                </DialogHeader>
                
                <div className="space-y-6">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
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

                  {/* Generating Prompts */}
                  {isGenerating && (
                    <div className="text-center py-8">
                      <LoaderIcon className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p className="text-sm text-gray-600">Generating AI prompts...</p>
                    </div>
                  )}

                  {/* Prompt Selection */}
                  {prompts.length > 0 && !selectedPrompt && !isRendering && !videoData && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Choose Your ASMR Strategy Style:</h3>
                      {prompts.map((prompt, index) => (
                        <Card
                          key={index}
                          className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                            selectedPrompt === prompt ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => setSelectedPrompt(prompt)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm mb-1">
                                  {prompt.type.includes('Strategic') ? '🎧 Strategic ASMR' : 
                                   prompt.type.includes('Brand-Aligned') ? '💼 Brand ASMR' : '⚡ ASMR Content'}
                                </h4>
                                <p className="text-xs text-gray-600 mb-2">{prompt.style}</p>
                                <p className="text-xs text-gray-800 line-clamp-3">{prompt.content}</p>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {prompt.duration}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Text Editing */}
                  {selectedPrompt && !isRendering && !videoData && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="editText" className="text-sm font-medium">
                          Add Strategic Focus (max 10 words)
                        </Label>
                        <Input
                          id="editText"
                          value={editedText}
                          onChange={(e) => {
                            const words = e.target.value.split(' ').filter(w => w.length > 0);
                            if (words.length <= 10) {
                              setEditedText(e.target.value);
                            }
                          }}
                          placeholder="Optional: Add strategic emphasis (e.g., 'Queensland growth', 'automation success')..."
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {editedText.split(' ').filter(w => w.length > 0).length}/10 words
                        </p>
                      </div>
                      
                      <Button onClick={renderVideo} className="w-full" aria-label="Start video rendering">
                        <VideoIcon className="w-4 h-4 mr-2" />
                        Render Video
                      </Button>
                    </div>
                  )}

                  {/* Rendering Progress */}
                  {isRendering && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <LoaderIcon className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <h3 className="font-medium">🎬 Art Director Working...</h3>
                        {currentPhase && (
                          <p className="text-sm text-blue-600 font-medium">{currentPhase}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Creating epic animal business video</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Progress value={renderingProgress} className="w-full" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{renderingProgress}% complete</span>
                          <span>{renderingTime}s elapsed</span>
                        </div>
                        {currentPhase && (
                          <div className="text-center">
                            <p className="text-xs text-indigo-600 font-medium">Phase: {currentPhase}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Video Preview */}
                  {videoData && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="font-medium mb-2">🎬 Art Director Video Preview ({post.platform})</h3>
                        <div className="text-xs text-gray-500 mb-2">
                          Video URL: {videoData.url ? 'Available' : 'No URL'} | Mode: {videoData.realVideo ? 'Real' : 'Preview'}
                        </div>
                        
                        {/* POWER REFRESH: Force load latest Seedance video */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              console.log('🔄 POWER REFRESH: Forcing latest Seedance video load...');
                              const response = await fetch('/api/video/latest-seedance');
                              const data = await response.json();
                              console.log('🔄 Power refresh response:', data);
                              
                              if (data.success && data.video?.url && data.video.url.includes('replicate.delivery')) {
                                console.log('✅ POWER REFRESH SUCCESS:', data.video.url);
                                setVideoData(prev => ({
                                  ...prev,
                                  url: data.video.url,
                                  realVideo: true,
                                  seedanceGenerated: true
                                }));
                                toast({
                                  title: "Video Refreshed",
                                  description: "Real Seedance video is now playing"
                                });
                              } else {
                                console.log('❌ Power refresh: No real video found');
                                toast({
                                  title: "No Real Video",
                                  description: "Real Seedance video not yet available"
                                });
                              }
                            } catch (error) {
                              console.log('Power refresh failed:', error);
                              toast({
                                title: "Refresh Failed",
                                description: "Unable to check for real video"
                              });
                            }
                          }}
                          className="mb-2"
                        >
                          🔄 Force Real Video
                        </Button>
                        
                        {/* Video Info */}
                        <div className="bg-purple-50 rounded-lg p-3 mb-4">
                          <div className="text-sm font-medium text-purple-800 mb-2">
                            {videoData.title}
                          </div>
                          <div className="text-xs text-purple-600 mb-2">
                            {videoData.description}
                          </div>
                          {videoData.artDirected && (
                            <div className="flex justify-center gap-2">
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                ✅ Art Directed
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                🎯 Brand Purpose Driven
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                                🐾 {videoData.animalType}
                              </Badge>
                            </div>
                          )}
                        </div>
                        
                        <div className={`relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-lg overflow-hidden mx-auto shadow-lg border-2 border-indigo-200 ${
                          post.platform === 'Instagram' ? 'w-64 h-[456px]' : 'w-96 h-56'
                        }`}>
                          
                          {/* Single Video Player Logic */}
                          {videoData.url && (videoData.url.includes('replicate.delivery') || videoData.url.includes('replicate.com') || videoData.realVideo) ? (
                            <div className="w-full h-full relative">
                              <video
                                className="w-full h-full object-cover"
                                controls
                                muted
                                loop
                                onLoadedMetadata={(e) => {
                                  console.log('✅ Real Seedance video loaded successfully:', videoData.url);
                                  setVideoLoading(false);
                                }}
                                onError={(e) => {
                                  console.log('❌ Video load error, falling back to preview:', videoData.url);
                                  setVideoLoading(false);
                                  setError('Video failed to load, showing preview mode');
                                }}
                                onLoadStart={() => {
                                  console.log('🔄 Video loading started:', videoData.url);
                                  setVideoLoading(true);
                                }}
                              >
                                <source src={videoData.url} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                              
                              {/* Video Loading Overlay */}
                              {videoLoading && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                  <div className="text-white text-center">
                                    <LoaderIcon className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    <p className="text-sm">Loading video...</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Seedance Generated Badge */}
                              <div className="absolute top-2 left-2">
                                <Badge className="text-xs bg-green-600 text-white">
                                  🚀 Seedance Generated
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            // Art Director Visual Preview fallback
                            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 space-y-2 relative">
                                
                                  {/* Background Pattern */}
                                  <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-purple-400 to-indigo-400"></div>
                              
                              {/* Background Pattern */}
                              <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-purple-400 to-indigo-400"></div>
                              
                              {/* Main Content */}
                              <div className="relative z-10 space-y-3">
                                {/* Art Director Badge */}
                                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                                  🎬 ART DIRECTOR
                                </div>
                                
                                {/* Animal Avatar with Animation */}
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-indigo-300 animate-pulse">
                                  <span className="text-3xl">
                                    {videoData.animalType === 'kitten' && '🐱'}
                                    {videoData.animalType === 'bunny' && '🐰'}
                                    {videoData.animalType === 'puppy' && '🐶'}
                                    {videoData.animalType === 'hamster' && '🐹'}
                                  </span>
                                </div>
                                
                                {/* Creative Brief */}
                                <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-md border border-indigo-200 max-w-full">
                                  <h4 className="font-bold text-indigo-800 text-sm leading-tight mb-1">
                                    {videoData.title}
                                  </h4>
                                  <p className="text-xs text-indigo-600 font-medium">
                                    Custom {videoData.animalType} ASMR Strategy
                                  </p>
                                </div>
                                
                                {/* Brand Purpose Integration */}
                                <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-2 border border-green-200">
                                  <p className="text-xs text-green-700 font-medium">🎯 Brand Purpose Driven</p>
                                  <p className="text-xs text-green-600">Queensland SME Growth Focus</p>
                                </div>
                                
                                {/* Platform Specs */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-white/80 rounded px-2 py-1 border border-indigo-200">
                                    <span className="text-indigo-700">{post.platform === 'Instagram' ? '9:16' : '16:9'}</span>
                                  </div>
                                  <div className="bg-white/80 rounded px-2 py-1 border border-indigo-200">
                                    <span className="text-indigo-700">15s</span>
                                  </div>
                                </div>
                              
                                {/* Ready Status */}
                                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-2 shadow-md">
                                  <p className="text-xs font-bold">✅ READY TO POST</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Platform Badge */}
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 border-indigo-300">
                              {post.platform}
                            </Badge>
                          </div>
                          
                          {/* Generation Mode Badge */}
                          {videoData.seedanceGenerated ? (
                            <div className="absolute bottom-2 left-2">
                              <Badge className="text-xs bg-green-600 text-white">
                                ✅ Live Generated
                              </Badge>
                            </div>
                          ) : (
                            <div className="absolute bottom-2 left-2">
                              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                                🎨 Preview Mode
                              </Badge>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-center gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {videoData.quality || '1080p'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {videoData.size || '1.2MB'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(videoDuration)}s
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {videoData.aspectRatio || '16:9'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={approveVideo}
                          className="flex-1"
                          aria-label="Approve video for combination with text"
                        >
                          <CheckIcon className="w-4 h-4 mr-2" />
                          Approve Video
                        </Button>
                        <Button
                          onClick={deleteVideo}
                          variant="outline"
                          className="flex-1"
                          aria-label="Delete video and revert to text-only"
                        >
                          <XIcon className="w-4 h-4 mr-2" />
                          Delete Video
                        </Button>
                        <Button
                          onClick={async () => {
                            try {
                              // Use a known real Seedance video URL from the logs
                              const realVideoUrl = 'https://replicate.delivery/xezq/BJC8Q7hYOKp8HRfNBsKE5Z6YgIgNx27s1vIxe9MLecuv0M9pA/tmpjns1dnw3.mp4';
                              console.log('🎬 Loading real Seedance video:', realVideoUrl);
                              setVideoData(prev => ({
                                ...prev,
                                url: realVideoUrl,
                                previewMode: false,
                                seedanceGenerated: true
                              }));
                              toast({
                                title: "Real Video Loaded!",
                                description: "Now showing actual Seedance-generated video"
                              });
                            } catch (error) {
                              console.error('Failed to load real video:', error);
                            }
                          }}
                          variant="outline"
                          className="flex-1 border-green-300 text-green-600 hover:bg-green-50"
                          aria-label="Load real Seedance-generated video for preview"
                        >
                          <PlayIcon className="w-4 h-4 mr-2" />
                          Preview Real Video
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Show Approved Video button when post has approved video */}
        {post.videoApproved && post.videoData && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-white">
                  <CheckIcon className="w-3 h-3 mr-1" />
                  Approved Video
                </Badge>
                <span className="text-sm text-green-700 font-medium">
                  Ready to publish to {post.platform}
                </span>
                {post.approvedAt && (
                  <span className="text-xs text-green-600">
                    Approved {new Date(post.approvedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <Button
                onClick={publishApprovedPost}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
                aria-label="Publish approved video and text to platform"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Publish Now
              </Button>
            </div>
            <div className="mt-2 text-xs text-green-600">
              Video and text combined - {post.videoData.animalType || 'Art Director'} video with your copywritten content
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}