#!/usr/bin/env node

// Alternative tsx runner that bypasses the broken preflight.cjs issue
const { spawn } = require('child_process');
const path = require('path');

// Use node with ts-node/register for TypeScript compilation
const serverProcess = spawn('node', [
  '--require', 'ts-node/register',
  '--experimental-specifier-resolution=node',
  'server/index.ts'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    TS_NODE_TRANSPILE_ONLY: 'true',
    TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs","esModuleInterop":true,"allowSyntheticDefaultImports":true,"resolveJsonModule":true,"skipLibCheck":true}'
  }
});

serverProcess.on('error', (error) => {
  console.error('Server startup error:', error.message);
  
  // Fallback to simple JavaScript server
  console.log('Falling back to simple JavaScript server...');
  const fallbackProcess = spawn('node', ['server-working.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  fallbackProcess.on('error', (fallbackError) => {
    console.error('Fallback server error:', fallbackError.message);
    process.exit(1);
  });
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(`Server exited with code ${code}, trying fallback...`);
    const fallbackProcess = spawn('node', ['server-working.js'], {
      stdio: 'inherit',
      env: process.env
    });
  }
});