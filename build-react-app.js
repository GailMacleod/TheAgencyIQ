#!/usr/bin/env node

import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildReactApp() {
  console.log('🚀 Building React app...');
  
  try {
    // Build the React application
    const result = await esbuild.build({
      entryPoints: ['client/src/main.tsx'],
      bundle: true,
      outdir: 'dist/public',
      format: 'esm',
      jsx: 'automatic',
      target: 'es2020',
      minify: false,
      sourcemap: false,
      loader: { 
        '.tsx': 'tsx', 
        '.ts': 'ts',
        '.png': 'dataurl',
        '.jpg': 'dataurl',
        '.jpeg': 'dataurl',
        '.svg': 'text',
        '.css': 'css'
      },
      define: {
        'process.env.NODE_ENV': '"development"',
        'import.meta.env': '{}'
      },
      alias: {
        '@assets': path.resolve(__dirname, 'attached_assets'),
        '@': path.resolve(__dirname, 'client/src')
      },
      external: []
    });

    // Create dist/public directory
    const distDir = path.join(__dirname, 'dist/public');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    console.log('✅ React bundle created: dist/public/main.js');

    // Copy the original HTML file and update it to load the bundle
    const originalHtmlPath = path.join(__dirname, 'client/index.html');
    let htmlContent = fs.readFileSync(originalHtmlPath, 'utf8');
    
    // Replace the module script reference to load the built bundle
    htmlContent = htmlContent.replace(
      '<script type="module" src="/src/main.tsx"></script>',
      '<script type="module" src="/main.js"></script>'
    );

    fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
    console.log('✅ HTML file created: dist/public/index.html');

    // Copy manifest.json if it exists
    const manifestSrc = path.join(__dirname, 'public/manifest.json');
    const manifestDest = path.join(distDir, 'manifest.json');
    if (fs.existsSync(manifestSrc)) {
      fs.copyFileSync(manifestSrc, manifestDest);
      console.log('✅ Manifest copied: dist/public/manifest.json');
    }

    console.log('🎉 React app build completed successfully!');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildReactApp();