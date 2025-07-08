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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderingProgress, setRenderingProgress] = useState(0);
  const [prompts, setPrompts] = useState<VideoPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<VideoPrompt | null>(null);
  const [editedText, setEditedText] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [hasGeneratedVideo, setHasGeneratedVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const { toast } = useToast();

  // Check if video generation is allowed for this post - FORCE SHOW FOR ALL POSTS
  const canGenerateVideo = true; // Always show video button

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
      setError(null);

      // Start progress animation
      const progressInterval = setInterval(() => {
        setRenderingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 230); // 2.3s / 10 steps

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

      if (data.success) {
        setRenderingProgress(100);
        setVideoData(data);
        setHasGeneratedVideo(true);
        toast({
          title: "Video Ready!",
          description: `1080p video generated successfully (${data.size})`
        });
      } else {
        setError('Video rendering failed');
      }
    } catch (error) {
      console.error('Video rendering failed:', error);
      setError('Video rendering failed');
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
          platforms: [post.platform]
        })
      });

      const data = await response.json();

      if (data.success) {
        onVideoApproved(post.id, videoData);
        setIsModalOpen(false);
        toast({
          title: "Video Approved!",
          description: `Video posted to ${post.platform} successfully`
        });
      } else {
        setError('Failed to approve and post video');
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
        <CardDescription className="text-xs">
          {post.content.substring(0, 100)}...
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
                  <DialogTitle>Generate Video for {post.platform}</DialogTitle>
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
                      <h3 className="text-sm font-medium">Choose Your Video Style:</h3>
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
                                  {prompt.type === 'short-form' ? '⚡ Short-Form' : '🎧 ASMR'}
                                </h4>
                                <p className="text-xs text-gray-600 mb-2">{prompt.style}</p>
                                <p className="text-xs text-gray-800">{prompt.content}</p>
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
                          Edit Prompt (max 10 words)
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
                          placeholder="Add your custom text here..."
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
                        <h3 className="font-medium">Rendering Video...</h3>
                        <p className="text-sm text-gray-600">Creating 1080p video content</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Progress value={renderingProgress} className="w-full" />
                        <p className="text-xs text-center text-gray-500">
                          {renderingProgress}% complete
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Video Preview */}
                  {videoData && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="font-medium mb-2">Video Preview</h3>
                        <div className="relative bg-gray-100 rounded-lg overflow-hidden max-w-lg mx-auto">
                          <video
                            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                            controls
                            muted
                            className="w-full aspect-video object-contain"
                          />
                          
                          {/* Video Loading Indicator */}
                          {videoLoading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="text-center text-white">
                                <LoaderIcon className="w-8 h-8 animate-spin mx-auto mb-2" />
                                <p className="text-sm">Loading video...</p>
                              </div>
                            </div>
                          )}
                          

                        </div>
                        
                        <div className="flex justify-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {videoData.quality}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {videoData.size}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={approveVideo}
                          className="flex-1"
                          aria-label="Approve video and post to platform"
                        >
                          <CheckIcon className="w-4 h-4 mr-2" />
                          Approve & Post
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
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}