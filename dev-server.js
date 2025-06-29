#!/usr/bin/env node

// Development server runner - bypasses tsx issues
import { spawn } from 'child_process';
import path from 'path';

console.log('Starting TheAgencyIQ development server...');

// Run the built server
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down development server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});