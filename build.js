#!/usr/bin/env node

/**
 * PRODUCTION BUILD SCRIPT - BYPASSES VITE PLUGIN ISSUES
 * This script replaces npm run build for deployment
 * Uses esbuild directly to avoid Vite plugin dependencies
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;

console.log('🚀 Starting production build...');

async function buildProduction() {
  try {
    // Create build directories
    mkdirSync(join(rootDir, 'dist'), { recursive: true });
    mkdirSync(join(rootDir, 'dist/static'), { recursive: true });
    mkdirSync(join(rootDir, 'dist/public'), { recursive: true });

    console.log('📦 Building server bundle...');
    
    // Build server bundle
    await build({
      entryPoints: [join(rootDir, 'server/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: join(rootDir, 'dist/server.js'),
      external: [
        'express',
        'cors',
        'helmet',
        'express-session',
        'connect-pg-simple',
        'passport',
        'passport-local',
        'passport-facebook',
        'passport-google-oauth20',
        'passport-linkedin-oauth2',
        'passport-twitter',
        'bcrypt',
        'drizzle-orm',
        '@neondatabase/serverless',
        'zod',
        'axios',
        'multer',
        'openai',
        'stripe',
        'twilio',
        '@sendgrid/mail',
        'ws',
        'replicate',
        'crypto-js',
        'date-fns',
        'memoizee',
        'oauth-1.0a',
        'openid-client',
        'knex',
        'sqlite3'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      minify: true,
      sourcemap: false,
      logLevel: 'info'
    });

    console.log('🎨 Building client bundle...');
    
    // Build client bundle
    await build({
      entryPoints: [join(rootDir, 'client/src/main.tsx')],
      bundle: true,
      platform: 'browser',
      target: 'es2020',
      format: 'esm',
      outfile: join(rootDir, 'dist/static/main.js'),
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      loader: {
        '.png': 'file',
        '.jpg': 'file',
        '.jpeg': 'file',
        '.gif': 'file',
        '.svg': 'file',
        '.woff': 'file',
        '.woff2': 'file',
        '.eot': 'file',
        '.ttf': 'file'
      },
      publicPath: '/static/',
      alias: {
        '@': join(rootDir, 'client/src'),
        '@shared': join(rootDir, 'shared'),
        '@assets': join(rootDir, 'attached_assets')
      },
      minify: true,
      sourcemap: false,
      logLevel: 'info'
    });

    console.log('📄 Creating production HTML...');
    
    // Create production HTML
    const htmlTemplate = readFileSync(join(rootDir, 'client/index.html'), 'utf-8');
    const productionHTML = htmlTemplate.replace(
      'src="/src/main.tsx"',
      'src="/static/main.js"'
    );
    
    writeFileSync(join(rootDir, 'dist/index.html'), productionHTML);

    console.log('📁 Copying static assets...');
    
    // Copy static assets
    const staticAssets = [
      { src: 'public/manifest.json', dest: 'dist/public/manifest.json' },
      { src: 'public/favicon.ico', dest: 'dist/public/favicon.ico' },
      { src: 'attached_assets/logo.png', dest: 'dist/static/logo.png' }
    ];

    for (const asset of staticAssets) {
      const srcPath = join(rootDir, asset.src);
      const destPath = join(rootDir, asset.dest);
      
      if (existsSync(srcPath)) {
        mkdirSync(dirname(destPath), { recursive: true });
        copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${asset.src} → ${asset.dest}`);
      } else {
        console.log(`⚠️  ${asset.src} not found, skipping...`);
      }
    }

    // Get bundle sizes
    const serverSize = Math.round(readFileSync(join(rootDir, 'dist/server.js')).length / 1024);
    const clientSize = Math.round(readFileSync(join(rootDir, 'dist/static/main.js')).length / 1024);

    console.log('');
    console.log('✅ Production build completed successfully!');
    console.log(`📊 Server bundle: ${serverSize}KB`);
    console.log(`📊 Client bundle: ${clientSize}KB`);
    console.log('');
    console.log('🚀 Ready for deployment!');
    console.log('💡 Start with: node dist/server.js');
    console.log('');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildProduction();