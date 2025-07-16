#!/usr/bin/env node

// TypeScript server runner with proper compilation
const { spawn } = require('child_process');
const { existsSync } = require('fs');

// Check if we can use esbuild for compilation
function startServer() {
  console.log('🚀 Starting TypeScript server...');
  
  // Try to compile with esbuild and run
  const esbuildProcess = spawn('npx', ['esbuild', 'server/index.ts', '--bundle', '--platform=node', '--outfile=server/index.js', '--external:express', '--external:express-session', '--external:cors', '--external:cookie-parser', '--external:connect-sqlite3', '--format=cjs'], {
    stdio: 'inherit',
    shell: true
  });
  
  esbuildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ TypeScript compiled successfully');
      // Run the compiled server
      const serverProcess = spawn('node', ['server/index.js'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'development'
        }
      });
      
      serverProcess.on('error', (error) => {
        console.error('Server error:', error);
      });
    } else {
      console.error('❌ TypeScript compilation failed');
      process.exit(1);
    }
  });
}

startServer();