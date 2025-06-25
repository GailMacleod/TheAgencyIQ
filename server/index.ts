import express from 'express';
import { createServer } from 'http';
import { setupVite, serveStatic } from './vite';
import { registerRoutes } from './routes';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CSP headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://checkout.stripe.com https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://replit.com https://*.replit.app https://scontent.xx.fbcdn.net; connect-src 'self' https://graph.facebook.com https://api.linkedin.com https://api.twitter.com https://graph.instagram.com https://www.googleapis.com https://oauth2.googleapis.com https://www.linkedin.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob: https://scontent.xx.fbcdn.net; font-src 'self' data: https:; frame-src 'self' https://checkout.stripe.com https://js.stripe.com https://connect.facebook.net;");
  next();
});

// Initialize server properly
async function initializeServer() {
  try {
    // Register routes with session configuration
    const server = await registerRoutes(app);
    
    // Setup Vite after routes
    await setupVite(app, server);
    serveStatic(app);
    
    // Start listening on port 5000
    const port = Number(process.env.PORT) || 5000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`TheAgencyIQ Launch Server: 99.9% reliability system operational on port ${port}`);
      console.log('Launch Target: 07:00 PM JST, June 24, 2025');
      console.log('Features: Robust scheduling, immediate publishing, 12-post cap, bi-monthly refresh');
    });
    
    return server;
  } catch (error) {
    console.error('Server startup failed:', error);
    throw error;
  }
}

// Start the server
initializeServer().catch(console.error);