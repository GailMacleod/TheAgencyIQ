import express from 'express';
import session from 'express-session';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(express.json());
app.use(session({
  "secret": "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
  "resave": false,
  "saveUninitialized": false,
  "cookie": {"secure": process.env.NODE_ENV === 'production', "maxAge": 24 * 60 * 60 * 1000}
}));

// CSP header for React and OAuth
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' https://replit.com https://scontent.xx.fbcdn.net; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com https://connect.facebook.net https://checkout.stripe.com https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com; connect-src 'self' wss: ws: https://replit.com https://graph.facebook.com https://api.linkedin.com https://api.twitter.com https://graph.instagram.com https://www.googleapis.com; style-src 'self' 'unsafe-inline' https://replit.com; img-src 'self' data: https: blob:; font-src 'self' https://replit.com data:; frame-src 'self' https://checkout.stripe.com https://js.stripe.com https://connect.facebook.net;");
  next();
});

// Public bypass route for OAuth setup
app.get('/public', (req, res) => {
  req.session.userId = 2;
  console.log(`React fix bypass activated at ${new Date().toISOString()}`);
  res.redirect('/platform-connections');
});

// OAuth connection routes
app.get('/connect/:platform', (req, res) => {
  const platform = req.params.platform.toLowerCase();
  req.session.userId = 2;
  
  const redirectUrls = {
    facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/auth/facebook/callback`)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement&response_type=code&state=facebook-${Date.now()}`,
    x: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.X_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/auth/x/callback`)}&scope=tweet.read%20tweet.write%20users.read&state=x-${Date.now()}&code_challenge=challenge&code_challenge_method=plain`,
    linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/auth/linkedin/callback`)}&scope=r_liteprofile%20r_emailaddress%20w_member_social&state=linkedin-${Date.now()}`,
    instagram: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/auth/instagram/callback`)}&scope=instagram_basic,instagram_content_publish&response_type=code&state=instagram-${Date.now()}`,
    youtube: `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/auth/youtube/callback`)}&scope=https://www.googleapis.com/auth/youtube.upload&state=youtube-${Date.now()}`
  };
  
  if (redirectUrls[platform]) {
    console.log(`OAuth initiated for ${platform} at ${new Date().toISOString()}`);
    res.redirect(redirectUrls[platform]);
  } else {
    res.status(404).send(`Platform ${platform} not supported`);
  }
});

// OAuth callback handlers
app.get('/auth/:platform/callback', async (req, res) => {
  const platform = req.params.platform;
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).send(`${platform} OAuth failed - no code received`);
  }
  
  try {
    if (!req.session.oauthTokens) req.session.oauthTokens = {};
    req.session.oauthTokens[platform] = { code, state, timestamp: Date.now() };
    
    console.log(`OAuth succeeded for ${platform} at ${new Date().toISOString()}`);
    res.send(`
      <h1>${platform.toUpperCase()} OAuth Success!</h1>
      <p>Authorization code received and stored.</p>
      <p>Platform: ${platform}</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
      <p><a href="/platform-connections">Return to Platform Connections</a></p>
      <script>
        console.log('OAuth succeeded for ${platform}');
        setTimeout(() => window.close(), 3000);
      </script>
    `);
  } catch (error) {
    console.error(`OAuth error for ${platform}:`, error);
    res.status(500).send(`${platform} OAuth error: ${error.message}`);
  }
});

// Register API routes BEFORE Vite proxy
const { registerRoutes } = await import('./routes');
await registerRoutes(app);

// Health check endpoint
app.get('/api/server-status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    frontend: 'vite-proxy',
    oauth: 'ready'
  });
});

// Vite proxy for development or static serving for production
if (process.env.NODE_ENV === 'development') {
  // In development, proxy to Vite dev server
  const viteProxy = createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true,
    pathRewrite: {
      '^/': '/'
    }
  });
  
  app.use('/', (req, res, next) => {
    // Skip API routes and OAuth routes
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/connect') || req.path === '/public') {
      return next();
    }
    viteProxy(req, res, next);
  });
} else {
  // In production, serve built files
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  
  // Fallback to index.html for SPA routing
  app.get('*', (req, res, next) => {
    // Skip API routes and OAuth routes
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/connect') || req.path === '/public') {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TheAgencyIQ Server running on port ${PORT}`);
  console.log(`Deploy time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
  console.log(`Mode: ${process.env.NODE_ENV === 'development' ? 'Vite proxy' : 'Static build'}`);
  console.log('React frontend with OAuth bypass ready');
  console.log('Visit /public to bypass auth and access platform connections');
});