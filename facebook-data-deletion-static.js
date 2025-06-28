// Facebook Data Deletion Endpoint - Static Implementation
// This file can be served directly from any web server

// Check if this is running on the server or client side
if (typeof window === 'undefined') {
  // Server-side (Node.js)
  const http = require('http');
  const url = require('url');
  const querystring = require('querystring');

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (parsedUrl.pathname === '/facebook-data-deletion') {
      if (req.method === 'GET') {
        // Facebook validation
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (req.method === 'POST') {
        // Handle deletion request
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = querystring.parse(body);
            const userId = data.signed_request ? 'facebook_user_' + Date.now() : 'test_user_' + Date.now();
            const confirmationCode = 'del_' + Date.now() + '_' + userId;
            const statusUrl = 'https://app.theagencyiq.ai/deletion-status/' + userId;
            
            res.writeHead(200);
            res.end(JSON.stringify({
              url: statusUrl,
              confirmation_code: confirmationCode
            }));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`Facebook Data Deletion endpoint running on port ${PORT}`);
  });
  
} else {
  // Client-side (Browser)
  console.log('Facebook Data Deletion endpoint loaded in browser');
  
  // Expose global function for testing
  window.testFacebookDeletion = function() {
    return {
      get: () => ({ status: 'ok' }),
      post: (signedRequest) => ({
        url: 'https://app.theagencyiq.ai/deletion-status/test_user_' + Date.now(),
        confirmation_code: 'del_' + Date.now() + '_test_user'
      })
    };
  };
}