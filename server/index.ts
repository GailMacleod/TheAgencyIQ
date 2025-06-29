// Production server for TheAgencyIQ - handles all routes and API endpoints
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
  origin: true,
  credentials: true
}));

// Security headers with CSP for production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameSrc: ["'self'", "https:"],
    }
  }
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'production-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API routes - basic authentication and platform status
app.get('/api/posts', (req, res) => {
  res.json({ posts: [], message: 'API working' });
});

app.get('/api/platform-connections', (req, res) => {
  res.json({ connections: [], message: 'Platform connections API working' });
});

app.post('/api/login', (req, res) => {
  res.json({ success: false, message: 'Login not configured in production' });
});

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React Router - send all non-API requests to index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Production server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Live on ${PORT}`);
  console.log(`🚀 TheAgencyIQ Production Server running on port ${PORT}`);
  console.log(`📍 Port source: ${process.env.PORT ? `ENV (${process.env.PORT})` : 'default (5000)'}`);
  console.log(`🌐 Host: 0.0.0.0 (Production-ready)`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, '../dist')}`);
  console.log(`🔗 Production URL: https://app.theagencyiq.ai`);
  console.log(`Deploy time: ${new Date().toLocaleString('en-AU', { 
    timeZone: 'Australia/Sydney',
    hour12: true 
  })}`);
});

// Handle server errors
server.on('error', (err: any) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is busy, trying ${PORT + 1}...`);
    const altServer = createServer(app);
    altServer.listen(PORT + 1, '0.0.0.0', () => {
      console.log(`🚀 Alternative server running on port ${PORT + 1}`);
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});