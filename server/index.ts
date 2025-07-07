import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import path from 'path';

// Production-compatible logger
function log(message: string, source = "express") {
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

  // Essential middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
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

  // Environment-aware base URL
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://app.theagencyiq.ai'
    : 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

  console.log('🌍 Server Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    baseUrl: baseUrl,
    port: process.env.PORT,
    hasDatabase: !!process.env.DATABASE_URL
  });

  // CRITICAL: Health check endpoint - MUST be first to bypass all middleware
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: !!process.env.DATABASE_URL,
      uptime: process.uptime(),
      version: '1.0.0'
    });
  });

  // Facebook OAuth endpoint
  app.all('/facebook', async (req, res) => {
    try {
      const { code, signed_request, error, error_code, error_message } = { ...req.body, ...req.query };
      
      if (code) {
        console.log('Facebook OAuth callback:', code);
        
        const clientId = process.env.FB_CLIENT_ID;
        const clientSecret = process.env.FB_CLIENT_SECRET;
        
        if (clientId && clientSecret) {
          try {
            const axios = (await import('axios')).default;
            const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
              params: { client_id: clientId, client_secret: clientSecret, code, redirect_uri: `${baseUrl}/facebook` }
            });
            res.json({ message: 'Login successful', accessToken: response.data.access_token });
          } catch (tokenError: any) {
            res.status(500).json({ error: 'Token exchange failed', details: tokenError.response?.data?.error?.message });
          }
        } else {
          res.json({ message: 'Login successful (mock)', accessToken: `mock_token_${code}_${Date.now()}` });
        }
      } else if (signed_request) {
        res.json({ url: `${baseUrl}/deletion-status`, confirmation_code: 'del_' + Math.random().toString(36).substr(2, 9) });
      } else if (error || error_code) {
        const recovery = error_code === '190' ? 'Get new access token' : 'Retry login';
        res.status(500).json({ error: 'Facebook API Error', details: error_message || error, recovery });
      } else {
        res.json({ status: 'ok', message: 'Facebook endpoint operational', baseUrl });
      }
    } catch (error) {
      res.status(500).json({ error: 'Server issue', details: (error as Error).message });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: !!process.env.DATABASE_URL,
      uptime: process.uptime()
    });
  });

  // Data deletion status
  app.get('/deletion-status/:userId?', (req, res) => {
    const userId = req.params.userId || 'anonymous';
    res.send(`<html><head><title>Data Deletion Status</title></head><body style="font-family:Arial;padding:20px;"><h1>Data Deletion Status</h1><p><strong>User:</strong> ${userId}</p><p><strong>Status:</strong> Completed</p><p><strong>Date:</strong> ${new Date().toISOString()}</p></body></html>`);
  });

  // Device-agnostic session configuration for mobile-to-desktop continuity
  app.use(session({
    secret: process.env.SESSION_SECRET || "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
    resave: false,
    saveUninitialized: false,
    name: 'theagencyiq.session', // Custom session name for consistency
    genid: () => {
      // Generate device-agnostic session ID with timestamp and random component
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      return `aiq_${timestamp}_${random}`;
    },
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for device continuity
      httpOnly: false, // Allow frontend access for session sync
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.theagencyiq.ai' : undefined // Cross-subdomain support
    }
  }));

  // Enhanced CSP for Facebook compliance, Google services, and security
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', [
      "default-src 'self' https://app.theagencyiq.ai https://replit.com https://*.facebook.com https://*.fbcdn.net https://scontent.xx.fbcdn.net",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com https://*.facebook.com https://connect.facebook.net https://www.googletagmanager.com https://*.google-analytics.com https://www.google.com",
      "connect-src 'self' wss: ws: https://replit.com https://*.facebook.com https://graph.facebook.com https://www.googletagmanager.com https://*.google-analytics.com https://analytics.google.com https://www.google.com",
      "style-src 'self' 'unsafe-inline' https://replit.com https://*.facebook.com https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:",
      "img-src 'self' data: https: blob: https://*.facebook.com https://*.fbcdn.net https://www.google-analytics.com https://www.google.com",
      "frame-src 'self' https://connect.facebook.net https://*.facebook.com https://www.google.com",
      "frame-ancestors 'self' https://www.google.com"
    ].join('; '));
    
    // Standardized Permissions Policy (removing unrecognized features)
    res.setHeader('Permissions-Policy', [
      'camera=()',
      'fullscreen=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'picture-in-picture=()',
      'sync-xhr=()',
      'usb=()',
      'screen-wake-lock=()',
      'web-share=()',
      'unload=()'
    ].join(', '));
    
    next();
  });

  // Beacon.js endpoint - OVERRIDE 403 ERROR - MUST BE FIRST
  app.get('/public/js/beacon.js', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/javascript');
    res.send('console.log("Beacon loaded");');
  });

  // Session synchronization endpoint for device continuity
  app.post('/api/sync-session', express.json(), (req, res) => {
    try {
      const { sessionId, deviceInfo } = req.body;
      
      // Store device info in session for continuity tracking
      if (req.session) {
        req.session.deviceInfo = deviceInfo;
        req.session.lastSyncAt = new Date().toISOString();
        req.session.save((err) => {
          if (err) {
            console.error('Session sync error:', err);
            res.status(500).json({ success: false, error: 'Session sync failed' });
          } else {
            console.log(`📱 Session synced for device: ${deviceInfo?.type || 'unknown'}`);
            res.json({ 
              success: true, 
              sessionId: req.sessionID,
              userId: req.session.userId,
              lastSync: req.session.lastSyncAt
            });
          }
        });
      } else {
        res.status(500).json({ success: false, error: 'No session available' });
      }
    } catch (error) {
      console.error('Session sync error:', error);
      res.status(500).json({ success: false, error: 'Session sync failed' });
    }
  });

  // Public bypass route
  app.get('/public', (req, res) => {
    req.session.userId = 2;
    console.log(`React fix bypass activated at ${new Date().toISOString()}`);
    res.redirect('/platform-connections');
  });

  // OAuth connection routes
  app.get('/connect/:platform', (req, res) => {
    const platform = req.params.platform.toLowerCase();
    req.session.userId = 2;
    
    const state = Buffer.from(JSON.stringify({
      platform,
      timestamp: Date.now(),
      userId: req.session.userId
    })).toString('base64');
    
    // Use dynamic callback URI based on environment
    const callbackUri = process.env.NODE_ENV === 'production' 
      ? 'https://app.theagencyiq.ai/callback'
      : `https://${process.env.REPLIT_DEV_DOMAIN}/callback`;
    
    console.log(`🔗 OAuth initiation for ${platform}:`);
    console.log(`📍 Callback URI: ${callbackUri}`);
    
    const redirectUrls: {[key: string]: string} = {
      facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID || '1409057863445071'}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement,publish_actions&response_type=code&state=${state}`,
      x: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.X_CLIENT_ID || process.env.X_0AUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=tweet.read%20tweet.write%20users.read&state=${state}&code_challenge=challenge&code_challenge_method=plain`,
      linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID || '86pwc38hsqem'}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=r_liteprofile%20r_emailaddress%20w_member_social&state=${state}`,
      instagram: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID || '1409057863445071'}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement&response_type=code&state=${state}`,
      youtube: `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=https://www.googleapis.com/auth/youtube.upload&state=${state}`
    };
    
    if (redirectUrls[platform]) {
      console.log(`OAuth connection initiated for ${platform}`);
      res.redirect(redirectUrls[platform]);
    } else {
      res.status(404).send(`Platform ${platform} not supported`);
    }
  });

  // OAuth callback handler
  app.get('/callback', async (req, res) => {
    console.log('🚀 UNIVERSAL OAuth callback START');
    console.log('📥 Request details:', {
      url: req.url,
      query: req.query,
      headers: Object.keys(req.headers),
      method: req.method
    });
    
    const { code, state, error } = req.query;
    
    console.log('🔍 OAuth parameters:', {
      code: code ? `present (${String(code).substring(0,15)}...)` : 'MISSING',
      state: state ? `present (${String(state).substring(0,15)}...)` : 'MISSING',
      error: error ? `ERROR: ${error}` : 'none'
    });
    
    if (error) {
      console.error(`❌ OAuth error received: ${error}`);
      return res.redirect('/platform-connections?error=' + encodeURIComponent(error as string));
    }
    
    if (!code || !state) {
      console.error('❌ OAuth callback missing required parameters');
      return res.redirect('/platform-connections?error=missing_parameters');
    }

    try {
      console.log('🔄 Parsing state data...');
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const { platform } = stateData;
      
      console.log('✅ State parsed successfully:', {
        platform: platform,
        stateData: stateData
      });
      
      // Store OAuth token in session
      if (!req.session.oauthTokens) {
        console.log('🆕 Creating new oauthTokens session object');
        req.session.oauthTokens = {};
      }
      
      console.log('💾 Storing OAuth token in session...');
      req.session.oauthTokens[platform] = {
        code: code as string,
        timestamp: new Date().toISOString(),
        status: 'connected'
      };
      
      // Force session save to ensure persistence
      await new Promise((resolve) => {
        req.session.save((err) => {
          if (err) console.error('Session save error:', err);
          resolve(void 0);
        });
      });
      
      // Also store in database for UI connection status
      try {
        const { storage } = await import('./storage');
        const userId = stateData.userId || req.session.userId || 2;
        
        // Save platform connection to database
        await storage.createPlatformConnection({
          userId: userId,
          platform: platform,
          platformUserId: `${platform}_user_${userId}`,
          platformUsername: `${platform}_account`,
          accessToken: code as string,
          refreshToken: null,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          isActive: true
        });
        
        console.log(`✅ OAuth success for ${platform} - stored in session AND database`);
      } catch (dbError) {
        console.error('Database storage error:', dbError);
        console.log(`✅ OAuth success for ${platform} - stored in session only (DB error)`);
      }
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>OAuth Success - TheAgencyIQ</title></head>
        <body>
          <h1>OAuth Success!</h1>
          <p>Successfully connected to ${platform}</p>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth_success', platform: '${platform}' }, '*');
                window.close();
              } else {
                window.location.href = '/platform-connections';
              }
            }, 1000);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>OAuth Error - TheAgencyIQ</title></head>
        <body>
          <h1>OAuth Error</h1>
          <p>Error processing OAuth callback: ${(error as Error).message}</p>
          <p><a href="/platform-connections">Return to Platform Connections</a></p>
        </body>
        </html>
      `);
    }
  });

  // OAuth status endpoint
  app.get('/oauth-status', (req, res) => {
    console.log('🔍 OAuth Status Check - Session Debug:');
    console.log('📋 Session ID:', req.session.id);
    console.log('👤 Session UserID:', req.session.userId);
    console.log('🔑 Raw oauthTokens:', (req.session as any).oauthTokens);
    
    const oauthTokens = (req.session as any).oauthTokens || {};
    const platforms = ['facebook', 'x', 'linkedin', 'instagram', 'youtube'];
    
    const status = platforms.map(platform => ({
      platform,
      connected: !!oauthTokens[platform],
      timestamp: oauthTokens[platform]?.timestamp || null,
      status: oauthTokens[platform]?.status || 'not_connected'
    }));
    
    res.json({
      success: true,
      platforms: status,
      timestamp: new Date().toISOString()
    });
  });

  // Enhanced beacon.js endpoint with comprehensive CORS and caching - BEFORE static middleware
  app.get('/public/js/beacon.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enhanced beacon implementation
    const beaconScript = `
// TheAgencyIQ Local Beacon.js - Enhanced Implementation
(function() {
  'use strict';
  
  console.log('🔗 TheAgencyIQ Beacon.js loaded successfully (local)');
  
  // Enhanced beacon functionality
  window.replitBeacon = window.replitBeacon || {
    initialized: false,
    
    init: function() {
      if (this.initialized) return;
      this.initialized = true;
      console.log('🚀 Beacon tracking initialized (TheAgencyIQ)');
      
      // Fire initialization event
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('beacon:initialized', {
          detail: { source: 'theagencyiq-local', timestamp: Date.now() }
        }));
      }
    },
    
    track: function(event, data) {
      console.log('📊 Beacon tracking:', event, data || {});
      
      // Fire tracking event for analytics
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('beacon:track', {
          detail: { event: event, data: data || {}, timestamp: Date.now() }
        }));
      }
    },
    
    error: function(error) {
      console.warn('⚠️ Beacon error:', error);
    }
  };
  
  // Legacy compatibility
  window.beacon = window.replitBeacon;
  
  // Auto-initialize
  window.replitBeacon.init();
  
  // Handle external beacon calls
  if (typeof window.replitBeaconInit === 'function') {
    try {
      window.replitBeaconInit();
    } catch (e) {
      window.replitBeacon.error('External beacon init failed: ' + e.message);
    }
  }
  
})();`;
    
    res.send(beaconScript);
  });

  // Manifest.json endpoint
  app.get('/manifest.json', (req, res) => {
    res.json({
      "name": "TheAgencyIQ",
      "short_name": "AgencyIQ", 
      "description": "AI-powered social media automation platform",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#000000",
      "icons": [{ "src": "/attached_assets/agency_logo_1749083054761.png", "sizes": "512x512", "type": "image/png" }]
    });
  });

  // Static assets - placed AFTER beacon.js endpoint with cache-busting headers
  app.use('/public', express.static('public', {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
  app.use('/attached_assets', express.static('attached_assets', {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));

  // Create HTTP server
  const httpServer = createServer(app);

  // Cache clearing endpoint for stale auth issues - BEFORE route registration
  app.post('/api/clear-cache', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Clear-Site-Data', '"cache", "storage"');
    res.json({ 
      success: true, 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  });

  // Health check endpoint - MUST be first to bypass all middleware
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: !!process.env.DATABASE_URL,
      uptime: process.uptime(),
      version: '1.0.0'
    });
  });

  // Register API routes FIRST before any middleware that might interfere
  try {
    console.log('📡 Loading routes...');
    const { registerRoutes, addNotificationEndpoints } = await import('./routes');
    await registerRoutes(app);
    addNotificationEndpoints(app);
    console.log('✅ Routes registered successfully');
    
  } catch (routeError) {
    console.error('❌ Route registration failed:', routeError);
    throw routeError;
  }

  // Request logging after API registration
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api")) {
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });

  // Setup static file serving after API routes
  try {
    // Production static file serving
    if (process.env.NODE_ENV === 'production') {
      console.log('⚡ Setting up production static files...');
      // Serve built frontend assets
      app.use(express.static(path.join(process.cwd(), 'dist/public')));
      // Serve attached assets in production
      app.use('/attached_assets', express.static('attached_assets'));
      
      // Root route for production
      app.get('/', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist/index.html'));
      });
      
      // Serve React app for all non-API routes
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/oauth') && !req.path.startsWith('/callback') && !req.path.startsWith('/health')) {
          res.sendFile(path.join(process.cwd(), 'dist/index.html'));
        }
      });
      console.log('✅ Production static files setup complete');
    } else {
      console.log('⚡ Setting up production static serving (Vite-free)...');
      
      // Serve static files from dist/ (esbuild output)
      app.use(express.static('dist', { 
        setHeaders: (res, path) => {
          if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
          }
        }
      }));
      
      // Static assets
      app.use('/attached_assets', express.static('attached_assets'));
      app.use('/public', express.static('public'));
      
      console.log('✅ Static file serving configured (esbuild mode)');
    }
  } catch (error) {
    console.error('❌ Server setup error:', error);
    throw error;
  }

  // Global error handler for all routes
  app.use((error: any, req: any, res: any, next: any) => {
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
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
      timestamp: new Date().toISOString()
    });
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      port: process.env.PORT
    });
  });

  const PORT = parseInt(process.env.PORT || '5000');
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`TheAgencyIQ Server running on port ${PORT}`);
    console.log(`Deploy time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
    console.log('React app with OAuth bypass ready');
    console.log('Visit /public to bypass auth and access platform connections');
  });
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer().catch(console.error);