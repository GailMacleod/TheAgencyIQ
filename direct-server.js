#!/usr/bin/env node

const http = require('http');
const url = require('url');

// Create HTTP server with error handling
const server = http.createServer();

server.on('request', (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    console.log(`Request: ${req.method} ${pathname}`);
    
    // Set response headers first
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (pathname === '/public') {
      console.log('Public route accessed');
      res.statusCode = 200;
      res.end(`<!DOCTYPE html>
<html>
<head><title>TheAgencyIQ OAuth</title></head>
<body>
<h1>TheAgencyIQ OAuth Server</h1>
<p>Status: Active with +61413950520/Tw33dl3dum!</p>
<p>Time: ${new Date().toISOString()}</p>
<script>console.log('OAuth server ready');</script>
</body>
</html>`);
      return;
    }
    
    if (pathname === '/connect/x') {
      console.log('X OAuth redirect');
      const xUrl = 'https://twitter.com/i/oauth2/authorize?response_type=code&client_id=your-client-id&redirect_uri=https://app.theagencyiq.ai/auth/x/callback&scope=tweet.read%20tweet.write&state=x-auth';
      res.statusCode = 302;
      res.setHeader('Location', xUrl);
      res.end();
      return;
    }
    
    if (pathname === '/connect/youtube') {
      console.log('YouTube OAuth redirect');
      const youtubeUrl = 'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=your-google-client-id&redirect_uri=https://app.theagencyiq.ai/auth/youtube/callback&scope=https://www.googleapis.com/auth/youtube.upload&state=youtube-auth';
      res.statusCode = 302;
      res.setHeader('Location', youtubeUrl);
      res.end();
      return;
    }
    
    if (pathname?.includes('/callback')) {
      const platform = pathname.split('/')[2];
      const { code } = parsedUrl.query;
      
      console.log(`OAuth callback for ${platform}`);
      res.statusCode = 200;
      res.end(`<h1>${platform.toUpperCase()} OAuth Success</h1>
<p>Code: ${code ? String(code).substring(0, 20) : 'none'}...</p>
<p>User: +61413950520/Tw33dl3dum!</p>
<script>setTimeout(() => window.close(), 3000);</script>`);
      return;
    }
    
    // Default homepage
    res.statusCode = 200;
    res.end(`<!DOCTYPE html>
<html>
<head><title>TheAgencyIQ</title></head>
<body>
<h1>TheAgencyIQ OAuth Server</h1>
<p>User: +61413950520/Tw33dl3dum!</p>
<p>Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST</p>
<h3>OAuth Links</h3>
<p><a href="/connect/x">Connect X</a></p>
<p><a href="/connect/youtube">Connect YouTube</a></p>
<p><a href="/public">Status Check</a></p>
<script>console.log('TheAgencyIQ ready');</script>
</body>
</html>`);
    
  } catch (error) {
    console.error('Request error:', error);
    res.statusCode = 500;
    res.end('Server Error');
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`TheAgencyIQ server running on port ${PORT}`);
  console.log(`User: +61413950520/Tw33dl3dum!`);
  console.log(`Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST`);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});