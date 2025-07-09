#!/usr/bin/env node

/**
 * PRODUCTION START SCRIPT
 * Starts the production server with proper environment configuration
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'dist/server.js');

console.log('🚀 Starting TheAgencyIQ production server...');

// Check if build exists
if (!existsSync(serverPath)) {
  console.error('❌ Production build not found. Please run: node build.js');
  process.exit(1);
}

// Set production environment
process.env.NODE_ENV = 'production';

// Start server
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGTERM');
});