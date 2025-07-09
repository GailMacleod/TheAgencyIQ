#!/usr/bin/env node

/**
 * DEVELOPMENT SERVER WORKAROUND
 * This bypasses the Vite config import issue and serves the development app
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startDevServer() {
  try {
    console.log('🔧 Starting development server with Vite workaround...');
    
    // Create Vite server with inline config
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, 'client'),
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'client/src'),
          '@shared': path.resolve(__dirname, 'shared'),
          '@assets': path.resolve(__dirname, 'attached_assets'),
        },
      },
      plugins: [
        {
          name: 'react',
          async configResolved() {
            const { default: react } = await import('@vitejs/plugin-react');
            return react();
          }
        }
      ]
    });

    const app = express();
    
    // Use vite's connect instance as middleware
    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);
    
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`✅ Development server running on port ${port}`);
      console.log(`🔗 Access at: http://localhost:${port}`);
    });
    
  } catch (error) {
    console.error('❌ Development server failed:', error);
    process.exit(1);
  }
}

startDevServer();