import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';

interface Video {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  resolution: string;
  videoStatus: string;
  generatedAt: string;
}

const VideoApproval: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    fetchPendingVideos();
  }, []);

  const fetchPendingVideos = async () => {
    try {
      const response = await fetch('/api/posts/pending-approval');
      if (!response.ok) throw new Error('Failed to fetch videos');
      
      const data = await response.json();
      setVideos(data.pendingVideos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (videoId: string) => {
    try {
      const response = await fetch(`/api/posts/${videoId}/approve-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true, feedback: 'Approved for posting' })
      });
      
      if (!response.ok) throw new Error('Failed to approve video');
      
      const result = await response.json();
      alert(`Video ${videoId} approved successfully!`);
      
      // Remove approved video from list
      setVideos(prev => prev.filter(v => v.id !== videoId));
      setSelectedVideo(null);
    } catch (error) {
      console.error('Error approving video:', error);
      alert('Failed to approve video');
    }
  };

  const handleReject = async (videoId: string) => {
    try {
      const response = await fetch(`/api/posts/${videoId}/approve-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false, feedback: 'Rejected - quality issues' })
      });
      
      if (!response.ok) throw new Error('Failed to reject video');
      
      const result = await response.json();
      alert(`Video ${videoId} rejected.`);
      
      // Remove rejected video from list
      setVideos(prev => prev.filter(v => v.id !== videoId));
      setSelectedVideo(null);
    } catch (error) {
      console.error('Error rejecting video:', error);
      alert('Failed to reject video');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading videos for approval...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎬 Video Approval Workflow</h1>
      <p>Review and approve Seedance-generated videos before posting to social platforms.</p>
      
      {videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No videos pending approval</h3>
          <p>All videos have been reviewed or no videos have been generated yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {videos.map((video) => (
            <div key={video.id} style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '15px', 
              backgroundColor: '#f9f9f9' 
            }}>
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>{video.title}</h3>
              
              {/* Thumbnail */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  style={{ 
                    width: '100%', 
                    height: '160px', 
                    objectFit: 'cover', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedVideo(video)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMyMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIxNjAiIHk9IjkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5N0E0IiBmb250LXNpemU9IjE0Ij5WaWRlbyBQcmV2aWV3PC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '5px',
                  right: '5px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '12px'
                }}>
                  {video.duration}s • {video.resolution}
                </div>
              </div>
              
              <div style={{ marginBottom: '15px', fontSize: '12px', color: '#666' }}>
                Generated: {new Date(video.generatedAt).toLocaleDateString()}
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleApprove(video.id)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => handleReject(video.id)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ❌ Reject
                </button>
                <button
                  onClick={() => setSelectedVideo(video)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🎥 Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Preview Modal */}
      {selectedVideo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>{selectedVideo.title}</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <ReactPlayer
                url={selectedVideo.videoUrl}
                width="100%"
                height="400px"
                controls
                playing
                onError={() => console.error('Error playing video')}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => handleApprove(selectedVideo.id)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✅ Approve & Post
              </button>
              <button
                onClick={() => handleReject(selectedVideo.id)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ❌ Reject Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoApproval;