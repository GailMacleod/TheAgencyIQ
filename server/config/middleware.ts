/**
 * Express Middleware Configuration
 * Production-ready middleware stack with security, database, and OAuth integration
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const frontendURL = isProduction 
  ? 'https://app.theagencyiq.ai'
  : 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Session configuration with PostgreSQL store
const sessionConfig = {
  store: new (connectPg(session))({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true,
    ttl: 72 * 60 * 60, // 72 hours in seconds
    touchInterval: 60 * 1000, // Touch every minute
    disableTouch: false
  }),
  secret: process.env.SESSION_SECRET!,
  name: 'theagencyiq.session',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 72 * 60 * 60 * 1000, // 72 hours in milliseconds
    domain: undefined // Let Express handle domain automatically
  },
  genid: () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `aiq_${timestamp}_${random}`;
  }
};

// Rate limiting configuration
const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks in development
      if (!isProduction && req.path === '/health') return true;
      return false;
    }
  });
};

// Rate limiters
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  isProduction ? 100 : 1000, // 100 in prod, 1000 in dev
  'Too many requests from this IP'
);

const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts'
);

const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  isProduction ? 50 : 500, // 50 in prod, 500 in dev
  'API rate limit exceeded'
);

/**
 * Configure Express middleware stack
 */
export function configureMiddleware(app: Express): void {
  console.log('🔧 Configuring Express middleware stack...');

  // Trust proxy for Replit deployment
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy enabled');

  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "'unsafe-eval'",
          "https://connect.facebook.net",
          "https://www.googletagmanager.com",
          "https://www.grammarly.com",
          "https://gnar.grammarly.com"
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "https://fonts.googleapis.com",
          "https://www.grammarly.com"
        ],
        fontSrc: [
          "'self'", 
          "https://fonts.gstatic.com", 
          "https://fonts.googleapis.com", 
          "data:"
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: [
          "'self'", 
          "https:", 
          "wss:", 
          "ws:",
          "https://www.grammarly.com",
          "https://gnar.grammarly.com"
        ],
        frameSrc: [
          "'self'", 
          "https://www.facebook.com", 
          "https://accounts.google.com"
        ],
        frameAncestors: [
          "'self'", 
          "https://app.theagencyiq.ai", 
          "https://www.facebook.com"
        ]
      }
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' }
  }));
  console.log('✅ Helmet security headers configured');

  // CORS configuration
  app.use(cors({
    origin: frontendURL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200
  }));
  console.log(`✅ CORS configured for: ${frontendURL}`);

  // Request logging with Morgan
  const morganFormat = isProduction ? 'combined' : 'dev';
  app.use(morgan(morganFormat, {
    skip: (req) => {
      // Skip logging for static assets and health checks
      return req.url.includes('.') || req.url === '/health';
    }
  }));
  console.log(`✅ Morgan logging configured (${morganFormat})`);

  // Body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  console.log('✅ Body parsing configured');

  // Session management with PostgreSQL
  app.use(session(sessionConfig));
  console.log('✅ PostgreSQL session store configured');

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());
  console.log('✅ Passport OAuth initialized');

  // Rate limiting
  app.use('/api/', apiRateLimit);
  app.use('/auth/', authRateLimit);
  app.use(generalRateLimit);
  console.log('✅ Rate limiting configured');

  // Session touch middleware for active sessions
  app.use((req, res, next) => {
    if (req.session && req.session.userId) {
      req.session.touch();
      req.session.lastActivity = new Date();
    }
    next();
  });
  console.log('✅ Session touch middleware configured');

  console.log('🎉 Express middleware stack configuration complete');
}

// Export rate limiters for specific route usage
export const rateLimiters = {
  general: generalRateLimit,
  auth: authRateLimit,
  api: apiRateLimit
};

// Export session configuration for testing
export { sessionConfig };