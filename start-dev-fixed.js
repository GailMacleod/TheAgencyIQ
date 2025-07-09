#!/usr/bin/env node

/**
 * FIXED DEVELOPMENT SERVER STARTER
 * Bypasses the Vite config import issue by using a clean configuration
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';

console.log('🔧 Starting development server with fixed configuration...');

// Backup original and use clean config
const originalConfig = 'vite.config.ts';
const backupConfig = 'vite.config.ts.backup';
const cleanConfig = 'vite.config.dev.ts';

try {
  // Create backup if it doesn't exist
  if (!existsSync(backupConfig) && existsSync(originalConfig)) {
    const originalContent = readFileSync(originalConfig, 'utf8');
    writeFileSync(backupConfig, originalContent);
    console.log('✅ Created backup of original vite.config.ts');
  }

  // Use clean config
  if (existsSync(cleanConfig)) {
    const cleanContent = readFileSync(cleanConfig, 'utf8');
    writeFileSync(originalConfig, cleanContent);
    console.log('✅ Using clean vite configuration');
  }

  // Start the development server
  const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  // Handle server termination
  process.on('SIGTERM', () => {
    console.log('🔄 Restoring original configuration...');
    if (existsSync(backupConfig)) {
      const backupContent = readFileSync(backupConfig, 'utf8');
      writeFileSync(originalConfig, backupContent);
    }
    devServer.kill();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('🔄 Restoring original configuration...');
    if (existsSync(backupConfig)) {
      const backupContent = readFileSync(backupConfig, 'utf8');
      writeFileSync(originalConfig, backupContent);
    }
    devServer.kill();
    process.exit(0);
  });

  devServer.on('exit', (code) => {
    console.log('🔄 Restoring original configuration...');
    if (existsSync(backupConfig)) {
      const backupContent = readFileSync(backupConfig, 'utf8');
      writeFileSync(originalConfig, backupContent);
    }
    process.exit(code);
  });

} catch (error) {
  console.error('❌ Failed to start development server:', error);
  process.exit(1);
}