#!/usr/bin/env node

/**
 * PREVIEW SERVER - PRODUCTION BUILD FOR DEVELOPMENT
 * This serves the production build locally for preview purposes
 */

import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startPreviewServer() {
  try {
    console.log('🏗️  Building production version for preview...');
    
    // Build the production version
    const buildProcess = spawn('node', ['build-replit.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    await new Promise((resolve, reject) => {
      buildProcess.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });

    console.log('✅ Build completed successfully!');
    console.log('🚀 Starting preview server...');
    
    // Start the production server
    const serverProcess = spawn('node', ['dist/server.js'], {
      stdio: 'inherit',
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n🔄 Shutting down preview server...');
      serverProcess.kill();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('\n🔄 Shutting down preview server...');
      serverProcess.kill();
      process.exit(0);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Preview server exited with code ${code}`);
      process.exit(code);
    });

  } catch (error) {
    console.error('❌ Preview server failed:', error);
    process.exit(1);
  }
}

console.log('🔧 Starting TheAgencyIQ Preview Server...');
startPreviewServer();