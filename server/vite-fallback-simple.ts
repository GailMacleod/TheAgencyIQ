import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { transformTypeScriptFile, shouldTransform } from "./typescript-transformer";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  console.log('⚠️ Vite not available - using enhanced fallback with TypeScript transformation');
  
  // TypeScript/JSX transformation middleware
  app.use(async (req, res, next) => {
    let filePath = path.join(process.cwd(), 'client', req.path);
    
    // If the file doesn't exist, try to find it with .tsx/.ts extension
    if (!fs.existsSync(filePath)) {
      const extensions = ['.tsx', '.ts', '.js', '.jsx'];
      for (const ext of extensions) {
        const testPath = filePath + ext;
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          break;
        }
      }
    }
    
    if (shouldTransform(filePath) && fs.existsSync(filePath)) {
      try {
        console.log(`🔄 Transforming TypeScript file: ${req.path} -> ${filePath}`);
        const transformedCode = await transformTypeScriptFile(filePath);
        
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.send(transformedCode);
        return;
      } catch (error) {
        console.error(`Error transforming ${req.path}:`, error);
        res.status(500).send(`// Error transforming ${req.path}: ${error.message}`);
        return;
      }
    }
    
    // Custom middleware to handle MIME types correctly for other files
    if (req.path.endsWith('.js') || req.path.endsWith('.jsx')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (req.path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (req.path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (req.path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });
  
  // Static file serving for client directory
  app.use(express.static(path.join(process.cwd(), 'client'), {
    setHeaders: (res, filePath) => {
      // Ensure no caching in development
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
  
  // Serve index.html for root route
  app.get("/", async (req, res) => {
    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      if (fs.existsSync(clientTemplate)) {
        const template = fs.readFileSync(clientTemplate, "utf-8");
        res.setHeader('Content-Type', 'text/html');
        res.send(template);
      } else {
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

  log("Enhanced static file serving configured with TypeScript transformation and MIME type fixes");
}