#!/usr/bin/env node

/**
 * PRODUCTION BUILD SCRIPT - VITE-FREE DEPLOYMENT
 * Uses esbuild directly to bypass Vite plugin issues
 * Creates optimized production bundle ready for deployment
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('🔧 Building TheAgencyIQ with esbuild for production...');

async function buildProduction() {
  try {
    // Ensure dist directory exists
    mkdirSync(join(rootDir, 'dist'), { recursive: true });

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
        'replicate'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      minify: true,
      sourcemap: false,
      logLevel: 'info'
    });

    // Create production HTML file
    const htmlTemplate = readFileSync(join(rootDir, 'client/index.html'), 'utf-8');
    const productionHTML = htmlTemplate.replace(
      'src="/src/main.tsx"',
      'src="/static/main.js"'
    );
    
    writeFileSync(join(rootDir, 'dist/index.html'), productionHTML);

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
        '.svg': 'file'
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

    // Copy static assets
    try {
      copyFileSync(join(rootDir, 'public/manifest.json'), join(rootDir, 'dist/static/manifest.json'));
      console.log('✅ Static assets copied');
    } catch (err) {
      console.log('⚠️  Some static assets missing (non-critical)');
    }

    console.log('✅ Production build completed successfully!');
    console.log('🚀 Ready for deployment with: node dist/server.js');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildProduction();