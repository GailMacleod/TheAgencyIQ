import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Eye, CheckCircle, XCircle } from 'lucide-react';

interface VideoThumbnail {
  id: number;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  status: 'pending_approval' | 'approved' | 'rejected' | 'posted';
  resolution: string;
  generatedAt: string;
}

interface VideoThumbnailGridProps {
  videos: VideoThumbnail[];
  onVideoClick?: (video: VideoThumbnail) => void;
  onApprove?: (videoId: number) => void;
  onReject?: (videoId: number) => void;
  showActions?: boolean;
}

export default function VideoThumbnailGrid({
  videos,
  onVideoClick,
  onApprove,
  onReject,
  showActions = true
}: VideoThumbnailGridProps) {
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_approval: { label: 'Pending', variant: 'outline' as const, icon: Clock },
      approved: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
      posted: { label: 'Posted', variant: 'secondary' as const, icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_approval;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">No videos available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <Card 
          key={video.id} 
          className="relative overflow-hidden group cursor-pointer transition-transform hover:scale-105"
          onMouseEnter={() => setHoveredVideo(video.id)}
          onMouseLeave={() => setHoveredVideo(null)}
          onClick={() => onVideoClick?.(video)}
        >
          <div className="relative">
            {/* Thumbnail Image */}
            <div className="aspect-video relative overflow-hidden">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                onError={(e) => {
                  // Fallback to placeholder if thumbnail fails to load
                  (e.target as HTMLImageElement).src = '/attached_assets/video-placeholder.jpg';
                }}
              />
              
              {/* Overlay with play button */}
              <div 
                className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                  hoveredVideo === video.id ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="bg-white/90 rounded-full p-3">
                  <Play className="h-6 w-6 text-black fill-black" />
                </div>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                {getStatusBadge(video.status)}
              </div>

              {/* Resolution Badge */}
              <Badge className="absolute top-2 right-2" variant="outline">
                {video.resolution}
              </Badge>

              {/* Duration */}
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {formatDuration(video.duration)}
              </div>
            </div>

            {/* Video Info */}
            <CardContent className="p-3">
              <h3 className="font-medium text-sm line-clamp-2 mb-2">
                {video.title}
              </h3>
              
              <div className="text-xs text-gray-500 mb-3">
                Generated {new Date(video.generatedAt).toLocaleDateString()}
              </div>

              {/* Action Buttons */}
              {showActions && video.status === 'pending_approval' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove?.(video.id);
                    }}
                    className="flex-1 text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject?.(video.id);
                    }}
                    className="flex-1 text-xs"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              )}

              {showActions && video.status !== 'pending_approval' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVideoClick?.(video);
                  }}
                  className="w-full text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              )}
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  );
}