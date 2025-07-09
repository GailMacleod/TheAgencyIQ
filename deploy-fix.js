#!/usr/bin/env node

/**
 * DEPLOYMENT FIX SCRIPT
 * This script patches the current environment to ensure deployment works
 */

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('🔧 Applying deployment fix...');

// Since the vite build is timing out, let's create a faster vite config
const fastViteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});`;

// Backup original and create fast config
try {
  execSync('cp vite.config.ts vite.config.ts.backup', { stdio: 'pipe' });
  writeFileSync('vite.config.ts', fastViteConfig);
  console.log('✅ Created fast vite config');
  
  // Test the build
  console.log('🧪 Testing fast build...');
  const result = execSync('timeout 30s npm run build', { stdio: 'pipe', encoding: 'utf8' });
  console.log('✅ Build successful!');
  console.log(result);
  
} catch (error) {
  console.log('⚠️  Fast build failed, reverting to esbuild approach');
  
  // Restore original config
  try {
    execSync('cp vite.config.ts.backup vite.config.ts', { stdio: 'pipe' });
  } catch (e) {
    console.log('Could not restore backup');
  }
  
  // Use our working esbuild approach
  console.log('🔧 Using working esbuild approach...');
  execSync('node build-replit.js', { stdio: 'inherit' });
  console.log('✅ Build completed via esbuild');
}