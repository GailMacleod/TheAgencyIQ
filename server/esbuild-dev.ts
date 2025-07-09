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

  // Build client bundle (single build for development)
  console.log("Building client with esbuild...");
  
  await build({
    entryPoints: [path.join(clientPath, "src/main.tsx")],
    bundle: true,
    platform: "browser",
    target: "es2020",
    format: "esm",
    outfile: path.join(distPath, "main.js"),
    loader: {
      ".png": "file",
      ".jpg": "file",
      ".jpeg": "file",
      ".gif": "file",
      ".svg": "file",
      ".js": "jsx"
    },
    alias: {
      "@": path.join(clientPath, "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "attached_assets")
    },
    minify: false,
    sourcemap: true,
    define: {
      "process.env.NODE_ENV": '"development"'
    },
    jsx: "automatic",
    jsxImportSource: "react"
  });

  // Copy index.html template
  const htmlTemplate = fs.readFileSync(path.join(clientPath, "index.html"), "utf-8");
  const htmlContent = htmlTemplate.replace(
    '<script type="module" src="/src/main.tsx"></script>',
    '<script type="module" src="/main.js"></script>'
  );
  
  fs.writeFileSync(path.join(distPath, "index.html"), htmlContent);
  
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