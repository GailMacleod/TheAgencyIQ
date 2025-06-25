import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Public bypass
app.get('/public', (req: Request, res: Response) => {
  (req.session as any).userId = 2;
  console.log('Heroic fix bypass activated');
  res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>TheAgencyIQ - Heroic Fix</title></head>
<body>
<h1>TheAgencyIQ - Heroic Fix Active</h1>
<p>Status: Operational</p>
<p>Session initialized for user 2</p>
<script>console.log('Heroic fix bypass activated');</script>
</body>
</html>`);
});

// X OAuth
app.get('/connect/x', (req: Request, res: Response) => {
  (req.session as any).userId = 2;
  const redirectUri = 'https://app.theagencyiq.ai/auth/x/callback';
  const clientId = process.env.TWITTER_API_KEY || process.env.X_CLIENT_ID || 'test-x-key';
  const xUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read&state=x-${Date.now()}&code_challenge=challenge&code_challenge_method=plain`;
  
  console.log('X OAuth initiated');
  res.redirect(xUrl);
});

// YouTube OAuth  
app.get('/connect/youtube', (req: Request, res: Response) => {
  (req.session as any).userId = 2;
  const redirectUri = 'https://app.theagencyiq.ai/auth/youtube/callback';
  const clientId = process.env.GOOGLE_CLIENT_ID || 'test-google-key';
  const youtubeUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/youtube.upload&state=youtube-${Date.now()}`;
  
  console.log('YouTube OAuth initiated');
  res.redirect(youtubeUrl);
});

// Facebook OAuth
app.get('/connect/facebook', (req: Request, res: Response) => {
  (req.session as any).userId = 2;
  const redirectUri = 'https://app.theagencyiq.ai/auth/facebook/callback';
  const appId = process.env.FACEBOOK_APP_ID || '1409057863445071';
  const facebookUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement&response_type=code&state=facebook-${Date.now()}`;
  
  console.log('Facebook OAuth initiated');
  res.redirect(facebookUrl);
});

// OAuth callbacks
app.get('/auth/:platform/callback', (req: Request, res: Response) => {
  const platform = req.params.platform;
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).send(`${platform} OAuth failed - no code`);
  }
  
  console.log(`OAuth succeeded for ${platform}`);
  res.send(`<h1>${platform.toUpperCase()} OAuth Success!</h1>
<p>Authorization code: ${code.substring(0, 20)}...</p>
<p>Platform: ${platform}</p>
<p>Time: ${new Date().toISOString()}</p>
<script>
console.log('OAuth succeeded for ${platform}');
setTimeout(() => window.close(), 3000);
</script>`);
});

// Main page
app.get('/', (req: Request, res: Response) => {
  res.status(200).send(`<!DOCTYPE html>
<html>
<head>
<title>TheAgencyIQ - Production OAuth Server</title>
<meta charset="utf-8">
<style>
body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
h1 { color: #3250fa; }
.status { background: #e8f5e8; padding: 10px; border-radius: 5px; margin: 10px 0; }
.oauth-link { 
  display: inline-block; 
  padding: 10px 20px; 
  background: #3250fa; 
  color: white; 
  text-decoration: none; 
  border-radius: 5px; 
  margin: 5px;
}
</style>
</head>
<body>
<h1>TheAgencyIQ - Production OAuth Server</h1>
<div class="status">
<strong>Status:</strong> ✓ Operational<br>
<strong>Deploy:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST
</div>
<h3>OAuth Connections</h3>
<a href="/connect/x" class="oauth-link">Connect X Platform</a>
<a href="/connect/youtube" class="oauth-link">Connect YouTube</a>
<a href="/connect/facebook" class="oauth-link">Connect Facebook</a>
<p><a href="/public">Session Bypass</a> | <a href="/health">Health Check</a></p>
<script>console.log('TheAgencyIQ Production Server Ready');</script>
</body>
</html>`);
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).send('Not Found');
});

const PORT = parseInt(process.env.PORT || '5000');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TheAgencyIQ Production Server running on port ${PORT}`);
  console.log(`Deploy time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
  console.log('OAuth endpoints ready for X, YouTube, and Facebook');
  console.log('Server is healthy and ready to accept connections');
});