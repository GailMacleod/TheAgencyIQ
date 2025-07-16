import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';

const PORT = process.env.PORT || 5000;

const server = createServer((req, res) => {
  const url = parse(req.url || '/', true);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API routes
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  
  if (url.pathname === '/api/user') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      id: 2, 
      email: 'gailm@macleodglba.com.au',
      subscription: 'professional'
    }));
    return;
  }
  
  // Serve static files
  try {
    const filePath = join(process.cwd(), 'dist/public', url.pathname === '/' ? 'index.html' : url.pathname);
    const content = readFileSync(filePath);
    
    const ext = url.pathname.split('.').pop();
    const contentType = ext === 'js' ? 'application/javascript' : 
                       ext === 'css' ? 'text/css' : 
                       ext === 'html' ? 'text/html' : 'text/plain';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    // Fallback to index.html for SPA
    try {
      const indexPath = join(process.cwd(), 'dist/public/index.html');
      const content = readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch (indexErr) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});