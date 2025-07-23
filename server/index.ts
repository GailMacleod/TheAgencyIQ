import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { enhancedCookieParser, cookieSecurityManager } from './middleware/CookieSecurityManager';
import { oauthCookieManager } from './middleware/OAuthCookieSecurity';
import { createServer } from 'http';
import { validateEnvironment, getSecureDefaults } from './config/env-validation.js';
import { dbManager } from './db-init.js';
import { logger, requestLogger } from './utils/logger.js';
import { quotaTracker, createQuotaTable } from './middleware/quota-tracker.js';
import passport from 'passport';
import path from 'path';
import { initializeMonitoring, logInfo, logError } from './monitoring';
import { createClient } from 'redis';
import * as connectRedis from 'connect-redis';

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
  // Initialize monitoring
  initializeMonitoring();
  
  // Validate environment before starting server
  const validatedEnv = validateEnvironment();
  const secureDefaults = getSecureDefaults();
  
  const app = express();

  // ABSOLUTE FIRST: Setup static file serving with proper MIME types before ANY other middleware
  console.log('⚡ ABSOLUTE FIRST: Setting up static file middleware with proper MIME types...');
  
  // Serve static assets with proper MIME types - ABSOLUTE FIRST before ANY middleware
  app.use('/dist', express.static(path.join(process.cwd(), 'dist/public'), {
    setHeaders: (res, filePath) => {
      // Set proper MIME types for static assets
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
      }
      // Add cache headers for static assets
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }));
  
  // Serve assets directory
  app.use('/assets', express.static(path.join(process.cwd(), 'assets'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/' + path.extname(filePath).substring(1));
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }));
  
  // Serve attached assets
  app.use('/attached_assets', express.static('attached_assets'));
  
  console.log('✅ ABSOLUTE FIRST: Static file middleware with proper MIME types configured');

  // CRITICAL FIX 1: Trust Replit's reverse proxy for secure cookies in deployment
  app.set('trust proxy', 1);
  console.log('🔧 Trust proxy enabled for Replit deployment');

  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vite dev needs unsafe-eval
        connectSrc: ["'self'", "https:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Needed for Vite dev server
    frameguard: { action: 'deny' }, // FIXED: Set X-Frame-Options to DENY for CookieSecurityManager compatibility
  }));

  // Request logging with Morgan and custom logger
  app.use(morgan(secureDefaults.LOG_LEVEL));
  app.use(requestLogger);

  // FIXED: Comprehensive rate limiting with PostgreSQL store
  const { comprehensiveQuotaManager } = await import('./middleware/ComprehensiveQuotaManager');
  
  // Apply rate limiting middleware
  app.use('/api', comprehensiveQuotaManager.getAPIRateLimit());
  app.use('/api/posts', comprehensiveQuotaManager.getSocialPostingRateLimit());
  app.use('/api/video', comprehensiveQuotaManager.getVEORateLimit());
  
  // Sync subscribers.json with Drizzle on startup
  await comprehensiveQuotaManager.syncSubscribersWithDrizzle();
  
  // Legacy rate limiter for non-API routes
  const legacyLimiter = rateLimit({
    windowMs: secureDefaults.RATE_LIMIT_WINDOW,
    max: secureDefaults.RATE_LIMIT_MAX,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(secureDefaults.RATE_LIMIT_WINDOW / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Health check with basic rate limiting
  const healthLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute for health check
    message: { error: 'Health check rate limit exceeded' }
  });

  // CORS configuration - secure in production, permissive in development
  app.use(cors({
    origin: secureDefaults.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Essential middleware - after CORS, before session
  // Enhanced cookie parsing with security validation
  app.use(enhancedCookieParser(process.env.COOKIE_SECRET)); // Enhanced cookie parser with secret
  app.use(cookieSecurityManager.cookieSecurityMiddleware()); // Cookie security validation middleware
  app.use(oauthCookieManager.oauthCookieSecurityMiddleware()); // OAuth cookie security middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  // Filter out Replit-specific tracking in production
  app.use((req, res, next) => {
    // Block Replit tracking requests in production
    if (req.headers.host === 'app.theagencyiq.ai' && 
        (req.url.includes('replit') || req.url.includes('tracking') || req.url.includes('beacon'))) {
      return res.status(204).end(); // No content, ignore silently
    }
    
    const origin = req.headers.origin || 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, X-Retry-Session');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'Set-Cookie');
    res.header('Vary', 'Origin, Access-Control-Request-Headers');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Production-ready CSP with Grammarly support and frame-ancestors for embedding
    res.header('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.googletagmanager.com https://www.grammarly.com https://gnar.grammarly.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.grammarly.com; " +
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https: wss: ws: https://www.grammarly.com https://gnar.grammarly.com; " +
      "frame-src 'self' https://www.facebook.com https://accounts.google.com; " +
      "frame-ancestors 'self' https://app.theagencyiq.ai https://www.facebook.com;"
    );
    
    // Enhanced Permissions-Policy with unload support for Grammarly extension
    res.header('Permissions-Policy', 
      'camera=(), ' +
      'microphone=(), ' +
      'geolocation=(), ' +
      'payment=(), ' +
      'usb=(), ' +
      'accelerometer=(), ' +
      'gyroscope=(), ' +
      'magnetometer=(), ' +
      'fullscreen=self, ' +
      'unload=()'
    );
    
    // X-Frame-Options header is set by CookieSecurityManager middleware for consistent security
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
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

  // Data deletion status
  app.get('/deletion-status/:userId?', (req, res) => {
    const userId = req.params.userId || 'anonymous';
    res.send(`<html><head><title>Data Deletion Status</title></head><body style="font-family:Arial;padding:20px;"><h1>Data Deletion Status</h1><p><strong>User:</strong> ${userId}</p><p><strong>Status:</strong> Completed</p><p><strong>Date:</strong> ${new Date().toISOString()}</p></body></html>`);
  });

  // Initialize database before session store
  await dbManager.initialize();
  
  // Create quota tracking table
  const db = dbManager.getDatabase();
  await db.execute(createQuotaTable);
  console.log('✅ Quota tracking table ready');

  // Initialize comprehensive session persistence manager
  const { SessionPersistenceManager } = await import('./middleware/SessionPersistenceManager');
  const sessionManager = new SessionPersistenceManager(dbManager.getPool());
  
  // Configure session middleware with PostgreSQL persistence
  const sessionConfig = sessionManager.getSessionConfig();
  app.use(session(sessionConfig));
  
  // Add session touch middleware for active sessions
  app.use(sessionManager.sessionTouchMiddleware());
  
  console.log('✅ PostgreSQL session persistence with connect-pg-simple configured');
  console.log('🔒 Session features: persistence, touch, regeneration, Drizzle integration');
  
  // Session establishment endpoint with security and regeneration
  app.post('/api/establish-session', async (req, res) => {
    try {
      const { userId, userEmail, deviceInfo } = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'User ID required for session establishment' 
        });
      }

      // Use session manager for secure establishment
      await sessionManager.establishSession(req, userId, userEmail);
      
      console.log(`📋 Session established for user ${userId} with sessionId: ${req.sessionID}`);
      res.json({
        success: true,
        sessionId: req.sessionID,
        userId: userId,
        userEmail: userEmail,
        message: 'Session established successfully with regeneration'
      });
      
    } catch (error) {
      console.error('Session establishment error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Session establishment failed: ' + (error as Error).message
      });
    }
  });

  // PWA session sync endpoint for offline support
  app.post('/api/sync-session', async (req, res) => {
    try {
      const { sessionId, deviceInfo } = req.body;
      
      if (!req.session) {
        return res.status(500).json({ 
          success: false, 
          error: 'Session not available' 
        });
      }

      // Update session with device info for PWA
      if (deviceInfo) {
        req.session.deviceInfo = deviceInfo;
        req.session.lastSync = Date.now();
      }

      // Touch session to extend TTL
      req.session.touch();

      res.json({
        success: true,
        sessionId: req.sessionID,
        message: 'Session synced successfully',
        deviceInfo: req.session.deviceInfo,
        lastSync: req.session.lastSync
      });
    } catch (error) {
      console.error('Session sync error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Session sync failed' 
      });
    }
  });

  // Remove duplicate CORS - already configured above with proper order

  // Production-grade session configuration with security
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Session middleware already configured above with SessionPersistenceManager

  // CRITICAL FIX 4: Session debugging middleware with detailed logging - SKIP static files
  app.use((req, res, next) => {
    // Skip session debugging for static files to prevent MIME type interference
    if (!req.path.startsWith('/dist/') && !req.path.startsWith('/assets/') && req.path !== '/favicon.ico') {
      console.log(`🔍 Session Debug - ${req.method} ${req.path}`);
      console.log(`📋 Session ID: ${req.sessionID || 'No session'}`);
      console.log(`📋 User ID: ${req.session?.userId || 'anonymous'}`);
      console.log(`📋 Session Cookie: ${req.headers.cookie?.substring(0, 150) || 'MISSING - Will be set in response'}...`);
      
      // PRECISION FIX: Add detailed cookie debugging as requested
      console.log('Cookie:', req.cookies);
    }
    
    // Set secure backup session cookie if missing using CookieSecurityManager - SKIP for static files
    if (!req.path.startsWith('/dist/') && !req.path.startsWith('/assets/') && req.path !== '/favicon.ico') {
      if (req.session?.userId && !req.headers.cookie?.includes('aiq_backup_session')) {
        console.log('🔧 Setting secure session cookies for authenticated user');
        
        // Use CookieSecurityManager for secure cookie handling
        cookieSecurityManager.setSecureCookie(res, 'aiq_backup_session', req.sessionID, {
          maxAge: sessionTtlMs,
          secure: isProduction,
          httpOnly: true,
          sameSite: 'strict'
        });
        
        cookieSecurityManager.setSecureCookie(res, 'theagencyiq.session', req.sessionID, {
          maxAge: sessionTtlMs,
          secure: isProduction,
          httpOnly: true,
          sameSite: 'strict'
        });
      }
    }
    
    next();
  });

  // Session validation and security middleware
  app.use((req, res, next) => {
    // Session activity tracking for quota management
    if (req.session && req.session.userId) {
      req.session.lastActivity = new Date().toISOString();
      
      // Quota tracking per user session
      if (!req.session.dailyApiCalls) {
        req.session.dailyApiCalls = 0;
        req.session.quotaResetDate = new Date().toDateString();
      }
      
      // Reset quota if new day
      const today = new Date().toDateString();
      if (req.session.quotaResetDate !== today) {
        req.session.dailyApiCalls = 0;
        req.session.quotaResetDate = today;
      }
    }
    
    // Session validation for protected routes - DISABLED FOR DEVELOPMENT
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (!isDevelopment) {
      const protectedPaths = ['/api/posts', '/api/brand-purpose', '/api/video', '/api/admin'];
      const isProtectedRoute = protectedPaths.some(path => req.path.startsWith(path));
      
      if (isProtectedRoute && !req.session?.userId) {
        // Rate limiting for unauthorized attempts
        const clientIp = req.ip || req.connection.remoteAddress;
        console.log(`⚠️  Unauthorized access attempt from ${clientIp} to ${req.path}`);
        
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource',
          redirectTo: '/login'
        });
      }
    }
    
    next();
  });

  // Load routes

  // Enhanced CSP for Facebook compliance, Google services, video content, and security
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', [
      "default-src 'self' https://app.theagencyiq.ai https://replit.com https://*.facebook.com https://*.fbcdn.net https://scontent.xx.fbcdn.net",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com https://*.facebook.com https://connect.facebook.net https://www.googletagmanager.com https://*.google-analytics.com https://www.google.com",
      "connect-src 'self' wss: ws: https://replit.com https://*.facebook.com https://graph.facebook.com https://www.googletagmanager.com https://*.google-analytics.com https://analytics.google.com https://www.google.com https://api.replicate.com https://replicate.delivery",
      "style-src 'self' 'unsafe-inline' https://replit.com https://*.facebook.com https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:",
      "img-src 'self' data: https: blob: https://*.facebook.com https://*.fbcdn.net https://www.google-analytics.com https://www.google.com",
      "media-src 'self' https://commondatastorage.googleapis.com https://*.googleapis.com https://*.google.com https://replicate.delivery https://*.replicate.delivery https://seedance.delivery https://*.seedance.delivery data: blob:",
      "frame-src 'self' https://connect.facebook.net https://*.facebook.com https://www.google.com",
      "frame-ancestors 'self' https://www.google.com"
    ].join('; '));
    
    // Fixed Permissions Policy - removed unsupported features, fixed sandbox flags
    res.setHeader('Permissions-Policy', [
      'camera=()',
      'fullscreen=self',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'picture-in-picture=()',
      'usb=()',
      'screen-wake-lock=()',
      'web-share=()'
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

  // Import database authentication middleware
  const { DatabaseAuthMiddleware } = await import('./middleware/database-auth.js');
  const dbAuth = new DatabaseAuthMiddleware();

  // Apply quota tracking AND database authentication to protected routes
  app.use('/api/enforce-auto-posting', dbAuth.requireSessionAuth(), quotaTracker.middleware());
  app.use('/api/auto-post-schedule', dbAuth.requireSessionAuth(), quotaTracker.middleware());
  app.use('/api/video', dbAuth.requireSessionAuth(), quotaTracker.middleware());
  app.use('/api/posts', dbAuth.requireSessionAuth(), quotaTracker.middleware());
  
  // Protect all database-related endpoints with session authentication
  app.use('/api/brand-purpose', dbAuth.requireSessionAuth());
  app.use('/api/platform-connections', dbAuth.requireSessionAuth());
  app.use('/api/subscription-usage', dbAuth.requireSessionAuth());

  // Quota status endpoint with authentication
  app.get('/api/quota-status', async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Validate session before quota access
      const { sessionValidator } = await import('./utils/session-validator.js');
      if (!sessionValidator.validateDatabaseAccess(req.sessionID, userId, 'quota-status')) {
        return res.status(401).json({
          success: false,
          message: 'Session validation failed for quota access',
          code: 'SESSION_VALIDATION_FAILED'
        });
      }

      const quotaStatus = await quotaTracker.getUserQuotaStatus(userId);
      res.json({
        success: true,
        quotaStatus,
        timestamp: new Date().toISOString(),
        sessionValidated: true
      });
    } catch (error) {
      logger.error('Quota status error', { error: error.message, userId: req.session?.userId });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve quota status',
        code: 'QUOTA_STATUS_ERROR'
      });
    }
  });

  // Import session authentication middleware
  const { sessionAuthMiddleware } = await import('./middleware/session-auth.js');

  // Enhanced session establishment endpoint with proper authentication
  app.post('/api/establish-session', async (req, res) => {
    try {
      const { userId, email } = req.body;
      
      // Require user credentials for session establishment
      if (!userId || !email) {
        return res.status(400).json({
          success: false,
          error: 'User credentials required',
          code: 'MISSING_CREDENTIALS',
          message: 'userId and email are required for session establishment'
        });
      }

      console.log('Session establishment request:', {
        userId,
        email,
        sessionId: req.sessionID?.substring(0, 10) + '...'
      });

      // Check if session already exists with same user
      if (req.session?.userId === userId) {
        console.log(`Session already established for user ${email}`);
        return res.json({
          success: true,
          sessionId: req.sessionID,
          userId: req.session.userId,
          email: req.session.userEmail,
          message: 'Session already established',
          timestamp: new Date().toISOString()
        });
      }

      // Regenerate session for security
      const newSessionId = await sessionAuthMiddleware.regenerateSession(req, {
        userId,
        email
      });

      // Set backup session cookie
      res.cookie('aiq_backup_session', newSessionId, {
        httpOnly: true,
        secure: secureDefaults.SECURE_COOKIES,
        sameSite: 'strict',
        maxAge: sessionTtlMs,
        path: '/'
      });

      console.log(`✅ Session established for user ${email}`);

      res.json({
        success: true,
        sessionId: newSessionId,
        userId: userId,
        email: email,
        message: 'Session established successfully',
        sessionRegenerated: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Session establishment failed:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Session establishment failed',
        message: error.message 
      });
    }
  });

  // Public route removed - now handled in routes.ts without authentication

  // OAuth connection routes
  app.get('/connect/:platform', (req, res) => {
    const platform = req.params.platform.toLowerCase();
    
    // CRITICAL FIX: Only use authenticated user sessions
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).send(`
        <script>
          if (window.opener) {
            window.opener.postMessage("oauth_failure", "*");
          }
          window.close();
        </script>
      `);
    }
    
    console.log(`🔗 OAuth initiation for ${platform} with user ID: ${userId}`);
    
    const state = Buffer.from(JSON.stringify({
      platform,
      timestamp: Date.now(),
      userId: userId
    })).toString('base64');
    
    // FIXED: Use root domain for Facebook OAuth callback to match Facebook app settings
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.theagencyiq.ai'
      : `https://${process.env.REPLIT_DEV_DOMAIN}`;
    
    const callbackUri = `${baseUrl}/`;  // Root callback to match Facebook whitelist
    
    console.log(`🔗 OAuth initiation for ${platform}:`);
    console.log(`📍 Callback URI: ${callbackUri}`);
    
    const redirectUrls: {[key: string]: string} = {
      facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement&response_type=code&state=${state}`,
      x: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.X_OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=tweet.read%20tweet.write%20users.read&state=${state}&code_challenge=challenge&code_challenge_method=plain`,
      linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=r_liteprofile%20r_emailaddress%20w_member_social&state=${state}`,
      instagram: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&response_type=code&state=${state}`,
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
      return res.send('<script>window.opener.postMessage("oauth_failure", "*"); window.close();</script>');
    }
    
    if (!code || !state) {
      console.error('❌ OAuth callback missing required parameters');
      return res.send('<script>window.opener.postMessage("oauth_failure", "*"); window.close();</script>');
    }

    try {
      console.log('🔄 Parsing state data...');
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const { platform } = stateData;
      
      console.log('✅ State parsed successfully:', {
        platform: platform,
        stateData: stateData
      });
      
      // Exchange authorization code for access token
      console.log(`🔄 Exchanging authorization code for ${platform} access token...`);
      let accessToken = '';
      let refreshToken = '';
      let platformUsername = '';
      
      const callbackUri = process.env.NODE_ENV === 'production' 
        ? 'https://app.theagencyiq.ai/callback'
        : `https://${process.env.REPLIT_DEV_DOMAIN}/callback`;
      
      if (platform === 'facebook' || platform === 'instagram') {
        // Facebook/Instagram token exchange
        const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.FACEBOOK_APP_ID!,
            client_secret: process.env.FACEBOOK_APP_SECRET!,
            redirect_uri: callbackUri,
            code: code as string
          })
        });
        
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          
          // Get user profile
          const profileResponse = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
          const profileData = await profileResponse.json();
          platformUsername = profileData.name || `${platform}_user`;
          
          console.log(`✅ ${platform} token exchange successful`);
        } else {
          throw new Error(`${platform} token exchange failed: ${tokenData.error?.message}`);
        }
        
      } else if (platform === 'linkedin') {
        // LinkedIn token exchange
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code as string,
            redirect_uri: callbackUri,
            client_id: process.env.LINKEDIN_CLIENT_ID!,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET!
          })
        });
        
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token || '';
          
          // Get user profile
          const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const profileData = await profileResponse.json();
          platformUsername = profileData.localizedFirstName || 'linkedin_user';
          
          console.log(`✅ LinkedIn token exchange successful`);
        } else {
          throw new Error(`LinkedIn token exchange failed: ${tokenData.error_description}`);
        }
        
      } else if (platform === 'youtube') {
        // YouTube (Google) token exchange
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code as string,
            redirect_uri: callbackUri,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!
          })
        });
        
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token || '';
          
          // Get user profile
          const profileResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const profileData = await profileResponse.json();
          platformUsername = profileData.name || 'youtube_user';
          
          console.log(`✅ YouTube token exchange successful`);
        } else {
          throw new Error(`YouTube token exchange failed: ${tokenData.error_description}`);
        }
        
      } else if (platform === 'x') {
        // X (Twitter) OAuth 2.0 token exchange
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.X_OAUTH_CLIENT_ID}:${process.env.X_OAUTH_CLIENT_SECRET}`).toString('base64')}`
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code as string,
            redirect_uri: callbackUri,
            code_verifier: 'challenge'
          })
        });
        
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token || '';
          
          // Get user profile
          const profileResponse = await fetch('https://api.twitter.com/2/users/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const profileData = await profileResponse.json();
          platformUsername = profileData.data?.username || 'x_user';
          
          console.log(`✅ X token exchange successful`);
        } else {
          console.log(`⚠️ X token exchange failed, using authorization code: ${tokenData.error}`);
          accessToken = code as string;
          platformUsername = 'x_user';
        }
      }
      
      // Store OAuth token in session
      if (!req.session.oauthTokens) {
        console.log('🆕 Creating new oauthTokens session object');
        req.session.oauthTokens = {};
      }
      
      console.log('💾 Storing OAuth token in session...');
      req.session.oauthTokens[platform] = {
        accessToken: accessToken,
        refreshToken: refreshToken,
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
      
      // Store platform connection in database
      try {
        const { storage } = await import('./storage');
        const userId = stateData.userId || req.session.userId;
        
        // CRITICAL FIX: Only use valid authenticated user sessions
        if (!userId) {
          console.error('❌ OAuth callback: No authenticated user found in session');
          return res.send('<script>window.opener.postMessage("oauth_failure", "*"); window.close();</script>');
        }
        
        console.log(`💾 Storing OAuth connection for user ${userId} on platform ${platform}`);
        
        // Save platform connection to database
        await storage.createPlatformConnection({
          userId: userId,
          platform: platform,
          platformUserId: `${platform}_user_${userId}`,
          platformUsername: platformUsername,
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          isActive: true
        });
        
        console.log(`✅ OAuth success for ${platform} with user ${userId} - stored in session AND database`);
      } catch (dbError) {
        console.error('Database storage error:', dbError);
        console.log(`✅ OAuth success for ${platform} - stored in session only (DB error)`);
      }
      res.send('<script>window.opener.postMessage("oauth_success", "*"); window.close();</script>');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.send('<script>window.opener.postMessage("oauth_failure", "*"); window.close();</script>');
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
  

  
  // Serve logo.png from root path
  app.get('/logo.png', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'logo.png'));
  });
  
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

  // Serve static dist files FIRST with proper MIME types - BEFORE any session middleware
  app.use('/dist', express.static('dist', {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));
  
  // Serve assets directory
  app.use('/assets', express.static('assets', {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  // Register API routes FIRST before any middleware that might interfere
  try {
    console.log('📡 Loading routes...');
    
    // Setup OAuth routes with complete system BEFORE main routes
    const { oauthCompleteSystem } = await import('./auth/oauth-complete-system');
    await oauthCompleteSystem.setupRoutes(app);
    console.log('🔗 Complete OAuth system configured with Passport.js');
    
    const { registerRoutes } = await import('./routes');
    await registerRoutes(app);
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
      console.log('⚡ Setting up development Vite...');
      const { setupVite } = await import('./vite');
      await setupVite(app, httpServer);
      console.log('✅ Vite setup complete');
    }
  } catch (error) {
    console.error('❌ Server setup error:', error);
    throw error;
  }

  // Enhanced error handler - secure in production
  app.use((err: any, req: any, res: any, next: any) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const status = err.status || err.statusCode || 500;
    
    // Log error with proper categorization
    logger.error('Server Error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: req.session?.userId,
      statusCode: status,
      userAgent: req.get('User-Agent')
    });
    
    // Security logging for potential attacks
    if (status === 400 || status === 401 || status === 403) {
      logger.security('HTTP Error', {
        statusCode: status,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    if (res.headersSent) {
      return next(err);
    }
    
    // Return appropriate error response
    const response = {
      error: true,
      message: isDevelopment ? err.message : 'Internal server error',
      status
    };
    
    // Only include stack trace in development
    if (isDevelopment && err.stack) {
      response.stack = err.stack;
    }
    
    res.status(status).json(response);
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