#!/usr/bin/env node

/**
 * JULY 9TH 2025 PRODUCTION START SCRIPT
 * Uses the exact working configuration from July 9th morning deployment
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Starting TheAgencyIQ with July 9th 2025 configuration...');

// Build using the July 9th configuration
if (!existsSync('dist/server.js')) {
  console.log('📦 Building with July 9th build-replit.js...');
  execSync('node build-replit.js', { stdio: 'inherit' });
}

// Start the production server
console.log('⚡ Starting production server...');
execSync('node dist/server.js', { stdio: 'inherit' });