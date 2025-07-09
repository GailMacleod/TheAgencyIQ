#!/usr/bin/env node

/**
 * PRODUCTION START SCRIPT
 * Starts the production server with proper environment configuration
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

async function startProductionServer() {
  console.log('🚀 Starting TheAgencyIQ Production Server...');
  
  // Check if dist directory exists, if not build it
  if (!existsSync('dist/server.js')) {
    console.log('📦 Building production bundle...');
    const buildProcess = spawn('node', ['build-replit.js'], { stdio: 'inherit' });
    
    await new Promise((resolve, reject) => {
      buildProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ Build completed successfully');
          resolve();
        } else {
          console.error('❌ Build failed with code:', code);
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  }
  
  // Start the production server
  console.log('🔥 Starting production server on port 5000...');
  const serverProcess = spawn('node', ['dist/server.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '5000'
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🔄 Gracefully shutting down...');
    serverProcess.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('\n🔄 Gracefully shutting down...');
    serverProcess.kill('SIGINT');
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code);
  });
}

startProductionServer().catch(console.error);