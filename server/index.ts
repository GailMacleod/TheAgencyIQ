import express from 'express';

const app = express();

// Simple route handlers
app.get('/public', (req, res) => {
  console.log('Public route accessed with +61413950520/Tw33dl3dum!');
  res.send(`<!DOCTYPE html>
<html>
<head><title>TheAgencyIQ OAuth</title></head>
<body>
<h1>TheAgencyIQ OAuth Server Active</h1>
<p>User: +61413950520/Tw33dl3dum!</p>
<p>Status: Operational</p>
<p>Time: ${new Date().toISOString()}</p>
<script>console.log('OAuth server ready with user credentials');</script>
</body>
</html>`);
});

app.get('/connect/x', (req, res) => {
  console.log('X OAuth initiated for +61413950520/Tw33dl3dum!');
  const redirectUri = 'https://app.theagencyiq.ai/auth/x/callback';
  const clientId = process.env.X_CLIENT_ID || process.env.TWITTER_API_KEY || 'your-x-client-id';
  const xUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read&state=x-auth-${Date.now()}&code_challenge=plain&code_challenge_method=plain`;
  res.redirect(xUrl);
});

app.get('/connect/youtube', (req, res) => {
  console.log('YouTube OAuth initiated for +61413950520/Tw33dl3dum!');
  const redirectUri = 'https://app.theagencyiq.ai/auth/youtube/callback';
  const clientId = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
  const youtubeUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/youtube.upload&state=youtube-auth-${Date.now()}`;
  res.redirect(youtubeUrl);
});

app.get('/connect/facebook', (req, res) => {
  console.log('Facebook OAuth initiated for +61413950520/Tw33dl3dum!');
  const redirectUri = 'https://app.theagencyiq.ai/auth/facebook/callback';
  const appId = process.env.FACEBOOK_APP_ID || '1409057863445071';
  const facebookUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement&response_type=code&state=facebook-auth-${Date.now()}`;
  res.redirect(facebookUrl);
});

app.get('/connect/linkedin', (req, res) => {
  console.log('LinkedIn OAuth initiated for +61413950520/Tw33dl3dum!');
  const redirectUri = 'https://app.theagencyiq.ai/auth/linkedin/callback';
  const clientId = process.env.LINKEDIN_CLIENT_ID || '86pwc38hsqem';
  const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=w_member_social%20w_organization_social&state=linkedin-auth-${Date.now()}`;
  res.redirect(linkedinUrl);
});

app.get('/auth/:platform/callback', (req, res) => {
  const platform = req.params.platform;
  const { code, state, error } = req.query;
  
  if (error) {
    console.log(`OAuth error for ${platform}: ${error}`);
    res.send(`<h1>${platform.toUpperCase()} OAuth Error</h1><p>Error: ${error}</p>`);
    return;
  }
  
  if (!code) {
    console.log(`OAuth failed for ${platform}: no code`);
    res.send(`<h1>${platform.toUpperCase()} OAuth Failed</h1><p>No authorization code received</p>`);
    return;
  }
  
  console.log(`OAuth SUCCESS for ${platform} with user +61413950520/Tw33dl3dum!`);
  const codeDisplay = String(code).substring(0, 25);
  
  res.send(`<!DOCTYPE html>
<html>
<head><title>${platform.toUpperCase()} OAuth Success</title></head>
<body>
<h1>${platform.toUpperCase()} OAuth Connection Successful!</h1>
<p><strong>Authorization Code:</strong> ${codeDisplay}...</p>
<p><strong>Platform:</strong> ${platform}</p>
<p><strong>State:</strong> ${state}</p>
<p><strong>User:</strong> +61413950520/Tw33dl3dum!</p>
<p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
<p><strong>Status:</strong> Ready for token exchange</p>
<script>
console.log('OAuth SUCCESS for ${platform}');
console.log('User: +61413950520/Tw33dl3dum!');
setTimeout(() => window.close(), 3000);
</script>
</body>
</html>`);
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
<title>TheAgencyIQ OAuth Server</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
.container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.oauth-link { display: block; margin: 10px 0; padding: 15px; background: #007cba; color: white; text-decoration: none; border-radius: 5px; text-align: center; font-weight: bold; }
.oauth-link:hover { background: #005a87; }
.credentials { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007cba; }
.status { background: #e8f8e8; padding: 10px; border-radius: 5px; margin: 10px 0; }
</style>
</head>
<body>
<div class="container">
<h1>TheAgencyIQ - Production OAuth Server</h1>

<div class="status">
<p><strong>Status:</strong> Ready for deployment</p>
<p><strong>Deploy Time:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST</p>
</div>

<div class="credentials">
<h3>✅ User Credentials Active</h3>
<p><strong>Phone:</strong> +61413950520</p>
<p><strong>Auth Code:</strong> Tw33dl3dum!</p>
</div>

<h2>OAuth Connections Available</h2>
<a href="/connect/x" class="oauth-link">🐦 Connect X Platform</a>
<a href="/connect/youtube" class="oauth-link">📺 Connect YouTube</a>
<a href="/connect/facebook" class="oauth-link">📘 Connect Facebook</a>
<a href="/connect/linkedin" class="oauth-link">💼 Connect LinkedIn</a>

<p><small><a href="/public">Server Status Check</a></small></p>
</div>

<script>
console.log('TheAgencyIQ OAuth Server Ready');
console.log('User credentials: +61413950520/Tw33dl3dum!');
console.log('OAuth endpoints operational for X, YouTube, Facebook, LinkedIn');
</script>
</body>
</html>`);
});

const PORT = parseInt(process.env.PORT || '5000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== TheAgencyIQ OAuth Server ===`);
  console.log(`Port: ${PORT}`);
  console.log(`Deploy: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
  console.log(`User: +61413950520/Tw33dl3dum!`);
  console.log(`OAuth platforms: X, YouTube, Facebook, LinkedIn`);
  console.log(`Status: Ready for OAuth connections`);
  console.log(`=================================\n`);
});