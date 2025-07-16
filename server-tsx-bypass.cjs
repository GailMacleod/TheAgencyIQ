#!/usr/bin/env node

// TypeScript server runner that bypasses tsx preflight.cjs issue
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if we have tsx working
function tryTsx() {
  return new Promise((resolve) => {
    const tsxPath = path.join(__dirname, 'node_modules', '.bin', 'tsx');
    if (!fs.existsSync(tsxPath)) {
      console.log('❌ tsx not found, using fallback...');
      resolve(false);
      return;
    }
    
    const testProcess = spawn('tsx', ['--version'], { 
      stdio: 'pipe',
      timeout: 5000
    });
    
    testProcess.on('error', () => {
      console.log('❌ tsx error, using fallback...');
      resolve(false);
    });
    
    testProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ tsx working, starting TypeScript server...');
        resolve(true);
      } else {
        console.log('❌ tsx failed, using fallback...');
        resolve(false);
      }
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      testProcess.kill();
      console.log('❌ tsx timeout, using fallback...');
      resolve(false);
    }, 5000);
  });
}

function startTsxServer() {
  console.log('🚀 Starting TypeScript server with tsx...');
  const serverProcess = spawn('tsx', ['server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });
  
  serverProcess.on('error', (error) => {
    console.error('tsx server error:', error.message);
    console.log('🔄 Falling back to production server...');
    startFallbackServer();
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`tsx server exited with code ${code}`);
      console.log('🔄 Falling back to production server...');
      startFallbackServer();
    }
  });
}

function startFallbackServer() {
  console.log('🔄 Starting production server (CommonJS)...');
  const fallbackProcess = spawn('node', ['server-production.cjs'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production'
    }
  });
  
  fallbackProcess.on('error', (error) => {
    console.error('Production server error:', error.message);
    process.exit(1);
  });
  
  fallbackProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Production server exited with code ${code}`);
      process.exit(code);
    }
  });
}

// Main execution
async function main() {
  console.log('🔍 Testing tsx installation...');
  
  const tsxWorking = await tryTsx();
  
  if (tsxWorking) {
    startTsxServer();
  } else {
    startFallbackServer();
  }
}

main().catch(console.error);