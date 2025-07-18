const express = require('express');
const path = require('path');
const { createServer } = require('http');

const app = express();
const port = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Serve static files from backup
app.use(express.static('dist_backup_20250712_110901'));
app.use('/attached_assets', express.static('attached_assets'));

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'TheAgencyIQ Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/user-status', (req, res) => {
  res.json({
    userId: 2,
    email: 'gailm@macleodglba.com.au',
    subscriptionPlan: 'Professional',
    subscriptionActive: true,
    hasActiveSubscription: true
  });
});

app.get('/api/user', (req, res) => {
  res.json({
    id: 2,
    email: 'gailm@macleodglba.com.au',
    name: 'Gail Macleod',
    subscriptionPlan: 'Professional',
    subscriptionActive: true
  });
});

app.get('/api/platform-connections', (req, res) => {
  res.json([
    { id: 1, platform: 'facebook', username: 'Test Page', isActive: true },
    { id: 2, platform: 'instagram', username: 'Test Account', isActive: true },
    { id: 3, platform: 'linkedin', username: 'Test Profile', isActive: true },
    { id: 4, platform: 'twitter', username: 'Test Handle', isActive: true },
    { id: 5, platform: 'youtube', username: 'Test Channel', isActive: true }
  ]);
});

app.get('/api/posts', (req, res) => {
  res.json([
    {
      id: 1,
      content: 'Welcome to TheAgencyIQ - Your AI-powered social media automation platform for Queensland SMEs',
      status: 'published',
      platforms: ['facebook', 'instagram', 'linkedin'],
      scheduledFor: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ]);
});

// Serve main app
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist_backup_20250712_110901/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Create and start server
const server = createServer(app);

server.listen(port, () => {
  console.log(`🚀 TheAgencyIQ Server running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Serving from backup: dist_backup_20250712_110901`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = { app, server };