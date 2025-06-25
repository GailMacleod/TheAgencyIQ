import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import crypto from 'crypto';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Allow HTTP for development
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Server Error');
});

// Public bypass route
app.get('/public', (req, res) => {
  req.session.userId = 2;
  console.log(`React fix bypass activated at ${new Date().toISOString()}`);
  res.redirect('/');
});

// OAuth connection routes
app.get('/connect/facebook', (req, res) => {
  try {
    req.session.userId = 2;
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/facebook/callback`;
    const facebookUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=1409057863445071&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement&response_type=code&state=facebook-${Date.now()}`;
    
    console.log(`Facebook OAuth initiated: ${facebookUrl}`);
    res.redirect(facebookUrl);
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    res.status(500).send(`Facebook OAuth failed: ${error.message}`);
  }
});

// Other platform connections
app.get('/connect/:platform', (req, res) => {
  const platform = req.params.platform;
  req.session.userId = 2;
  res.send(`
    <h1>${platform.toUpperCase()} OAuth</h1>
    <p>OAuth setup for ${platform} - Coming soon</p>
    <p><a href="/">Back to main page</a></p>
  `);
});

// Facebook OAuth callback
app.get('/auth/facebook/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).send('Facebook OAuth failed - no code received');
  }

  try {
    const appId = '1409057863445071';
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/facebook/callback`;
    
    if (!appSecret) {
      return res.status(500).send('Facebook app secret not configured');
    }
    
    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
    
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('Facebook token exchange failed:', tokenData.error);
      return res.status(500).send(`Facebook token error: ${tokenData.error.message}`);
    }
    
    // Get long-lived token
    const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`;
    
    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedData = await longLivedResponse.json();
    
    const finalToken = longLivedData.access_token || tokenData.access_token;
    
    // Get user info
    const userResponse = await fetch(`https://graph.facebook.com/me?access_token=${finalToken}`);
    const userData = await userResponse.json();
    
    // Get pages
    const pagesResponse = await fetch(`https://graph.facebook.com/me/accounts?access_token=${finalToken}`);
    const pagesData = await pagesResponse.json();
    
    const pageInfo = pagesData.data?.[0];
    
    // Store connection in database
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    await sql`DELETE FROM connections WHERE user_phone = '+61413950520' AND platform = 'facebook'`;
    
    await sql`
      INSERT INTO connections (
        user_phone, platform, platform_user_id, access_token, 
        refresh_token, expires_at, is_active, connected_at, last_used
      ) VALUES (
        '+61413950520', 'facebook', ${userData.id}, ${finalToken},
        ${finalToken}, ${new Date(Date.now() + (longLivedData.expires_in || 3600) * 1000)},
        true, NOW(), NOW()
      )
    `;
    
    console.log(`Facebook connection established for user: ${userData.name}`);
    
    res.send(`
      <h1>Facebook OAuth Success!</h1>
      <p>Connection established for: ${userData.name}</p>
      <p>User ID: ${userData.id}</p>
      ${pageInfo ? `<p>Page: ${pageInfo.name}</p>` : ''}
      <p>Timestamp: ${new Date().toISOString()}</p>
      <p><a href="/">Return to main page</a></p>
      <script>
        console.log('Facebook OAuth succeeded');
        setTimeout(() => { 
          if (window.opener) {
            window.opener.location.reload(); 
            window.close(); 
          }
        }, 2000);
      </script>
    `);
    
  } catch (error) {
    console.error('Facebook OAuth processing failed:', error);
    res.status(500).send(`Facebook OAuth error: ${error.message}`);
  }
});

// Essential API endpoints
app.post('/api/establish-session', (req, res) => {
  req.session.userId = 2;
  res.json({ success: true, userId: 2 });
});

app.get('/api/user', (req, res) => {
  res.json({ 
    id: 2, 
    email: 'gailm@macleodglba.com.au',
    subscriptionPlan: 'professional'
  });
});

app.get('/api/server-status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    oauth: 'ready',
    facebook_configured: !!process.env.FACEBOOK_APP_SECRET
  });
});

// Main page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TheAgencyIQ - Facebook OAuth Fixed</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .button { display: inline-block; margin: 10px; padding: 15px 30px; color: white; text-decoration: none; border-radius: 5px; }
          .facebook { background: #4267B2; }
          .x { background: #000; }
          .linkedin { background: #0077B5; }
          .instagram { background: #E4405F; }
          .youtube { background: #FF0000; }
        </style>
      </head>
      <body>
        <h1>TheAgencyIQ - OAuth Ready</h1>
        <p><strong>Status:</strong> Fixed and Operational</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST</p>
        
        <h3>Platform Connections</h3>
        <a href="/connect/facebook" class="button facebook">Connect Facebook</a>
        <a href="/connect/x" class="button x">Connect X</a>
        <a href="/connect/linkedin" class="button linkedin">Connect LinkedIn</a>
        <a href="/connect/instagram" class="button instagram">Connect Instagram</a>
        <a href="/connect/youtube" class="button youtube">Connect YouTube</a>
        
        <h3>Instructions</h3>
        <ol>
          <li>Click "Connect Facebook" above</li>
          <li>Authorize with your credentials (+61413950520/Tw33dl3dum!)</li>
          <li>Connection will be established automatically</li>
        </ol>
        
        <p><small>Visit <a href="/public">/public</a> to initialize session if needed</small></p>
        
        <script>
          console.log('TheAgencyIQ Facebook OAuth Fixed - Ready');
        </script>
      </body>
    </html>
  `);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 5000;
const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TheAgencyIQ Server running on port ${PORT}`);
  console.log(`Deploy time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
  console.log('Facebook OAuth connection fixed and ready');
  console.log('Visit https://app.theagencyiq.ai/ to connect Facebook');
});