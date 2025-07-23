/**
 * TheAgencyIQ Express Server
 * Production-ready Express middleware architecture with comprehensive integration
 */

import express from 'express';
import { createServer } from 'http';
import { setupVite } from './vite.js';
import { configureMiddleware } from './config/middleware';
import { configurePassport } from './config/passport';
import { initializeSentry, configureSentryMiddleware, configureSentryErrorHandler } from './config/sentry';
import { env } from './config/env-schema';
import { notificationService } from './services/NotificationService';
import { transactionService } from './services/TransactionService';
import { registerRoutes } from './routes.js';

async function startServer() {
  try {
    console.log('🚀 Starting TheAgencyIQ Express Server...');
    
    // Initialize Sentry error tracking
    initializeSentry();

    // Initialize database connection
    const { dbManager } = await import('./db-init.js');
    await dbManager.initialize();
    console.log('✅ Database connection established');

    // Create Express app
    const app = express();

    // Configure Sentry request handling (must be first)
    configureSentryMiddleware(app);

    // Configure comprehensive Express middleware stack
    configureMiddleware(app);

    // Configure Passport OAuth strategies
    configurePassport();

    // Initialize notification services
    const notificationStatus = notificationService.getServiceStatus();
    console.log('📧 Notification Services Status:', notificationStatus);

    // Log environment info
    console.log('🌍 Server Environment:', {
      NODE_ENV: env.NODE_ENV,
      baseUrl: process.env.REPLIT_DOMAINS ? 
        `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
        'http://localhost:5000',
      port: env.PORT,
      hasDatabase: !!env.DATABASE_URL,
      oauthProviders: [
        env.FACEBOOK_APP_ID ? 'Facebook' : null,
        env.GOOGLE_CLIENT_ID ? 'Google' : null,
        env.LINKEDIN_CLIENT_ID ? 'LinkedIn' : null,
        env.TWITTER_CONSUMER_KEY ? 'Twitter' : null
      ].filter(Boolean)
    });

    // Register API routes and OAuth endpoints
    const httpServer = await registerRoutes(app);

    // Configure Sentry error handler (must be after routes)
    configureSentryErrorHandler(app);

    // Setup Vite development server
    if (env.NODE_ENV === 'development') {
      await setupVite(app, httpServer);
      console.log('⚡ Vite development server configured');
    }

    // Global error handler
    app.use((err: any, req: any, res: any, next: any) => {
      console.error('❌ Global error handler:', err);
      
      if (res.headersSent) {
        return next(err);
      }

      const status = err.status || err.statusCode || 500;
      const message = env.NODE_ENV === 'production' ? 
        'Internal server error' : 
        err.message;

      res.status(status).json({
        error: message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    });

    // Start server
    const port = env.PORT;
    httpServer.listen(port, '0.0.0.0', () => {
      console.log('🎉 TheAgencyIQ Server running on port', port);
      console.log('📅 Deploy time:', new Date().toLocaleString('en-AU', {
        timeZone: 'Australia/Brisbane',
        day: 'numeric',
        month: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }), 'AEST');
      
      if (env.NODE_ENV === 'development') {
        console.log('🔧 Development mode active');
        console.log('📱 React app ready for OAuth integration');
      }
    });

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      httpServer.close(async () => {
        await dbManager.disconnect();
        console.log('👋 Server shutdown complete');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      httpServer.close(async () => {
        await dbManager.disconnect();
        console.log('👋 Server shutdown complete');
        process.exit(0);
      });
    });

    return httpServer;

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start server if run directly
if (require.main === module) {
  startServer().catch(error => {
    console.error('❌ Fatal server error:', error);
    process.exit(1);
  });
}

export { startServer };