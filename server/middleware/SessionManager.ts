import { Pool } from '@neondatabase/serverless';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { Request, Response, NextFunction } from 'express';

export class PostgreSQLSessionManager {
  private store: any;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeStore();
  }

  private initializeStore() {
    const PgSession = connectPg(session);
    
    this.store = new PgSession({
      pool: this.pool, // Use the actual PostgreSQL pool instead of connection string
      createTableIfMissing: true,
      ttl: 3 * 24 * 60 * 60, // 3 days in seconds for PWA support
      tableName: "sessions",
      touchInterval: 60000, // Touch sessions every minute
      disableTouch: false, // Enable touch for active sessions
      pruneSessionInterval: 60 * 60 * 1000, // Prune expired sessions every hour
      errorLog: (error: any) => {
        console.error('PostgreSQL session store error:', error.message, error.stack);
      }
    });

    console.log('PostgreSQL session store initialized with pool connection');
  }

  getStore() {
    return this.store;
  }

  // Session regeneration middleware for login security
  regenerateSession(req: Request, res: Response, next: NextFunction) {
    if (req.session) {
      const oldSessionData = { ...req.session };
      
      req.session.regenerate((err: any) => {
        if (err) {
          console.error('Session regeneration failed:', err.message, 'sessionId:', req.sessionID);
          return next(err);
        }

        // Restore session data after regeneration
        Object.assign(req.session!, oldSessionData);
        req.session!.save((saveErr: any) => {
          if (saveErr) {
            console.error('Session save after regeneration failed:', saveErr.message, 'sessionId:', req.sessionID);
            return next(saveErr);
          }
          
          console.log('Session regenerated successfully for security. SessionId:', req.sessionID, 'UserId:', req.session?.userId);
          next();
        });
      });
    } else {
      next();
    }
  }

  // Session touch middleware for active sessions
  touchActiveSession(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.userId) {
      // Touch session to extend TTL for active users
      req.session.touch();
      req.session.lastActivity = Date.now();
      
      // Add sessionID to user data for subscribers.json compatibility
      if (!req.session.sessionId) {
        req.session.sessionId = req.sessionID;
      }

      console.log('Session touched for active user:', req.session.userId, 'sessionId:', req.sessionID);
    }
    next();
  }

  // Session validation for PWA offline support
  validateSession(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.userId) {
      // Check if session is still valid and not expired
      const lastActivity = req.session.lastActivity || 0;
      const maxInactivity = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
      const now = Date.now();

      if (now - lastActivity > maxInactivity) {
        // Session expired, destroy it
        req.session.destroy((err: any) => {
          if (err) {
            console.error('Failed to destroy expired session:', err.message, 'sessionId:', req.sessionID);
          }
          res.status(401).json({
            error: 'Session expired',
            message: 'Please log in again',
            code: 'SESSION_EXPIRED'
          });
        });
        return;
      }

      // Session is valid, update last activity
      req.session.lastActivity = now;
    }
    
    next();
  }

  // Add sessionID to user data for tracking
  enrichUserData(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.userId && req.sessionID) {
      // Ensure sessionID is available in session data for subscribers.json compatibility
      req.session.sessionId = req.sessionID;
      req.session.connectionTimestamp = req.session.connectionTimestamp || Date.now();
    }
    next();
  }

  // Test session store connection
  async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      this.store.get('test-connection', (err: any, session: any) => {
        if (err) {
          console.error('Session store connection test failed:', err.message);
          resolve(false);
        } else {
          console.log('Session store connection test successful');
          resolve(true);
        }
      });
    });
  }
}

// Session configuration factory
export function createSessionConfig(sessionStore: any) {
  const sessionTtlMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

  return {
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false, // Don't create sessions for unauthenticated users
    name: 'theagencyiq.session',
    genid: () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      return `aiq_${timestamp}_${random}`;
    },
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true, // Prevent JavaScript access to prevent XSS attacks
      sameSite: 'strict' as const, // Prevent CSRF attacks with strict same-site policy
      maxAge: sessionTtlMs, // 72 hours (3 days) for persistent PWA logins
      path: '/',
      domain: undefined // Let express handle domain automatically
    },
    rolling: true, // Extend session on activity
    proxy: true, // Works with trust proxy setting
    unset: 'destroy' as const, // Properly clean up sessions
    touch: true // Enable session touching for active sessions
  };
}