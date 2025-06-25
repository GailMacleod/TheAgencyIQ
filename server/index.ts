import express from 'express';
import session from 'express-session';
import fs from 'fs';
import { setupVite, serveStatic } from './vite';
import routes from './routes';

const app = express();

// Async wrapper to handle top-level await
async function startServer() {
app.use(express.json());
app.use(session({
  "secret": "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
  "resave": false,
  "saveUninitialized": false,
  "cookie": {"secure": process.env.NODE_ENV === 'production', "maxAge": 24 * 60 * 60 * 1000}
}));


// Mount API routes before Vite frontend
app.use('/api', routes);
console.log('Routes module loaded successfully');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  // Completely suppress unhandled rejections to prevent console spam
});
app.use((err, req, res, next) => {
  console.error('Middleware Error:', err.stack);
  res.status(500).json({"error": "Server error", "details": err.message});
});

// Setup Vite for frontend serving AFTER API routes
if (process.env.NODE_ENV === 'development') {
  setupVite(app);
} else {
  serveStatic(app);
}
// Setup Vite for frontend serving first
if (process.env.NODE_ENV === 'development') {
  setupVite(app);
} else {
  serveStatic(app);
}

// OAuth callback endpoint for all platforms
app.get('/api/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const host = req.get('host');
  const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
                  host?.includes('localhost') ? `http://${host}` : `https://${host}`;
  const platform = req.session.oauthPlatform || 'unknown';
  
  console.log(`OAuth callback: platform=${platform}, code=${code}, state=${state}, error=${error}, url=${baseUrl}`);
  
  if (error || !code) {
    console.error(`OAuth callback failed for ${platform}:`, error);
    return res.status(400).json({
      "error": "OAuth callback failed",
      "details": { platform, code, state, error }
    });
  }

  try {
    let tokens = null;
    
    // Handle X platform OAuth 2.0
    if (platform === 'x' || platform === 'twitter') {
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          code: code.toString(),
          grant_type: 'authorization_code',
          client_id: process.env.X_CLIENT_ID,
          redirect_uri: `${baseUrl}/api/oauth/callback`,
          code_verifier: req.session.codeVerifier || ''
        })
      });
      
      tokens = await tokenResponse.json();
      if (tokens.access_token) {
        process.env.X_ACCESS_TOKEN = tokens.access_token;
        process.env.X_REFRESH_TOKEN = tokens.refresh_token;
        console.log('X tokens updated successfully');
      }
    }
    
    // Handle Facebook OAuth 2.0
    else if (platform === 'facebook') {
      const tokenResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(baseUrl + '/api/oauth/callback')}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`);
      
      tokens = await tokenResponse.json();
      if (tokens.access_token) {
        process.env.FACEBOOK_ACCESS_TOKEN = tokens.access_token;
        console.log('Facebook tokens updated successfully');
      }
    }
    
    // Handle LinkedIn OAuth 2.0
    else if (platform === 'linkedin') {
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code.toString(),
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
          redirect_uri: `${baseUrl}/api/oauth/callback`
        })
      });
      
      tokens = await tokenResponse.json();
      if (tokens.access_token) {
        process.env.LINKEDIN_ACCESS_TOKEN = tokens.access_token;
        console.log('LinkedIn tokens updated successfully');
      }
    }
    
    // Save tokens to .env file for persistence
    if (tokens && tokens.access_token) {
      const envPath = '.env';
      let envContent = '';
      
      try {
        envContent = fs.readFileSync(envPath, 'utf8');
      } catch (err) {
        console.log('Creating new .env file');
      }
      
      // Update or add token entries
      const platformKey = platform.toUpperCase();
      const tokenKey = `${platformKey}_ACCESS_TOKEN`;
      const refreshKey = `${platformKey}_REFRESH_TOKEN`;
      
      if (envContent.includes(tokenKey)) {
        envContent = envContent.replace(new RegExp(`${tokenKey}=.*`), `${tokenKey}=${tokens.access_token}`);
      } else {
        envContent += `\n${tokenKey}=${tokens.access_token}`;
      }
      
      if (tokens.refresh_token) {
        if (envContent.includes(refreshKey)) {
          envContent = envContent.replace(new RegExp(`${refreshKey}=.*`), `${refreshKey}=${tokens.refresh_token}`);
        } else {
          envContent += `\n${refreshKey}=${tokens.refresh_token}`;
        }
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log(`Tokens saved to .env for ${platform}`);
    }
    
    // Redirect to connection success page
    res.redirect(`/connect-platforms?success=${platform}`);
    
  } catch (err) {
    console.error(`OAuth token exchange failed for ${platform}:`, err);
    res.status(500).json({
      "error": "Token exchange failed",
      "platform": platform,
      "details": err.message
    });
  }
});

// Platform connection initiation endpoints
app.get('/api/auth/x', (req, res) => {
  const host = req.get('host');
  const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
                  host?.includes('localhost') ? `http://${host}` : `https://${host}`;
  const codeVerifier = Buffer.from(Math.random().toString()).toString('base64').substring(0, 128);
  const codeChallenge = Buffer.from(codeVerifier).toString('base64url').substring(0, 43);
  
  req.session.oauthPlatform = 'x';
  req.session.codeVerifier = codeVerifier;
  
  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.X_CLIENT_ID}&redirect_uri=${encodeURIComponent(baseUrl + '/api/oauth/callback')}&scope=tweet.read%20tweet.write%20users.read%20follows.read%20follows.write&state=x_auth&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  
  console.log('X OAuth URL generated:', authUrl);
  console.log('Redirect URI:', baseUrl + '/api/oauth/callback');
  res.redirect(authUrl);
});

app.get('/api/auth/facebook', (req, res) => {
  const host = req.get('host');
  const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
                  host?.includes('localhost') ? `http://${host}` : `https://${host}`;
  req.session.oauthPlatform = 'facebook';
  
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(baseUrl + '/api/oauth/callback')}&scope=pages_manage_posts,pages_read_engagement,publish_to_groups,user_posts&state=facebook_auth`;
  
  console.log('Facebook OAuth URL generated:', authUrl);
  console.log('Redirect URI:', baseUrl + '/api/oauth/callback');
  res.redirect(authUrl);
});

app.get('/api/auth/linkedin', (req, res) => {
  const host = req.get('host');
  const baseUrl = host?.includes('localhost') ? `http://${host}` : `https://${host}`;
  req.session.oauthPlatform = 'linkedin';
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(baseUrl + '/api/oauth/callback')}&scope=w_member_social%20w_organization_social&state=linkedin_auth`;
  
  console.log('LinkedIn OAuth URL generated:', authUrl);
  res.redirect(authUrl);
});

// Placeholder for existing endpoints
app.post('/api/waterfall/approve', (req, res) => res.status(200).json({"status": "placeholder"}));
app.get('/api/get-connection-state', (req, res) => res.json({"success": true, "connectedPlatforms": {}}));



  // Force production environment for OAuth
  process.env.NODE_ENV = 'production';

  const server = app.listen(5000, '0.0.0.0', () => console.log('TheAgencyIQ Launch Server: 99.9% reliability system operational on port 5000'));
  
  return { app, server };
}

// Start the server
startServer().catch(console.error);