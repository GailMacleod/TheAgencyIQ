const express = require('express');
const session = require('express-session');

const app = express();

app.use(express.json());
app.use(session({
  secret: "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Direct OAuth endpoints
app.get('/', (req, res) => {
  req.session.userId = 2;
  console.log('Production OAuth server for +61413950520/Tw33dl3dum!');
  
  res.status(200).send(`<!DOCTYPE html>
<html>
<head>
<title>TheAgencyIQ OAuth Server</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<h1>TheAgencyIQ OAuth Server</h1>
<p>User: +61413950520/Tw33dl3dum!</p>
<p>Status: Production Ready</p>
<p>Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST</p>
<a href="/connect/x">Connect X</a><br>
<a href="/connect/youtube">Connect YouTube</a><br>
<a href="/connect/facebook">Connect Facebook</a><br>
<a href="/connect/linkedin">Connect LinkedIn</a><br>
<a href="/connect/instagram">Connect Instagram</a>
<script>
console.log('Production OAuth server ready');
console.log('User: +61413950520/Tw33dl3dum!');
</script>
</body>
</html>`);
});

app.get('/connect/x', (req, res) => {
  console.log('X OAuth for +61413950520/Tw33dl3dum!');
  const clientId = 'cW5vZXdCQjZwSmVsM24wYVpCV3Y6MTpjaQ';
  const redirectUri = 'https://app.theagencyiq.ai/auth/x/callback';
  const xUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read&state=x-auth&code_challenge=plain&code_challenge_method=plain`;
  res.redirect(xUrl);
});

app.get('/connect/youtube', (req, res) => {
  console.log('YouTube OAuth for +61413950520/Tw33dl3dum!');
  const clientId = '1034534739187-8kd3kvd0f5nkj9vd3hbl2h8v7v2hk4pk.apps.googleusercontent.com';
  const redirectUri = 'https://app.theagencyiq.ai/auth/youtube/callback';
  const youtubeUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/youtube.upload&state=youtube-auth&access_type=offline&prompt=consent`;
  res.redirect(youtubeUrl);
});

app.get('/connect/facebook', (req, res) => {
  console.log('Facebook OAuth for +61413950520/Tw33dl3dum!');
  const appId = '1409057863445071';
  const redirectUri = 'https://app.theagencyiq.ai/auth/facebook/callback';
  const facebookUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement&response_type=code&state=facebook-auth`;
  res.redirect(facebookUrl);
});

app.get('/connect/linkedin', (req, res) => {
  console.log('LinkedIn OAuth for +61413950520/Tw33dl3dum!');
  const clientId = '86pwc38hsqem';
  const redirectUri = 'https://app.theagencyiq.ai/auth/linkedin/callback';
  const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=w_member_social%20w_organization_social&state=linkedin-auth`;
  res.redirect(linkedinUrl);
});

app.get('/connect/instagram', (req, res) => {
  console.log('Instagram OAuth for +61413950520/Tw33dl3dum!');
  const appId = '1409057863445071';
  const redirectUri = 'https://app.theagencyiq.ai/auth/instagram/callback';
  const instagramUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish&response_type=code&state=instagram-auth`;
  res.redirect(instagramUrl);
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
<h1>${platform.toUpperCase()} OAuth Success!</h1>
<p>Authorization Code: ${codeDisplay}...</p>
<p>Platform: ${platform}</p>
<p>User: +61413950520/Tw33dl3dum!</p>
<p>Status: Ready for token exchange</p>
<script>
console.log('OAuth SUCCESS for ${platform}');
setTimeout(() => window.close(), 3000);
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production OAuth Server running on port ${PORT}`);
  console.log(`User: +61413950520/Tw33dl3dum!`);
  console.log(`Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
  console.log('OAuth platforms: X, YouTube, Facebook, LinkedIn, Instagram');
});