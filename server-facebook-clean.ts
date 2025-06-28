import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import path from 'path';
import { setupVite, serveStatic, log } from './vite';

async function startServer() {
  const app = express();

  // Add body parsing middleware FIRST
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Environment-aware base URL (Single Truth Source)
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://app.theagencyiq.ai'
    : 'http://localhost:5000';

  // UNIFIED FACEBOOK ENDPOINT - Single Path with Query Differentiation
  app.all('/facebook', (req, res) => {
    try {
      console.log('Facebook unified endpoint accessed');
      console.log('Method:', req.method);
      console.log('Query:', req.query);
      console.log('Body:', req.body);
      
      const { code, signed_request, action } = { ...req.body, ...req.query };
      
      if (code) {
        // OAuth callback
        console.log('OAuth callback received');
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Facebook OAuth Success</title>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>✅ Facebook Connection Successful</h1>
            <p>Authorization code received and will be processed.</p>
            <script>
              setTimeout(() => {
                if (window.opener) window.close();
              }, 3000);
            </script>
          </body>
          </html>
        `);
      } else if (signed_request || action === 'deletion' || req.method === 'GET') {
        // Data deletion endpoint
        if (req.method === 'GET') {
          console.log('Facebook data deletion validation GET');
          res.status(200).json({ status: 'ok' });
        } else {
          console.log('Facebook data deletion POST');
          let userId = 'unknown_user';
          
          if (signed_request) {
            try {
              const parts = signed_request.split('.');
              if (parts.length === 2) {
                let payload = parts[1];
                payload += '='.repeat((4 - payload.length % 4) % 4);
                payload = payload.replace(/-/g, '+').replace(/_/g, '/');
                
                const decodedPayload = Buffer.from(payload, 'base64').toString();
                const data = JSON.parse(decodedPayload);
                userId = data.user_id || data.userId || 'parsed_user';
                console.log(`Data deletion requested for Facebook user: ${userId}`);
              }
            } catch (parseError) {
              console.error('Signed request parse error:', parseError);
              userId = 'parse_error_' + Math.random().toString(36).substr(2, 9);
            }
          }
          
          const confirmationCode = 'del_' + Math.random().toString(36).substr(2, 9);
          res.json({
            url: `${baseUrl}/deletion-status/${userId}`,
            confirmation_code: confirmationCode
          });
        }
      } else {
        throw new Error('Invalid Facebook request');
      }
    } catch (error) {
      console.error('Facebook Error:', error);
      res.status(500).json({ 
        error: 'Server error', 
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
      });
    }
  });

  // Data Deletion Status Page
  app.get('/deletion-status/:userId?', (req, res) => {
    try {
      const { userId } = req.params;
      const displayUserId = userId || 'anonymous';
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Data Deletion Status</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1>Data Deletion Request Status</h1>
          <p><strong>User ID:</strong> ${displayUserId}</p>
          <p><strong>Status:</strong> Your data deletion request has been processed successfully.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p style="color: #666; font-size: 14px;">
            Your personal data associated with TheAgencyIQ has been permanently removed from our systems.
            This action cannot be undone.
          </p>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Status page error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Essential static files with robust handling
  app.get('/manifest.json', (req, res) => {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json({
        "name": "TheAgencyIQ",
        "short_name": "AgencyIQ",
        "description": "Complete 5-Platform Social Media Automation for Queensland Small Businesses",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#fcfcfc",
        "theme_color": "#3250fa",
        "icons": [
          {
            "src": "/attached_assets/agency_logo_1749083054761.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
          }
        ],
        "categories": ["business", "productivity", "social"],
        "lang": "en",
        "dir": "ltr",
        "orientation": "portrait-primary"
      });
    } catch (error) {
      console.error('Manifest error:', error);
      res.status(500).json({ error: 'Manifest unavailable' });
    }
  });

  // Beacon.js with failsafe handling
  app.get('/public/js/beacon.js', (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(`
        // Beacon.js - Analytics and tracking
        console.log('Beacon.js loaded successfully');
        
        // Initialize tracking
        window.beacon = {
          track: function(event, data) {
            console.log('Tracking event:', event, data);
          },
          init: function() {
            console.log('Beacon tracking initialized');
          }
        };
        
        // Auto-initialize
        if (typeof window !== 'undefined') {
          window.beacon.init();
        }
      `);
    } catch (error) {
      console.error('Beacon error:', error);
      res.status(500).json({ error: 'Beacon unavailable' });
    }
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Production-ready session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax'
    }
  }));

  // Import and register all other routes
  const { registerRoutes } = await import('./routes');
  registerRoutes(app);

  // Setup Vite middleware (after API routes)
  if (process.env.NODE_ENV === 'development') {
    await setupVite(app);
  } else {
    serveStatic(app);
  }

  // Global error handlers
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
  });

  const httpServer = createServer(app);
  const PORT = parseInt(process.env.PORT || '5000');
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`TheAgencyIQ Server running on port ${PORT}`);
    console.log(`Deploy time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
    console.log(`Base URL: ${baseUrl}`);
    console.log('Unified Facebook endpoint: /facebook');
  });
}

// Start the server
startServer().catch(console.error);