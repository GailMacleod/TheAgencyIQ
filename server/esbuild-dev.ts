import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { build } from "esbuild";
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

export async function setupEsbuildDev(app: Express, server: Server) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist");
  const clientPath = path.resolve(import.meta.dirname, "..", "client");
  
  // Create dist directory if it doesn't exist
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }

  // Skip build - use existing optimized bundle
  console.log("Using existing optimized esbuild bundle...");

  // Copy working HTML directly from dist/index.html.working
  const workingHtmlPath = path.join(process.cwd(), 'dist/index.html.working');
  if (fs.existsSync(workingHtmlPath)) {
    const workingHtml = fs.readFileSync(workingHtmlPath, "utf-8");
    fs.writeFileSync(path.join(distPath, "index.html"), workingHtml);
    console.log('✅ Using working HTML from July 9th deployment');
  } else {
    // Fallback to template
    const htmlTemplate = fs.readFileSync(path.join(clientPath, "index.html"), "utf-8");
    const htmlContent = htmlTemplate.replace(
      '<script type="module" src="/src/main.tsx"></script>',
      '<script src="/main.js"></script>'
    );
    fs.writeFileSync(path.join(distPath, "index.html"), htmlContent);
  }
  
  console.log("✅ esbuild development setup complete");
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist");
  
  // Serve built assets
  app.use(express.static(distPath, { maxAge: "1d" }));
  
  // Serve attached assets
  app.use('/attached_assets', express.static('attached_assets'));
  
  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/oauth') && !req.path.startsWith('/callback') && !req.path.startsWith('/health')) {
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}