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

    // Create the HTML file that loads the bundle
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <link rel="icon" type="image/png" href="/attached_assets/agency_logo_1749083054761.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#3250fa" />
    <title>The AgencyIQ</title>
    <style>
      body {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-weight: 400;
        line-height: 1.6;
        margin: 0;
        padding: 0;
      }
      h1, h2, h3 {
        font-weight: 700;
      }
    </style>
    
    <!-- Meta Pixel Code -->
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '1409057863445071');
      fbq('track', 'PageView');
      console.log('Meta Pixel test fired - initialization complete');
    </script>
    <!-- End Meta Pixel Code -->
  </head>
  <body>
    <!-- Meta Pixel noscript fallback -->
    <noscript><img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id=1409057863445071&ev=PageView&noscript=1"
    /></noscript>
    
    <div id="root"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`;

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