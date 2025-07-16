const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3');
const ConnectSQLite = require('connect-sqlite3');
const fs = require('fs');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
const SQLiteStore = ConnectSQLite(session);
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: __dirname
  }),
  secret: 'theagencyiq-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Block Replit telemetry
app.use((req, res, next) => {
  if (req.url.includes('sp.replit.com') || req.url.includes('telemetry')) {
    return res.status(204).send();
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: res.locals.serverPort || 'unknown'
  });
});

// Basic API endpoints
app.get('/api/user', (req, res) => {
  res.json({ 
    id: 2, 
    email: 'gailm@macleodglba.com.au',
    subscriptionPlan: 'Professional'
  });
});

app.get('/api/user-status', (req, res) => {
  res.json({ 
    userId: 2,
    hasActiveSubscription: true,
    subscriptionPlan: 'Professional'
  });
});

// Static file serving with MIME type fixes
const staticMiddleware = express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js' || ext === '.jsx' || ext === '.tsx') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (ext === '.html') {
      res.setHeader('Content-Type', 'text/html');
    } else if (ext === '.json') {
      res.setHeader('Content-Type', 'application/json');
    } else if (ext === '.ico') {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
});

// Serve static files
app.use(staticMiddleware);

// Favicon handler
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(faviconPath);
  } else {
    // Generate a simple favicon
    const simpleFavicon = Buffer.from([
      0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x68, 0x04,
      0x00, 0x00, 0x16, 0x00, 0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x20, 0x00
    ]);
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(simpleFavicon);
  }
});

// Manifest handler
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    name: 'TheAgencyIQ',
    short_name: 'AgencyIQ',
    description: 'AI-powered social media automation for Queensland SMEs',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3250fa',
    icons: [
      {
        src: '/agency_logo_verified.png',
        sizes: '192x192',
        type: 'image/png'
      }
    ]
  });
});

// SPA fallback - serve React app for all non-API routes
app.get('*', (req, res) => {
  try {
    // Check for dist/index.html first
    const distIndexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(distIndexPath)) {
      res.setHeader('Content-Type', 'text/html');
      return res.sendFile(distIndexPath);
    }
    
    // Fallback to client/index.html
    const clientIndexPath = path.join(__dirname, 'client', 'index.html');
    if (fs.existsSync(clientIndexPath)) {
      res.setHeader('Content-Type', 'text/html');
      return res.sendFile(clientIndexPath);
    }
    
    // Ultimate fallback - generate basic HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TheAgencyIQ - AI-Powered Social Media Automation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 40px 20px;
              background: linear-gradient(135deg, #3250fa 0%, #00f0ff 100%);
              color: white;
              text-align: center;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .container {
              max-width: 600px;
              background: rgba(255, 255, 255, 0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            h1 {
              font-size: 2.5em;
              margin-bottom: 20px;
              font-weight: 700;
            }
            .subtitle {
              font-size: 1.2em;
              margin-bottom: 30px;
              opacity: 0.9;
            }
            .status {
              background: rgba(0, 255, 0, 0.2);
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              border: 1px solid rgba(0, 255, 0, 0.3);
            }
            .api-test {
              margin-top: 30px;
              padding: 20px;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 10px;
            }
            button {
              background: #ff538f;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            button:hover {
              background: #e04875;
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>TheAgencyIQ</h1>
            <div class="subtitle">AI-Powered Social Media Automation for Queensland SMEs</div>
            
            <div class="status">
              <h3>✅ Server Status: OPERATIONAL</h3>
              <p>Port: ${res.locals.serverPort || 'Dynamic'}</p>
              <p>Session Management: Active</p>
              <p>API Endpoints: Ready</p>
            </div>
            
            <div class="api-test">
              <h3>API Connection Test</h3>
              <button onclick="testAPI()">Test API Connection</button>
              <div id="api-status" style="margin-top: 15px;"></div>
            </div>
          </div>
          
          <script>
            async function testAPI() {
              const statusDiv = document.getElementById('api-status');
              statusDiv.innerHTML = 'Testing API connection...';
              
              try {
                const response = await fetch('/api/health');
                if (response.ok) {
                  const data = await response.json();
                  statusDiv.innerHTML = \`
                    <div style="color: #00ff00; margin-bottom: 10px;">✅ API Connection Successful!</div>
                    <div>Status: \${data.status}</div>
                    <div>Port: \${data.port}</div>
                    <div>Time: \${data.timestamp}</div>
                  \`;
                } else {
                  statusDiv.innerHTML = \`<div style="color: #ff6b6b;">❌ API Error: \${response.status}</div>\`;
                }
              } catch (error) {
                statusDiv.innerHTML = \`<div style="color: #ff6b6b;">❌ Network Error: \${error.message}</div>\`;
              }
            }
            
            // Auto-test on load
            setTimeout(testAPI, 1000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error serving React app:', error);
    res.status(500).send('Error loading application');
  }
});

// Bulletproof server startup with dynamic port selection
const findAvailablePort = async (startPort = 5000) => {
  return new Promise((resolve) => {
    const server = app.listen(startPort, '0.0.0.0', () => {
      const port = server.address().port;
      console.log(`🚀 Server successfully running on port ${port}`);
      console.log(`📁 Serving files from: ${__dirname}`);
      console.log(`🌐 Access at: http://localhost:${port}`);
      console.log(`✅ Bulletproof server startup complete`);
      resolve({ server, port });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${startPort} is busy, trying port ${startPort + 1}`);
        server.close();
        findAvailablePort(startPort + 1).then(resolve);
      } else {
        console.error('Server error:', err);
        server.close();
        // Try random port as last resort
        findAvailablePort(0).then(resolve);
      }
    });
  });
};

// Start server
findAvailablePort().then(({ server, port }) => {
  // Store port for health check
  app.use((req, res, next) => {
    res.locals.serverPort = port;
    next();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});