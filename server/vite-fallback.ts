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

export async function setupVite(app: Express, server: Server) {
  console.log('⚠️ Vite not available - using fallback static file serving');
  
  // Create a basic static file server fallback
  app.use(express.static(path.join(process.cwd(), 'client')));
  
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
        res.send(template);
      } else {
        // Send a basic HTML page if index.html doesn't exist
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

  log("Static file serving configured as Vite fallback");
}