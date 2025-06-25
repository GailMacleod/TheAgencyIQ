const http = require('http');
const url = require('url');

console.log('Starting TheAgencyIQ OAuth Server with credentials +61413950520/Tw33dl3dum!');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log(`${req.method} ${pathname} - ${new Date().toISOString()}`);
  
  // Set comprehensive headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Security-Policy', "default-src 'self' https://app.theagencyiq.ai https://replit.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com https://connect.facebook.net; connect-src 'self' wss: ws: https://replit.com https://graph.facebook.com https://api.linkedin.com https://api.twitter.com https://www.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
  
  try {
    if (pathname === '/public') {
      console.log('Public bypass route activated');
      const html = `<!DOCTYPE html>
<html>
<head><title>TheAgencyIQ - OAuth Ready</title></head>
<body>
<h1>TheAgencyIQ - OAuth Server Active</h1>
<p><strong>Status:</strong> Operational with credentials +61413950520/Tw33dl3dum!</p>
<p><strong>Time:</strong> ${new Date().toISOString()}</p>
<p><strong>Deploy:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST</p>
<script>console.log('TheAgencyIQ OAuth Server Ready');</script>
</body>
</html>`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
    
    if (pathname === '/connect/x') {
      console.log('X OAuth connection initiated with user credentials');
      const redirectUri = `https://app.theagencyiq.ai/auth/x/callback`;
      const clientId = process.env.X_CLIENT_ID || process.env.TWITTER_API_KEY || 'your-x-client-id';
      const xUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read&state=x-auth-${Date.now()}&code_challenge=plain-challenge&code_challenge_method=plain`;
      res.writeHead(302, { 'Location': xUrl });
      res.end();
      return;
    }
    
    if (pathname === '/connect/youtube') {
      console.log('YouTube OAuth connection initiated with user credentials');
      const redirectUri = `https://app.theagencyiq.ai/auth/youtube/callback`;
      const clientId = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
      const youtubeUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube&state=youtube-auth-${Date.now()}`;
      res.writeHead(302, { 'Location': youtubeUrl });
      res.end();
      return;
    }
    
    if (pathname === '/connect/facebook') {
      console.log('Facebook OAuth connection initiated with user credentials');
      const redirectUri = `https://app.theagencyiq.ai/auth/facebook/callback`;
      const appId = process.env.FACEBOOK_APP_ID || '1409057863445071';
      const facebookUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile,pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&response_type=code&state=facebook-auth-${Date.now()}`;
      res.writeHead(302, { 'Location': facebookUrl });
      res.end();
      return;
    }
    
    if (pathname === '/connect/linkedin') {
      console.log('LinkedIn OAuth connection initiated with user credentials');
      const redirectUri = `https://app.theagencyiq.ai/auth/linkedin/callback`;
      const clientId = process.env.LINKEDIN_CLIENT_ID || '86pwc38hsqem';
      const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=w_member_social%20w_organization_social%20r_liteprofile%20r_emailaddress&state=linkedin-auth-${Date.now()}`;
      res.writeHead(302, { 'Location': linkedinUrl });
      res.end();
      return;
    }
    
    if (pathname && pathname.startsWith('/auth/') && pathname.includes('/callback')) {
      const platform = pathname.split('/')[2];
      const { code, state, error } = parsedUrl.query;
      
      if (error) {
        console.log(`OAuth error for ${platform}: ${error}`);
        const errorHtml = `<h1>${platform.toUpperCase()} OAuth Error</h1>
<p>Error: ${error}</p>
<p>Please try connecting again</p>
<script>setTimeout(() => window.close(), 5000);</script>`;
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(errorHtml);
        return;
      }
      
      if (!code) {
        console.log(`OAuth failed for ${platform}: no authorization code`);
        const errorHtml = `<h1>${platform.toUpperCase()} OAuth Failed</h1>
<p>No authorization code received</p>
<p>Please try connecting again</p>
<script>setTimeout(() => window.close(), 5000);</script>`;
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(errorHtml);
        return;
      }
      
      console.log(`OAuth SUCCESS for ${platform} with credentials +61413950520/Tw33dl3dum!`);
      const codeDisplay = typeof code === 'string' ? code.substring(0, 25) : String(code).substring(0, 25);
      
      const successHtml = `<!DOCTYPE html>
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
console.log('Authorization code: ${codeDisplay}...');
setTimeout(() => window.close(), 3000);
</script>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(successHtml);
      return;
    }
    
    if (pathname === '/' || pathname === '') {
      const html = `<!DOCTYPE html>
<html>
<head>
<title>TheAgencyIQ - OAuth Server</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
.container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
.oauth-link { display: block; margin: 10px 0; padding: 15px; background: #007cba; color: white; text-decoration: none; border-radius: 5px; text-align: center; }
.oauth-link:hover { background: #005a87; }
.credentials { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
</style>
</head>
<body>
<div class="container">
<h1>TheAgencyIQ - Production OAuth Server</h1>
<p><strong>Status:</strong> Ready for deployment</p>
<p><strong>Environment:</strong> ${process.env.NODE_ENV || 'production'}</p>
<p><strong>Deploy Time:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST</p>

<div class="credentials">
<h3>User Credentials Active</h3>
<p><strong>Phone:</strong> +61413950520</p>
<p><strong>Code:</strong> Tw33dl3dum!</p>
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
console.log('OAuth endpoints operational');
</script>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
    
    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server Error');
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== TheAgencyIQ OAuth Server ===`);
  console.log(`Port: ${PORT}`);
  console.log(`Deploy: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
  console.log(`User: +61413950520/Tw33dl3dum!`);
  console.log(`OAuth platforms: X, YouTube, Facebook, LinkedIn`);
  console.log(`Status: Ready for OAuth connections`);
  console.log(`=================================\n`);
});