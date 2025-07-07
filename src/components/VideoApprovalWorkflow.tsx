import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoPreview {
  id: number;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  resolution: string;
  videoStatus: string;
  generatedAt: string;
}

interface VideoApprovalWorkflowProps {
  onVideoApproved?: (videoId: number) => void;
  onVideoRejected?: (videoId: number) => void;
}

export default function VideoApprovalWorkflow({ 
  onVideoApproved, 
  onVideoRejected 
}: VideoApprovalWorkflowProps) {
  const [pendingVideos, setPendingVideos] = useState<VideoPreview[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingVideos();
  }, []);

  const fetchPendingVideos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/posts/pending-approval');
      if (!response.ok) throw new Error('Failed to fetch pending videos');
      
      const data = await response.json();
      setPendingVideos(data.pendingVideos || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pending videos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoApproval = async (videoId: number, approved: boolean, feedback?: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/posts/${videoId}/approve-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, feedback })
      });
      
      if (!response.ok) throw new Error('Failed to approve video');
      
      const data = await response.json();
      
      // Remove approved/rejected video from pending list
      setPendingVideos(prev => prev.filter(video => video.id !== videoId));
      
      // Call callback functions
      if (approved && onVideoApproved) {
        onVideoApproved(videoId);
      } else if (!approved && onVideoRejected) {
        onVideoRejected(videoId);
      }
      
      toast({
        title: approved ? "Video Approved" : "Video Rejected",
        description: approved 
          ? "Video has been approved and will be posted" 
          : "Video has been rejected and will not be posted",
        variant: approved ? "default" : "destructive"
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process video approval",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoPreview = (video: VideoPreview) => {
    setSelectedVideo(video);
    setVideoPlaying(video.id);
  };

  if (isLoading && pendingVideos.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading pending videos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Video Approval Workflow
            <Badge variant="secondary">{pendingVideos.length} pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingVideos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No videos pending approval
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingVideos.map((video) => (
                <Card key={video.id} className="relative overflow-hidden">
                  <div className="relative">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        // Fallback thumbnail if image fails to load
                        (e.target as HTMLImageElement).src = '/attached_assets/video-placeholder.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleVideoPreview(video)}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Preview
                      </Button>
                    </div>
                    <Badge className="absolute top-2 right-2" variant="outline">
                      {video.resolution}
                    </Badge>
                    <div className="absolute bottom-2 left-2 text-white text-sm bg-black/70 px-2 py-1 rounded">
                      {video.duration}s
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                      {video.title}
                    </h3>
                    <div className="flex justify-between items-center">
                      <Button
                        size="sm"
                        onClick={() => handleVideoApproval(video.id, true)}
                        disabled={isLoading}
                        className="gap-1"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleVideoApproval(video.id, false)}
                        disabled={isLoading}
                        className="gap-1"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Preview Modal */}
      {selectedVideo && (
        <Card className="fixed inset-4 z-50 bg-white shadow-2xl max-w-4xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{selectedVideo.title}</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedVideo(null)}
            >
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <div className="aspect-video mb-4">
              <video
                src={selectedVideo.videoUrl}
                poster={selectedVideo.thumbnailUrl}
                controls
                autoPlay
                className="w-full h-full rounded-lg"
                onError={() => {
                  toast({
                    title: "Video Error",
                    description: "Failed to load video preview",
                    variant: "destructive"
                  });
                }}
              >
                Your browser does not support video playback.
              </video>
            </div>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => {
                  handleVideoApproval(selectedVideo.id, true);
                  setSelectedVideo(null);
                }}
                disabled={isLoading}
                className="gap-2"
              >
                <ThumbsUp className="h-4 w-4" />
                Approve & Post
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleVideoApproval(selectedVideo.id, false);
                  setSelectedVideo(null);
                }}
                disabled={isLoading}
                className="gap-2"
              >
                <ThumbsDown className="h-4 w-4" />
                Reject Video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}