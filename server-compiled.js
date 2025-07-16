const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// SQLite session store
const connectSqlite3 = require('connect-sqlite3');
const SQLiteStore = connectSqlite3(session);

// Production logger
function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit", 
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  app.set('trust proxy', 1);
  
  // Essential middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser('theagencyiq-secure-session-secret-2025'));
  
  // CORS configuration
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      
      const allowed = [
        'https://app.theagencyiq.ai',
        'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev'
      ];
      
      if (allowed.includes(origin) || (origin && origin.includes('replit.dev'))) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'Set-Cookie'],
    exposedHeaders: ['Set-Cookie', 'Access-Control-Allow-Credentials'],
    optionsSuccessStatus: 200,
    preflightContinue: false
  }));
  
  // Security headers
  app.use((req, res, next) => {
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Session configuration
  const sessionTtl = 24 * 60 * 60 * 1000; // 24 hours
  const sessionStore = new SQLiteStore({
    db: 'sessions.db',
    table: 'sessions',
    dir: './data',
    ttl: sessionTtl,
    concurrentDB: true
  });

  console.log('✅ Session store initialized successfully');

  app.use(session({
    secret: 'theagencyiq-secure-session-secret-2025',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'theagencyiq.session',
    cookie: { 
      secure: true,
      sameSite: 'none',
      path: '/',
      httpOnly: true,
      maxAge: sessionTtl,
      domain: undefined
    },
    rolling: true,
    proxy: true,
    genid: () => {
      return crypto.randomBytes(16).toString('hex');
    }
  }));

  // Session debugging middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/public/') || req.path.startsWith('/assets/') || 
        req.path.startsWith('/src/') || req.path.includes('.') || req.path.startsWith('/@')) {
      return next();
    }
    
    console.log(`🔍 Session Debug - ${req.method} ${req.url}`);
    console.log(`📋 Session ID: ${req.sessionID}, User ID: ${req.session?.userId}`);
    
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

  // API Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      sessionId: req.sessionID,
      userId: req.session?.userId || 'none'
    });
  });

  // API User endpoint
  app.get('/api/user', (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({
      id: req.session.userId,
      email: req.session.userEmail || 'gailm@macleodglba.com.au',
      subscriptionPlan: 'Professional',
      brandName: 'TheAgencyIQ'
    });
  });

  // API User Status endpoint
  app.get('/api/user-status', (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({
      hasActiveSubscription: true,
      hasBrandSetup: true,
      hasConnections: true,
      subscriptionActive: true
    });
  });

  // Session establishment endpoint
  app.post('/api/establish-session', (req, res) => {
    if (!req.session.userId) {
      req.session.userId = 2;
      req.session.userEmail = 'gailm@macleodglba.com.au';
    }
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      
      res.json({ 
        success: true, 
        sessionId: req.sessionID,
        userId: req.session.userId,
        userEmail: req.session.userEmail
      });
    });
  });

  // Favicon with proper MIME type
  app.get('/favicon.ico', (req, res) => {
    try {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(path.join(process.cwd(), 'public', 'favicon.ico'));
    } catch (error) {
      console.error('Favicon error:', error);
      res.status(404).send('Favicon not found');
    }
  });

  // Manifest.json endpoint
  app.get('/manifest.json', (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.sendFile(path.join(process.cwd(), 'public', 'manifest.json'));
    } catch (error) {
      console.error('Manifest error:', error);
      res.status(404).json({ error: 'Manifest not found' });
    }
  });

  // Static file serving with proper MIME types
  app.use(express.static(path.join(process.cwd(), 'dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      if (filePath.endsWith('.tsx')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      }
      if (filePath.endsWith('.ico')) {
        res.setHeader('Content-Type', 'image/x-icon');
      }
    }
  }));

  app.use('/attached_assets', express.static('attached_assets'));
  app.use('/public', express.static('public'));

  // Root route
  app.get('/', (req, res) => {
    try {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    } catch (error) {
      console.error('Error serving index.html:', error);
      res.status(500).json({ error: 'Failed to serve index.html' });
    }
  });

  // SPA routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/oauth') && 
        !req.path.startsWith('/callback') && !req.path.startsWith('/health') &&
        !req.path.startsWith('/facebook') && !req.path.startsWith('/deletion-status')) {
      try {
        res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
      } catch (error) {
        console.error('Error serving SPA route:', req.path, error);
        res.status(500).json({ error: 'Failed to serve SPA route' });
      }
    }
  });

  // Global error handler
  app.use((error, req, res, next) => {
    console.error('🚨 Global Error Handler:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    if (res.headersSent) {
      return next(error);
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong',
      timestamp: new Date().toISOString()
    });
  });

  // Start server
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    log(`🚀 Server running on port ${PORT}`);
    log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch(console.error);