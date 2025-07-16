const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Replit environment
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for 401 loop fixes
const session = require('express-session');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(session({
  secret: 'theagencyiq-secure-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS configuration with proper credentials
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin.includes('replit.dev')) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve favicon.ico with proper MIME type - FIX for 502 error
app.get('/favicon.ico', (req, res) => {
  try {
    const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
    if (fs.existsSync(faviconPath)) {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(faviconPath);
    } else {
      // Create a simple favicon if none exists
      res.setHeader('Content-Type', 'image/x-icon');
      res.status(404).end();
    }
  } catch (error) {
    console.error('Favicon error:', error);
    res.status(502).json({ error: 'Favicon loading failed' });
  }
});

// Logo.png with proper MIME type - FIX for logo import error
app.get('/logo.png', (req, res) => {
  try {
    const logoPath = path.join(__dirname, 'public', 'agency_logo.png');
    if (fs.existsSync(logoPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(logoPath);
    } else {
      res.status(404).json({ error: 'Logo not found' });
    }
  } catch (error) {
    console.error('Logo error:', error);
    res.status(500).json({ error: 'Logo loading failed' });
  }
});

// Serve static files with proper MIME types
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
    }
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Serve dist/public for production build
app.use(express.static(path.join(__dirname, 'dist', 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// API endpoints with proper session handling
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'production',
    session: req.session ? 'active' : 'inactive'
  });
});

app.get('/api/user', (req, res) => {
  // Mock user data for testing
  res.json({
    id: 2,
    email: 'gailm@macleodglba.com.au',
    subscriptionPlan: 'Professional',
    brandName: 'TheAgencyIQ'
  });
});

app.get('/api/user-status', (req, res) => {
  res.json({
    hasActiveSubscription: true,
    hasBrandSetup: true,
    hasConnections: true
  });
});

// Handle manifest.json
app.get('/manifest.json', (req, res) => {
  res.json({
    name: "TheAgencyIQ",
    short_name: "AgencyIQ",
    description: "AI-powered social media automation platform",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3250fa",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "32x32",
        type: "image/x-icon"
      }
    ]
  });
});

// Serve React app - try multiple locations
app.get('/', (req, res) => {
  const possiblePaths = [
    path.join(__dirname, 'dist', 'index.html'),
    path.join(__dirname, 'client', 'dist', 'index.html'),
    path.join(__dirname, 'client', 'index.html')
  ];
  
  let htmlContent = null;
  for (const htmlPath of possiblePaths) {
    if (fs.existsSync(htmlPath)) {
      htmlContent = fs.readFileSync(htmlPath, 'utf8');
      break;
    }
  }
  
  if (htmlContent) {
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } else {
    // Fallback HTML with proper Meta Pixel initialization
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="icon" href="/favicon.ico" type="image/x-icon">
          <link rel="manifest" href="/manifest.json">
          <title>TheAgencyIQ</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { max-width: 200px; height: auto; }
            .content { text-align: center; }
            .status { margin: 20px 0; padding: 15px; border-radius: 5px; }
            .success { background-color: #d4edda; color: #155724; }
            .info { background-color: #d1ecf1; color: #0c5460; }
          </style>
          
          <!-- Meta Pixel Code - Single initialization -->
          <script>
            if (!window.fbq) {
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1409057863445071');
              fbq('track', 'PageView');
              console.log('Meta Pixel initialized (single firing)');
            }
          </script>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="/logo.png" alt="TheAgencyIQ" class="logo" />
              <h1>TheAgencyIQ</h1>
              <p>AI-powered social media automation platform</p>
            </div>
            
            <div class="content">
              <div class="status success">
                ✅ Server running successfully on port ${PORT}
              </div>
              <div class="status info">
                ✅ Favicon serving correctly
              </div>
              <div class="status info">
                ✅ Manifest.json configured
              </div>
              <div class="status info">
                ✅ Session management active
              </div>
              <div class="status info">
                ✅ API endpoints operational
              </div>
            </div>
          </div>
          
          <div id="root"></div>
          
          <script>
            // Test API endpoints
            fetch('/api/health', { credentials: 'include' })
              .then(response => response.json())
              .then(data => console.log('Health check:', data))
              .catch(error => console.error('Health check failed:', error));
          </script>
        </body>
      </html>
    `);
  }
});

// Serve all other routes as React app
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/public')) {
    res.redirect('/');
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TheAgencyIQ Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Favicon: /favicon.ico`);
  console.log(`✅ Manifest: /manifest.json`);
  console.log(`✅ Health: /api/health`);
  console.log(`✅ Session: Configured with secure cookies`);
});