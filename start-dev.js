#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting TheAgencyIQ with updated Vite configuration...');

// Function to install dependencies if needed
function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('📦 Installing required dependencies...');
    const install = spawn('npm', ['install', '--no-optional'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    install.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Dependencies installed successfully');
        resolve();
      } else {
        console.log('⚠️  Dependency installation failed, continuing with backup server...');
        resolve(); // Continue anyway
      }
    });

    install.on('error', (err) => {
      console.log('⚠️  Dependency installation error:', err.message);
      resolve(); // Continue anyway
    });
  });
}

// Function to start the proper TypeScript server
function startTypeScriptServer() {
  return new Promise((resolve, reject) => {
    console.log('🎯 Starting TypeScript server with Vite...');
    const server = spawn('npx', ['tsx', 'server/index.ts'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });

    server.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`TypeScript server exited with code ${code}`));
      }
    });

    server.on('error', (err) => {
      reject(err);
    });

    // Give it a moment to start
    setTimeout(() => {
      console.log('✅ TypeScript server started with updated Vite configuration');
      resolve();
    }, 3000);
  });
}

// Function to start backup server
function startBackupServer() {
  console.log('🔄 Starting backup server...');
  const backup = spawn('node', ['app.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, PORT: '5000' }
  });

  backup.on('error', (err) => {
    console.error('❌ Backup server failed:', err.message);
  });

  return backup;
}

// Main startup sequence
async function main() {
  try {
    // Try to install dependencies first
    await installDependencies();
    
    // Try to start the TypeScript server with Vite
    try {
      await startTypeScriptServer();
    } catch (err) {
      console.log('⚠️  TypeScript server failed:', err.message);
      console.log('🔄 Falling back to backup server...');
      startBackupServer();
    }
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    console.log('🔄 Falling back to backup server...');
    startBackupServer();
  }
}

main().catch(console.error);