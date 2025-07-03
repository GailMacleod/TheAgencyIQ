#!/usr/bin/env node

/**
 * VITE DEVELOPMENT FIX - TEMPORARY WORKAROUND
 * Bypasses Replit plugin issues by creating a working minimal config
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 APPLYING VITE DEVELOPMENT FIX...');

// Backup original vite.config.ts
const originalConfig = path.join(process.cwd(), 'vite.config.ts');
const backupConfig = path.join(process.cwd(), 'vite.config.ts.backup');

try {
  // Create backup
  if (fs.existsSync(originalConfig) && !fs.existsSync(backupConfig)) {
    fs.copyFileSync(originalConfig, backupConfig);
    console.log('✅ Original vite.config.ts backed up');
  }

  // Create minimal working config
  const minimalConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// MINIMAL CONFIG - BYPASSES REPLIT PLUGIN ISSUES
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
      "@/lib": path.resolve(__dirname, "./client/src/lib"),
      "@/components": path.resolve(__dirname, "./client/src/components"),
      "@/hooks": path.resolve(__dirname, "./client/src/hooks"),
    },
  },
  root: "./client",
  server: {
    middlewareMode: true,
    host: "0.0.0.0",
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
});`;

  // Write minimal config
  fs.writeFileSync(originalConfig, minimalConfig);
  console.log('✅ Minimal vite.config.ts applied');
  console.log('🎉 VITE FIX COMPLETE - Application should load correctly now');
  console.log('');
  console.log('To restore original config later, run:');
  console.log('cp vite.config.ts.backup vite.config.ts');

} catch (error) {
  console.error('❌ Failed to apply Vite fix:', error.message);
  process.exit(1);
}