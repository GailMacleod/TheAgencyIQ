#!/usr/bin/env node

// tsx wrapper that bypasses preflight.cjs issue
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create missing preflight.cjs file
const tsxDir = path.join(__dirname, 'node_modules', 'tsx', 'dist');
const preflightPath = path.join(tsxDir, 'preflight.cjs');

if (!fs.existsSync(preflightPath)) {
  try {
    fs.writeFileSync(preflightPath, `
      // Auto-generated preflight.cjs to fix tsx module loading
      module.exports = function preflight() {
        return true;
      };
    `);
    console.log('✅ Created missing preflight.cjs');
  } catch (error) {
    console.log('⚠️  Could not create preflight.cjs:', error.message);
  }
}

// Run tsx with server/index.ts
const tsxProcess = spawn('node', [
  path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  'server/index.ts'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

tsxProcess.on('error', (error) => {
  console.error('tsx process error:', error);
  process.exit(1);
});

tsxProcess.on('exit', (code) => {
  process.exit(code);
});