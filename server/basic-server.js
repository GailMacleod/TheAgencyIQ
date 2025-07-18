const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.env.PORT || 3000;

// Basic MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Simple API responses
const apiResponses = {
  '/api/health': {
    status: 'ok',
    message: 'TheAgencyIQ Server is running',
    timestamp: new Date().toISOString()
  },
  '/api/user-status': {
    userId: 2,
    email: 'gailm@macleodglba.com.au',
    subscriptionPlan: 'Professional',
    subscriptionActive: true,
    hasActiveSubscription: true
  },
  '/api/user': {
    id: 2,
    email: 'gailm@macleodglba.com.au',
    name: 'Gail Macleod',
    subscriptionPlan: 'Professional',
    subscriptionActive: true
  },
  '/api/platform-connections': [
    { id: 1, platform: 'facebook', username: 'Test Page', isActive: true },
    { id: 2, platform: 'instagram', username: 'Test Account', isActive: true },
    { id: 3, platform: 'linkedin', username: 'Test Profile', isActive: true },
    { id: 4, platform: 'twitter', username: 'Test Handle', isActive: true },
    { id: 5, platform: 'youtube', username: 'Test Channel', isActive: true }
  ],
  '/api/posts': [
    {
      id: 1,
      content: 'Welcome to TheAgencyIQ - Your AI-powered social media automation platform for Queensland SMEs',
      status: 'published',
      platforms: ['facebook', 'instagram', 'linkedin'],
      scheduledFor: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ]
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    });
    res.end();
    return;
  }
  
  // Handle API requests
  if (pathname.startsWith('/api/')) {
    const response = apiResponses[pathname];
    if (response) {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(response));
      return;
    } else {
      res.writeHead(404, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'API endpoint not found' }));
      return;
    }
  }
  
  // Serve static files from backup
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(__dirname, '../dist_backup_20250712_110901/index.html');
  } else if (pathname.startsWith('/attached_assets/')) {
    filePath = path.join(__dirname, '../attached_assets', pathname.replace('/attached_assets/', ''));
  } else {
    filePath = path.join(__dirname, '../dist_backup_20250712_110901', pathname);
  }
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If file doesn't exist and it's not an API route, serve index.html
      if (!pathname.startsWith('/api/')) {
        serveFile(path.join(__dirname, '../dist_backup_20250712_110901/index.html'), res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      }
    } else {
      serveFile(filePath, res);
    }
  });
});

server.listen(port, () => {
  console.log(`🚀 TheAgencyIQ Server running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Serving from backup: dist_backup_20250712_110901`);
  console.log(`🔗 Access at: http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = { server };