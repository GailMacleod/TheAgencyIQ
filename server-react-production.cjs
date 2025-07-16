const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Replit environment
app.set('trust proxy', 1);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('theagencyiq-secure-session-secret-2025'));

// CORS configuration with credentials support
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all Replit domains and production domain
    const allowed = [
      'https://app.theagencyiq.ai',
      'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev'
    ];
    
    if (allowed.includes(origin) || origin.includes('replit.dev')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'Set-Cookie'],
  exposedHeaders: ['Set-Cookie', 'Access-Control-Allow-Credentials'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Session configuration with SQLite3 store
const sessionTtl = 24 * 60 * 60 * 1000; // 24 hours
app.use(session({
  store: new SQLiteStore({
    db: 'theagencyiq_sessions.db',
    table: 'sessions',
    dir: './data',
    ttl: sessionTtl / 1000,
    concurrentDB: true
  }),
  secret: 'theagencyiq-secure-session-secret-2025',
  resave: false,
  saveUninitialized: false,
  name: 'theagencyiq.session',
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    httpOnly: true,
    maxAge: sessionTtl,
    domain: undefined
  },
  rolling: true,
  proxy: process.env.NODE_ENV === 'production'
}));

// Session debugging middleware
app.use((req, res, next) => {
  // Skip debug for static assets
  if (req.path.startsWith('/static/') || req.path.startsWith('/assets/') || 
      req.path.includes('.js') || req.path.includes('.css') || 
      req.path.includes('.png') || req.path.includes('.ico')) {
    return next();
  }
  
  console.log(`🔍 Session Debug - ${req.method} ${req.url}`);
  console.log(`📋 Session ID: ${req.sessionID}, User ID: ${req.session?.userId}`);
  
  // Auto-assign User ID 2 for established sessions without userId
  if (req.session && !req.session.userId) {
    req.session.userId = 2;
    req.session.userEmail = 'gailm@macleodglba.com.au';
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      } else {
        console.log('✅ Auto-assigned User ID 2 to session');
      }
    });
  }
  
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'react-production'
  });
});

app.get('/api/user', (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({
    id: req.session.userId,
    email: req.session.userEmail || 'gailm@macleodglba.com.au',
    subscriptionPlan: 'Professional'
  });
});

app.get('/api/user-status', (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({
    hasActiveSubscription: true,
    hasBrandSetup: true,
    hasConnections: true,
    userId: req.session.userId
  });
});

// Serve favicon with proper MIME type
app.get('/favicon.ico', (req, res) => {
  try {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
  } catch (error) {
    console.error('Favicon error:', error);
    res.status(404).send('Favicon not found');
  }
});

// Serve manifest.json
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    name: "TheAgencyIQ",
    short_name: "AgencyIQ",
    description: "AI-powered social media automation for Queensland SMEs",
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

// Serve static files from dist directory (Vite build output)
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Handle logo.png specifically
app.get('/logo.png', (req, res) => {
  try {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(__dirname, 'public', 'logo.png'));
  } catch (error) {
    console.error('Logo error:', error);
    res.status(404).send('Logo not found');
  }
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  try {
    // First try to serve from dist directory (Vite build)
    const distIndex = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(distIndex)) {
      res.sendFile(distIndex);
    } else {
      // Fallback to client directory
      const clientIndex = path.join(__dirname, 'client', 'index.html');
      if (fs.existsSync(clientIndex)) {
        res.sendFile(clientIndex);
      } else {
        // Ultimate fallback
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>TheAgencyIQ</title>
              <link rel="icon" href="/favicon.ico" type="image/x-icon">
              <link rel="manifest" href="/manifest.json">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .loading { color: #3250fa; }
              </style>
            </head>
            <body>
              <h1>TheAgencyIQ</h1>
              <p class="loading">Loading React application...</p>
              <div id="root"></div>
              <script>
                console.log('TheAgencyIQ React app initializing...');
                // Meta Pixel conditional initialization
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
            </body>
          </html>
        `);
      }
    }
  } catch (error) {
    console.error('Error serving React app:', error);
    res.status(500).send('Error loading application');
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TheAgencyIQ React Production Server running on port ${PORT}`);
  console.log(`📁 Serving Vite build from: ${path.join(__dirname, 'dist')}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`✅ Favicon configured at: /favicon.ico`);
  console.log(`✅ Manifest configured at: /manifest.json`);
  console.log(`✅ Session store: SQLite3`);
  console.log(`✅ SPA routing: Enabled`);
});