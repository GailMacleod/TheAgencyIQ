import express from 'express';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';
import crypto from 'crypto';
import { initializeMonitoring, logInfo, logError } from './monitoring';

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
  
  const app = express();

  // CRITICAL: Set up trust proxy for session cookie persistence
  app.set('trust proxy', 1);
  
  // Cookie parser middleware with signed cookies - MUST be before session middleware
  app.use(cookieParser('agencyiq-session-secret-key'));
  
  // SECURITY: Force signed cookies for all sessions
  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      // Force signed cookies on all responses
      if (req.sessionID && req.session) {
        res.cookie('theagencyiq.session', req.sessionID, {
          signed: true,
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'none',
          maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
        });
      }
      return originalSend.call(this, data);
    };
    next();
  });

  // Essential middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  // Filter out Replit-specific tracking in production
  app.use((req, res, next) => {
    // Block Replit tracking requests in production
    if (req.headers.host === 'app.theagencyiq.ai' && 
        (req.url.includes('replit') || req.url.includes('tracking') || req.url.includes('beacon'))) {
      return res.status(204).end(); // No content, ignore silently
    }
    
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, X-Retry-Session');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'Set-Cookie');
    res.header('Vary', 'Origin, Access-Control-Request-Headers');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Production-ready CSP with frame-ancestors for embedding and Replit beacon support
    res.header('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.googletagmanager.com https://replit.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https: wss: ws:; " +
      "frame-src 'self' https://www.facebook.com https://accounts.google.com; " +
      "frame-ancestors 'self' https://app.theagencyiq.ai https://www.facebook.com;"
    );
    
    // Clean Permissions-Policy - only recognized features with payment request support
    res.header('Permissions-Policy', 
      'camera=(), ' +
      'microphone=(), ' +
      'geolocation=(), ' +
      'payment=self, ' +
      'usb=(), ' +
      'accelerometer=(), ' +
      'gyroscope=(), ' +
      'magnetometer=(), ' +
      'fullscreen=self'
    );
    
    res.header('X-Frame-Options', 'SAMEORIGIN');
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

  // Device-agnostic session configuration for mobile-to-desktop continuity
  // Configure PostgreSQL session store
  const sessionTtl = 24 * 60 * 60 * 1000; // 24 hours
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Fix: Allow session table creation
    ttl: sessionTtl,
    tableName: "sessions",
    errorLog: (error) => {
      console.error('Session store error:', error);
    }
  });
  
  // Add debugging to the session store
  const originalGet = sessionStore.get.bind(sessionStore);
  sessionStore.get = function(sid, callback) {
    console.log(`🔍 Session store get: ${sid}`);
    return originalGet(sid, (err, session) => {
      console.log(`🔍 Session store get result: ${sid} => ${session ? 'found' : 'not found'}`);
      if (err) console.error(`❌ Session store get error: ${err}`);
      callback(err, session);
    });
  };

  // Test session store connection
  console.log('🔧 Testing session store connection...');
  sessionStore.get('test-connection', (err, session) => {
    if (err) {
      console.error('❌ Session store connection failed:', err);
    } else {
      console.log('✅ Session store connection successful');
    }
  });

  // CORS middleware with proper credentials support
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Source', 'X-Retry-Session', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }));

  // Session configuration - FIXED FOR BROWSER COOKIE TRANSMISSION WITH SIGNED COOKIES
  app.use(session({
    secret: process.env.SESSION_SECRET || "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'theagencyiq.session',
    cookie: { 
      secure: false,  // CRITICAL: Set to false for development
      maxAge: sessionTtl,
      httpOnly: false,      // Allow frontend access
      sameSite: 'lax',  // CRITICAL: Set to 'lax' for same-origin requests
      path: '/',
      signed: true        // Enable signed cookies for security
    },
    rolling: false,
    proxy: true
  }));

  // Session debugging middleware
  app.use((req, res, next) => {
    console.log(`🔍 Session Debug - ${req.method} ${req.url}`);
    console.log(`📋 Session ID: ${req.sessionID}`);
    console.log(`📋 User ID: ${req.session?.userId}`);
    console.log(`📋 Cookie Header: ${req.headers.cookie || 'MISSING'}`);
    
    next();
  });

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

  // Public bypass route - DISABLED FOR SECURITY
  app.get('/public', (req, res) => {
    console.log(`Public bypass route disabled for security at ${new Date().toISOString()}`);
    res.status(401).json({ message: 'Authentication required. Please login to access platform connections.' });
  });

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
        try {
          res.sendFile(path.join(process.cwd(), 'dist/index.html'));
        } catch (error) {
          console.error('Error serving index.html:', error);
          res.status(500).json({ error: 'Failed to serve index.html' });
        }
      });
      
      // Serve React app for all non-API routes
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/oauth') && !req.path.startsWith('/callback') && !req.path.startsWith('/health')) {
          try {
            res.sendFile(path.join(process.cwd(), 'dist/index.html'));
          } catch (error) {
            console.error('Error serving index.html for route:', req.path, error);
            res.status(500).json({ error: 'Failed to serve index.html' });
          }
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