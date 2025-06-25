import express from 'express';
import session from 'express-session';

const app = express();
app.use(express.json());
app.use(session({
  "secret": "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
  "resave": false,
  "saveUninitialized": false,
  "cookie": {"secure": process.env.NODE_ENV === 'production', "maxAge": 24 * 60 * 60 * 1000}
}));

// Public bypass route
app.get('/public', (req, res) => {
  req.session.userId = 2;
  console.log(`Bypass for OAuth setup at ${new Date().toISOString()}`);
  res.redirect('/connect-platforms');
});

// OAuth connection routes for each platform
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
    // Store the authorization code for token exchange
    if (!req.session.oauthTokens) req.session.oauthTokens = {};
    req.session.oauthTokens[platform] = { code, state, timestamp: Date.now() };
    
    console.log(`OAuth succeeded for ${platform} at ${new Date().toISOString()}`);
    res.send(`
      <h1>${platform.toUpperCase()} OAuth Success!</h1>
      <p>Authorization code received and stored.</p>
      <p>Platform: ${platform}</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
      <p><a href="/schedule">Access Schedule</a></p>
      <script>console.log('OAuth succeeded for ${platform}');</script>
    `);
  } catch (error) {
    console.error(`OAuth error for ${platform}:`, error);
    res.status(500).send(`${platform} OAuth error: ${error.message}`);
  }
});

// Schedule route
app.get('/schedule', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/public');
  }
  
  res.send(`
    <h1>Schedule Access Confirmed</h1>
    <p>User ID: ${req.session.userId}</p>
    <p>Connected Platforms: ${Object.keys(req.session.oauthTokens || {}).join(', ')}</p>
    <p>Ready for approve & post functionality</p>
    <script>console.log('Schedule access confirmed');</script>
  `);
});

// Server status endpoint
app.get('/api/server-status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    subscription: process.env.SUBSCRIPTION_ACTIVE || 'true'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TheAgencyIQ OAuth Setup Server running on port ${PORT}`);
  console.log(`Deploy time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
  console.log('Ready for platform connections');
});