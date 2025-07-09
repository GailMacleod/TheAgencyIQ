#!/usr/bin/env node

/**
 * BUILD WRAPPER FOR REPLIT DEPLOYMENT
 * This script intercepts the npm run build command to use our working esbuild approach
 * instead of the problematic Vite build that's timing out
 */

console.log('🔧 Build wrapper intercepting deployment build...');

import { execSync } from 'child_process';
import { existsSync } from 'fs';

try {
  // Check if our working build script exists
  if (existsSync('./build-replit.js')) {
    console.log('✅ Using working esbuild approach...');
    execSync('node build-replit.js', { stdio: 'inherit' });
    console.log('✅ Build completed successfully via esbuild');
  } else {
    // Fallback to original approach
    console.log('⚠️  Falling back to original build...');
    execSync('vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  }
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}