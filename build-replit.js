#!/usr/bin/env node

/**
 * REPLIT DEPLOYMENT BUILD SCRIPT
 * This script completely replaces npm run build to avoid Vite plugin issues
 * Uses esbuild directly and creates the exact file structure Replit expects
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Building for Replit Deployment...');

async function buildForReplit() {
  try {
    // Create all necessary directories
    const distDir = join(__dirname, 'dist');
    const publicDir = join(distDir, 'public');
    const staticDir = join(distDir, 'static');
    
    [distDir, publicDir, staticDir].forEach(dir => {
      mkdirSync(dir, { recursive: true });
    });

    console.log('📦 Building client bundle...');
    
    // Build client with esbuild (no Vite plugins)
    await build({
      entryPoints: [join(__dirname, 'client/src/main.tsx')],
      bundle: true,
      platform: 'browser',
      target: 'es2020',
      format: 'esm',
      outfile: join(staticDir, 'main.js'),
      loader: {
        '.png': 'file',
        '.jpg': 'file',
        '.jpeg': 'file',
        '.gif': 'file',
        '.svg': 'file'
      },
      publicPath: '/static/',
      alias: {
        '@': join(__dirname, 'client/src'),
        '@shared': join(__dirname, 'shared'),
        '@assets': join(__dirname, 'attached_assets')
      },
      minify: true,
      sourcemap: false,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      jsx: 'automatic',
      jsxImportSource: 'react'
    });

    console.log('🖥️ Building server bundle...');
    
    // Build server
    await build({
      entryPoints: [join(__dirname, 'server/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: join(distDir, 'server.js'),
      external: [
        'express', 'cors', 'helmet', 'express-session', 'connect-pg-simple',
        'passport', 'passport-local', 'passport-facebook', 'passport-google-oauth20',
        'passport-linkedin-oauth2', 'passport-twitter', 'bcrypt', 'drizzle-orm',
        '@neondatabase/serverless', 'zod', 'axios', 'multer', 'openai', 'stripe',
        'twilio', '@sendgrid/mail', 'ws', 'replicate', 'crypto-js', 'date-fns',
        'memoizee', 'oauth-1.0a', 'openid-client', 'knex', 'sqlite3'
      ],
      minify: true,
      sourcemap: false,
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    console.log('📄 Creating index.html...');
    
    // Create production HTML that loads from static directory
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TheAgencyIQ</title>
    <link rel="icon" type="image/png" href="/static/logo.png">
    <link rel="manifest" href="/static/manifest.json">
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
        #root { min-height: 100vh; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/static/main.js"></script>
</body>
</html>`;

    writeFileSync(join(distDir, 'index.html'), htmlContent);

    console.log('📁 Copying static assets...');
    
    // Copy essential static files
    const staticFiles = [
      { from: 'public/manifest.json', to: 'static/manifest.json' },
      { from: 'attached_assets/logo.png', to: 'static/logo.png' },
      { from: 'attached_assets/agency_logo_1749083054761.png', to: 'static/agency_logo_1749083054761.png' }
    ];

    staticFiles.forEach(file => {
      const srcPath = join(__dirname, file.from);
      const destPath = join(distDir, file.to);
      
      if (existsSync(srcPath)) {
        mkdirSync(dirname(destPath), { recursive: true });
        copyFileSync(srcPath, destPath);
        console.log(`✅ ${file.from} → ${file.to}`);
      }
    });

    // Create package.json for production
    const prodPackage = {
      name: "theagencyiq",
      version: "1.0.0",
      type: "module",
      main: "server.js",
      scripts: {
        start: "node server.js"
      }
    };
    
    writeFileSync(join(distDir, 'package.json'), JSON.stringify(prodPackage, null, 2));

    console.log('✅ Replit deployment build completed successfully!');
    console.log('📊 Build output ready in dist/ directory');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildForReplit();