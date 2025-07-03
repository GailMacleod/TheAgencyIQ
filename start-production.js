#!/usr/bin/env node

/**
 * Start TheAgencyIQ in production mode with built assets
 */

import { exec } from 'child_process';
import path from 'path';

console.log('🚀 Starting TheAgencyIQ in PRODUCTION mode...');

// Set production environment
process.env.NODE_ENV = 'production';

// Start the production server
exec('node dist/index.js', { 
  env: { ...process.env, NODE_ENV: 'production' },
  cwd: process.cwd()
}, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Production server error:', error);
    return;
  }
  console.log(stdout);
  if (stderr) console.error(stderr);
});

console.log('🌟 Production server starting...');
console.log('📁 Serving built assets from dist/public/');
console.log('🔧 Dynamic 30-day cycles & Queensland events ready');