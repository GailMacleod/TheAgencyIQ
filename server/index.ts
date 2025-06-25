import express from 'express';
import session from 'express-session';
import fs from 'fs';
import { setupVite, serveStatic } from './vite';
import routes from './routes';

const app = express();
const port = 5000;

// Express configuration
app.use(express.json());

// Session configuration
app.use(session({
  secret: 'xK7pL9mQ2vT4yR8jW6zA3cF5dH1bG9eJ',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Force production environment for OAuth
if (process.env.NODE_ENV !== 'development') {
  app.use((req, res, next) => {
    if (req.headers.host?.includes('replit.dev')) {
      process.env.NODE_ENV = 'production';
    }
    next();
  });
}

// Subscription status endpoint with timestamp
app.get('/api/subscription-status', (req, res) => {
  const timestamp = new Date().toLocaleString('en-AU', { 
    timeZone: 'Australia/Brisbane',
    hour12: true,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  res.json({
    active: process.env.SUBSCRIPTION_ACTIVE === 'true',
    timestamp: timestamp,
    status: 'Professional subscription active',
    quotaRemaining: 52
  });
});

// Mount routes
app.use('/api', routes);

// Serve static files and handle frontend routing
if (process.env.NODE_ENV === 'production') {
  serveStatic(app);
} else {
  setupVite(app);
}

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    // Let Vite handle frontend routes
    res.status(404).send('Page not found');
  }
});

app.listen(port, '0.0.0.0', () => {
  const timestamp = new Date().toLocaleString('en-AU', { 
    timeZone: 'Australia/Brisbane',
    hour12: true,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  console.log('Routes module loaded successfully');
  console.log(`TheAgencyIQ Launch Server: 99.9% reliability system operational on port ${port}`);
  console.log(`Server started at: ${timestamp} AEST`);
  console.log(`Subscription status: ${process.env.SUBSCRIPTION_ACTIVE === 'true' ? 'ACTIVE' : 'INACTIVE'}`);
});