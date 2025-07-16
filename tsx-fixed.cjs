#!/usr/bin/env node

// Fixed tsx runner that bypasses the broken preflight.cjs issue
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if tsx is working
function testTsx() {
  try {
    const result = spawn('tsx', ['--version'], { stdio: 'pipe' });
    result.on('error', () => {
      console.log('❌ tsx not working, using fallback...');
      useFallback();
    });
    
    result.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ tsx available, starting server...');
        startWithTsx();
      } else {
        console.log('❌ tsx failed, using fallback...');
        useFallback();
      }
    });
  } catch (error) {
    console.log('❌ tsx error, using fallback...');
    useFallback();
  }
}

function startWithTsx() {
  const serverProcess = spawn('tsx', ['server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });
  
  serverProcess.on('error', (error) => {
    console.error('tsx server error:', error.message);
    useFallback();
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`tsx server exited with code ${code}, using fallback...`);
      useFallback();
    }
  });
}

function useFallback() {
  console.log('🔄 Using CommonJS fallback server...');
  const fallbackProcess = spawn('node', ['server-working.cjs'], {
    stdio: 'inherit',
    env: process.env
  });
  
  fallbackProcess.on('error', (error) => {
    console.error('Fallback server error:', error.message);
    process.exit(1);
  });
}

// Start the test
testTsx();