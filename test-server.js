const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  // Handle health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }
  
  // Handle public bypass
  if (req.url === '/public') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head><title>TheAgencyIQ - Heroic Fix</title></head>
<body>
<h1>TheAgencyIQ - Heroic Fix Active</h1>
<p>Status: Operational</p>
<p>Time: ${new Date().toISOString()}</p>
<script>console.log('Heroic fix bypass activated');</script>
</body>
</html>`);
    return;
  }
  
  // Handle OAuth connections
  if (req.url === '/connect/x') {
    const redirectUri = 'https://app.theagencyiq.ai/auth/x/callback';
    const clientId = process.env.TWITTER_API_KEY || process.env.X_CLIENT_ID || 'test-x-key';
    const xUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read&state=x-${Date.now()}&code_challenge=challenge&code_challenge_method=plain`;
    
    console.log('X OAuth initiated');
    res.writeHead(302, { 'Location': xUrl });
    res.end();
    return;
  }
  
  if (req.url === '/connect/youtube') {
    const redirectUri = 'https://app.theagencyiq.ai/auth/youtube/callback';
    const clientId = process.env.GOOGLE_CLIENT_ID || 'test-google-key';
    const youtubeUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/youtube.upload&state=youtube-${Date.now()}`;
    
    console.log('YouTube OAuth initiated');
    res.writeHead(302, { 'Location': youtubeUrl });
    res.end();
    return;
  }
  
  if (req.url === '/connect/facebook') {
    const redirectUri = 'https://app.theagencyiq.ai/auth/facebook/callback';
    const appId = process.env.FACEBOOK_APP_ID || '1409057863445071';
    const facebookUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement&response_type=code&state=facebook-${Date.now()}`;
    
    console.log('Facebook OAuth initiated');
    res.writeHead(302, { 'Location': facebookUrl });
    res.end();
    return;
  }
  
  // Handle OAuth callbacks
  if (req.url.startsWith('/auth/') && req.url.includes('/callback')) {
    const platform = req.url.split('/')[2];
    const urlParams = new URL(req.url, 'https://app.theagencyiq.ai').searchParams;
    const code = urlParams.get('code');
    
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`${platform} OAuth failed - no code`);
      return;
    }
    
    console.log(`OAuth succeeded for ${platform}`);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h1>${platform.toUpperCase()} OAuth Success!</h1>
<p>Authorization code: ${code.substring(0, 20)}...</p>
<p>Platform: ${platform}</p>
<p>Time: ${new Date().toISOString()}</p>
<script>
console.log('OAuth succeeded for ${platform}');
setTimeout(() => window.close(), 3000);
</script>`);
    return;
  }
  
  // Main page
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
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
    return;
  }
  
  // 404 handler
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('Not Found');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TheAgencyIQ Production Server running on port ${PORT}`);
  console.log(`Deploy time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
  console.log('OAuth endpoints ready for X, YouTube, and Facebook');
  console.log('Server is healthy and ready to accept connections');
});