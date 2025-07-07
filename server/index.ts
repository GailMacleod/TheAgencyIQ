import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment validation
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET not set, using default for development');
  process.env.SESSION_SECRET = 'dev-secret-key-change-in-production';
}

const app = express();

// Port configuration
const port = parseInt(process.env.PORT || '5000', 10);
console.log(`Server initializing with port ${port} (${process.env.PORT ? 'from ENV' : 'default'})`);

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));

// Content Security Policy middleware
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com https://*.facebook.com https://connect.facebook.net https://www.googletagmanager.com https://*.google-analytics.com",
    "connect-src 'self' https://graph.facebook.com https://www.googletagmanager.com https://*.google-analytics.com https://analytics.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https: https://fonts.gstatic.com https://fonts.googleapis.com blob:",
    "img-src 'self' data: https: https://scontent.xx.fbcdn.net https://www.google-analytics.com",
    "frame-src 'self' https://*.facebook.com",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Static file serving with proper MIME types
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use('/attached_assets', express.static(path.join(__dirname, '../attached_assets')));

// Serve the built frontend from dist/public
app.use(express.static(path.join(__dirname, '../dist/public')));
app.use(express.static('dist'));

// Initialize auth and API routes
async function initializeRoutes() {
  try {
    const { configurePassportStrategies, authRouter } = await import('../authModule.js');
    const { apiRouter } = await import('../apiModule.js');
    
    configurePassportStrategies();
    app.use(passport.initialize());
    app.use(passport.session());
    
    app.use('/auth', authRouter);
    app.use('/api', apiRouter);
    
    console.log('✅ Routes initialized successfully');
  } catch (error) {
    console.warn('⚠️  Could not initialize full routes:', error.message);
    console.log('📡 Starting with basic server configuration');
  }
}

await initializeRoutes();

// Catch-all handler - serve React app for frontend routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  // Serve the built React app
  res.sendFile(path.join(__dirname, '../dist/public/index.html'));
});

// Start server
const server = createServer(app);
server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});