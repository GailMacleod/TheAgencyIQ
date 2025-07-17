import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Custom MIME type mapper for JavaScript modules
function getCorrectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.js':
    case '.mjs':
      return 'application/javascript';
    case '.jsx':
    case '.ts':
    case '.tsx':
      return 'application/javascript';
    case '.css':
      return 'text/css';
    case '.html':
      return 'text/html';
    case '.json':
      return 'application/json';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ttf':
      return 'font/ttf';
    case '.eot':
      return 'application/vnd.ms-fontobject';
    default:
      return 'application/octet-stream';
  }
}

export async function setupVite(app: Express, server: Server) {
  console.log('⚠️ Vite not available - using enhanced fallback static file serving');
  
  // Enhanced static file middleware with proper MIME types
  app.use(express.static(path.join(process.cwd(), 'client'), {
    setHeaders: (res, filePath) => {
      const correctMimeType = getCorrectMimeType(filePath);
      res.setHeader('Content-Type', correctMimeType);
      
      // Add CORS headers for module scripts
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
      
      // Disable caching for development
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
  
  // Special handling for TypeScript/JSX files with proper MIME types
  app.get(/.*\.ts$/, (req, res, next) => {
    const filePath = path.join(process.cwd(), 'client', req.path);
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.sendFile(filePath);
    } else {
      next();
    }
  });
  
  app.get(/.*\.tsx$/, (req, res, next) => {
    const filePath = path.join(process.cwd(), 'client', req.path);
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.sendFile(filePath);
    } else {
      next();
    }
  });
  
  // Serve index.html for root route
  app.get("/", async (req, res) => {
    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      // Check if index.html exists
      if (fs.existsSync(clientTemplate)) {
        const template = fs.readFileSync(clientTemplate, "utf-8");
        res.setHeader('Content-Type', 'text/html');
        res.send(template);
      } else {
        // Send a basic HTML page if index.html doesn't exist
        res.setHeader('Content-Type', 'text/html');
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>TheAgencyIQ</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              <div id="app">
                <h1>TheAgencyIQ</h1>
                <p>Social media automation platform starting up...</p>
                <div id="status">Server is running</div>
              </div>
            </body>
          </html>
        `);
      }
    } catch (e) {
      console.error('Error serving HTML:', e);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // Catch-all route for SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes, OAuth routes, and static assets
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/auth') || 
        req.path.startsWith('/oauth') || 
        req.path.startsWith('/callback') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/public') ||
        req.path.startsWith('/attached_assets') ||
        req.path.includes('.')) {
      return next();
    }
    
    // Serve index.html for SPA routes
    const clientTemplate = path.resolve(process.cwd(), "client", "index.html");
    
    if (fs.existsSync(clientTemplate)) {
      res.setHeader('Content-Type', 'text/html');
      res.sendFile(clientTemplate);
    } else {
      res.status(404).send('Page not found');
    }
  });

  log("Enhanced static file serving configured as Vite fallback with proper MIME types");
}