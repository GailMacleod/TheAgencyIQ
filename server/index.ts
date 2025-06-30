import { createServer } from 'http';
import { parse } from 'url';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = process.env.NODE_ENV === 'production'
  ? 'https://app.theagencyiq.ai'
  : 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const { pathname, query } = parse(req.url || '', true);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.theagencyiq.ai https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev https://replit.com; connect-src 'self' https://graph.facebook.com;");
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Facebook OAuth endpoint (preserved)
  if (pathname === '/facebook') {
    try {
      const body = await parseBody(req);
      const { code, signed_request, error, error_code, error_message } = { ...body, ...query };
      
      if (code) {
        console.log('Facebook OAuth callback:', code);
        
        const clientId = process.env.FB_CLIENT_ID;
        const clientSecret = process.env.FB_CLIENT_SECRET;
        
        if (clientId && clientSecret) {
          try {
            const axios = (await import('axios')).default;
            const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
              params: { client_id: clientId, client_secret: clientSecret, code, redirect_uri: `${baseUrl}/facebook` }
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Login successful', accessToken: response.data.access_token }));
          } catch (tokenError: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Token exchange failed', details: tokenError.response?.data?.error?.message }));
          }
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Mock token for development', accessToken: `fb_mock_${Date.now()}_${Math.random()}` }));
        }
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'OAuth callback received', timestamp: new Date().toISOString() }));
      }
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'OAuth error', details: error.message }));
    }
    return;
  }

  // Health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Server is healthy' }));
    return;
  }

  // Serve static files or index.html
  try {
    const publicDir = path.join(__dirname, '..', 'dist', 'public');
    const filePath = pathname === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, pathname || '');
    
    try {
      const content = await readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      // Fallback to index.html for SPA routing
      const indexPath = path.join(publicDir, 'index.html');
      try {
        const indexContent = await readFile(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexContent);
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load app', details: err.message }));
      }
    }
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Server error', details: error.message }));
  }
});

process.on('uncaughtException', (error) => console.error('Uncaught:', error.stack));

const PORT = parseInt(process.env.PORT || '5000');
server.listen(PORT, () => console.log(`Live on ${PORT}`));