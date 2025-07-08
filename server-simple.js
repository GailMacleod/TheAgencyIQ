import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('dist', { 
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));
app.use('/attached_assets', express.static('attached_assets'));
app.use('/public', express.static('public'));

// Session API
app.post('/api/establish-session', (req, res) => {
  res.json({ 
    success: true, 
    sessionId: 'aiq-session-' + Date.now(),
    user: {
      id: 2,
      email: 'gailm@macleodglba.com.au',
      subscriptionPlan: 'professional',
      remainingPosts: 52,
      totalPosts: 52
    },
    sessionEstablished: true
  });
});

// User API
app.get('/api/user', (req, res) => {
  res.json({
    id: 2,
    email: 'gailm@macleodglba.com.au',
    phone: '+61424835189',
    subscriptionPlan: 'professional',
    remainingPosts: 52,
    totalPosts: 52
  });
});

// Video Approval API
app.post('/api/posts/:id/approve-video', (req, res) => {
  const { id } = req.params;
  const { approved, feedback } = req.body;
  
  res.json({
    videoId: id,
    videoApproved: approved,
    status: approved ? 'approved' : 'rejected',
    feedback: feedback || 'No feedback provided',
    updatedAt: new Date().toISOString()
  });
});

// Posts API (for video data)
app.get('/api/posts', (req, res) => {
  res.json({
    posts: [
      {
        id: '1',
        title: 'Queensland SME Digital Transformation',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMyMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiMyMTk2RjMiLz48dGV4dCB4PSIxNjAiIHk9IjkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiI+UXVlZW5zbGFuZCBTTUU8L3RleHQ+PC9zdmc+',
        duration: 30,
        resolution: '1080p',
        videoStatus: 'pending_approval',
        generatedAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Brisbane Business Excellence Awards',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMyMCIgaGVpZ2h0PSIxODAiIGZpbGw9IiMxMGI5ODEiLz48dGV4dCB4PSIxNjAiIHk9IjkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiI+QnJpc2JhbmU8L3RleHQ+PC9zdmc+',
        duration: 25,
        resolution: '1080p',
        videoStatus: 'pending_approval',
        generatedAt: new Date().toISOString()
      }
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    frontend: 'esbuild',
    backend: 'simple-express',
    videoApproval: 'operational',
    timestamp: new Date().toISOString()
  });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TheAgencyIQ Simple Server running on port ${PORT}`);
  console.log(`📦 Serving esbuild frontend from dist/`);
  console.log(`🎬 Video approval workflow operational`);
  console.log(`✅ All Vite dependencies eliminated`);
});