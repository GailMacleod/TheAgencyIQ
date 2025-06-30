import express from 'express';
import { createServer as createViteServer } from 'vite';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createServer() {
  const app = express();
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.join(__dirname, 'client'),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
  });

  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  
  // CSP and CORS headers
  app.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://graph.facebook.com; style-src 'self' 'unsafe-inline' data:; connect-src 'self' https://graph.facebook.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.googleapis.com;"
    });
    next();
  });

  // Facebook OAuth endpoint
  app.all('/facebook', (req, res) => {
    try {
      const { code, signed_request, error } = { ...req.body, ...req.query };
      if (code) {
        res.status(200).json({
          message: 'Login successful',
          redirect: `${baseUrl}/platform-connections?code=${encodeURIComponent(code)}`
        });
      } else if (signed_request) {
        res.status(200).json({
          url: `${baseUrl}/deletion-status`,
          confirmation_code: 'del_' + Math.random().toString(36).substr(2, 9)
        });
      } else if (error) {
        throw new Error(`Facebook error: ${error}`);
      } else {
        throw new Error('Invalid request');
      }
    } catch (error) {
      console.error('Facebook Error:', error.stack);
      res.status(500).json({ error: 'Server issue', details: error.message });
    }
  });

  // Platform connections endpoint
  app.all('/callback', (req, res) => {
    try {
      const { code, error } = { ...req.body, ...req.query };
      if (!code && !error) {
        return res.status(400).json({ error: 'Missing code or error parameter' });
      }
      if (error) {
        return res.status(400).json({ error: 'Login failed', message: error });
      }
      res.status(200).json({ message: 'Platform connected', code });
    } catch (error) {
      console.error('Platform Error:', error.stack);
      res.status(500).json({ error: 'Server issue', details: error.message });
    }
  });

  // Use Vite's dev middleware
  app.use(vite.middlewares);

  // Start server
  const PORT = Number(process.env.PORT) || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Development server live on ${PORT}`);
    console.log(`Vite dev server integrated successfully`);
  });
}

createServer().catch(console.error);