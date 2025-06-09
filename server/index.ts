import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ALLOWED_ORIGINS, SECURITY_HEADERS, validateDomain, isSecureContext } from "./ssl-config";

const app = express();

// Trust proxy for secure cookies in production
app.set('trust proxy', 1);

// Domain validation middleware - BYPASSED for Replit deployments
app.use((req, res, next) => {
  const hostname = req.hostname || req.header('host') || '';
  
  // Multiple methods to detect Replit environment using actual env vars
  const isReplitEnvironment = 
    process.env.REPL_ID ||
    process.env.REPL_OWNER ||
    process.env.REPLIT_USER ||
    process.env.REPLIT_ENVIRONMENT ||
    process.env.REPLIT_DOMAINS ||
    process.env.REPLIT_DEV_DOMAIN ||
    process.env.REPL_SLUG ||
    hostname.includes('.replit.app') ||
    hostname.includes('.replit.dev') ||
    hostname.includes('replit');
  
  // Completely skip domain validation for Replit
  if (isReplitEnvironment) {
    return next();
  }
  
  // Only validate for non-Replit production environments
  if (process.env.NODE_ENV === 'production' && !validateDomain(hostname)) {
    return res.status(400).json({ message: 'Invalid domain' });
  }
  
  next();
});

// HTTPS redirect middleware for production (skip for Replit)
app.use((req, res, next) => {
  const hostname = req.hostname || req.header('host') || '';
  const isReplitDeployment = hostname.includes('.replit.app') || 
                            hostname.includes('.replit.dev') ||
                            process.env.REPLIT_DEPLOYMENT === 'true' ||
                            !!process.env.REPL_ID;
  
  // Skip HTTPS redirect for Replit deployments as they handle SSL automatically
  if (process.env.NODE_ENV === 'production' && !isReplitDeployment && !isSecureContext(req)) {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});

// Security headers and CORS configuration
app.use((req, res, next) => {
  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  
  // CORS configuration with Replit domain support
  const origin = req.headers.origin;
  const isAllowedOrigin = origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.replit.app')
  );
  
  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Health check endpoint for SSL/domain validation
app.get('/health', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const hostname = req.hostname || req.header('host') || '';
  const isValidDomain = validateDomain(hostname);
  const isSecure = isSecureContext(req);
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    domain: hostname,
    secure: isSecure,
    validDomain: isValidDomain,
    ready: !isProduction || (isValidDomain && isSecure)
  });
});

// SSL certificate validation endpoint
app.get('/.well-known/health', (req, res) => {
  res.json({ status: 'ok', domain: 'app.theagencyiq.ai' });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Cancel subscription endpoint
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const { storage } = await import('./storage');
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set subscription status to cancelled
    await storage.updateUser(userId, { subscriptionPlan: 'cancelled' });
    
    console.log(`Subscription cancelled for ${user.email}`);
    
    // Trigger data deletion for all connected platforms
    const connections = await storage.getPlatformConnectionsByUser(userId);
    for (const connection of connections) {
      console.log(`Triggering data deletion for ${connection.platform} for user ${user.email}`);
      // Mark platform connection as inactive to trigger deletion
      await storage.updatePlatformConnection(connection.id, { isActive: false });
    }

    res.status(200).json({ 
      message: 'Subscription cancelled successfully',
      dataWarning: 'Platform data deletion has been initiated'
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

// Import breach notification service
import BreachNotificationService from "./breach-notification";

(async () => {
  const server = await registerRoutes(app);
  
  // Start periodic breach notification monitoring
  setInterval(() => {
    BreachNotificationService.checkPendingNotifications();
  }, 60 * 60 * 1000); // Check every hour for pending notifications

  // Global error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server error:", err);
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
