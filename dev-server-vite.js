import { createServer } from 'vite';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createViteDevServer() {
  const app = express();
  const port = process.env.PORT || 5000;

  try {
    console.log('🚀 Starting TheAgencyIQ with Vite Development Server...');
    
    // Check if vite.config.ts exists and is valid
    const viteConfigPath = path.resolve(__dirname, 'vite.config.ts');
    if (!fs.existsSync(viteConfigPath)) {
      throw new Error('vite.config.ts not found');
    }
    
    console.log('✅ Using updated Vite configuration');
    
    // Create Vite server
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
      root: path.resolve(__dirname, 'client'),
      configFile: viteConfigPath
    });

    // Use vite's middleware
    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);

    // API routes for authentication (same as backup server)
    app.get('/api/user', (req, res) => {
      res.json({ 
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        authenticated: true
      });
    });

    app.post('/api/login', (req, res) => {
      res.json({ success: true, user: { id: 1, name: 'Test User' } });
    });

    // Serve main app
    app.use('*', async (req, res) => {
      try {
        const url = req.originalUrl;
        
        // Let Vite handle the request
        const template = await vite.transformIndexHtml(url, `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>TheAgencyIQ - AI-Powered Social Media Automation</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx"></script>
          </body>
          </html>
        `);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        console.error(e);
        res.status(500).end(e.message);
      }
    });

    app.listen(port, () => {
      console.log(`🚀 TheAgencyIQ Vite Dev Server running on port ${port}`);
      console.log(`🌐 Access at: http://localhost:${port}`);
      console.log(`✅ Using updated Vite configuration`);
    });

  } catch (error) {
    console.error('❌ Vite server failed:', error.message);
    console.log('🔄 Falling back to backup server...');
    
    // Import and start the backup server
    const { default: backupServer } = await import('./app.js');
    // The backup server is already configured to start
  }
}

// Start the development server
createViteDevServer().catch(console.error);