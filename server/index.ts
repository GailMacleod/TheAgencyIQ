import express from 'express';
import session from 'express-session';
import { setupVite, serveStatic } from './vite';

const app = express();
app.use(express.json());
app.use(session({
  "secret": "xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ",
  "resave": false,
  "saveUninitialized": false,
  "cookie": {"secure": process.env.NODE_ENV === 'production', "maxAge": 24 * 60 * 60 * 1000}
}));

if (process.env.NODE_ENV !== 'development') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
  });
}

// Setup Vite for proper frontend serving
if (process.env.NODE_ENV === 'development') {
  // Defer Vite setup until after server creation
  const server = app.listen(5000, '0.0.0.0', async () => {
    console.log('Emergency bypass server operational on port 5000');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('SUBSCRIPTION_ACTIVE:', process.env.SUBSCRIPTION_ACTIVE || 'false');
    
    try {
      await setupVite(app, server);
      console.log('Vite middleware setup complete');
    } catch (err) {
      console.error('Vite setup failed:', err.message);
      // Fallback to simple static serving
      app.get('*', (req, res) => {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head><title>TheAgencyIQ</title></head>
          <body>
            <h1>TheAgencyIQ Emergency Access</h1>
            <p>Vite setup failed, using fallback mode</p>
            <a href="/schedule">Schedule</a>
          </body>
          </html>
        `);
      });
    }
  });
  
  // Export server for other modules
  module.exports = { app, server };
} else {
  serveStatic(app);
  const server = app.listen(5000, '0.0.0.0', () => {
    console.log('Emergency bypass server operational on port 5000');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('SUBSCRIPTION_ACTIVE:', process.env.SUBSCRIPTION_ACTIVE || 'false');
  });
  
  module.exports = { app, server };
}

// Basic API endpoints
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt bypassed - auto success');
  res.json({ success: true, message: 'Login successful' });
});

app.get('/api/get-connection-state', (req, res) => {
  res.json({ 
    success: true, 
    connectedPlatforms: {},
    message: 'Emergency bypass active'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'emergency_bypass_active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Let Vite handle frontend routes

process.on('uncaughtException', (err) => {
  console.error('Emergency bypass: Exception handled:', err.message);
  console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

app.use((err, req, res, next) => {
  console.error('Middleware Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Server setup moved above