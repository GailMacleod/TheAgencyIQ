import { Pool } from '@neondatabase/serverless';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class SessionPersistenceManager {
  private pool: Pool;
  private sessionStore: any;

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeSessionStore();
  }

  private initializeSessionStore() {
    const PgSession = connectPg(session);
    this.sessionStore = new PgSession({
      pool: this.pool,
      createTableIfMissing: true,
      ttl: 7 * 24 * 60 * 60, // 7 days for PWA persistence
      tableName: "sessions",
      touchInterval: 60000, // Touch sessions every minute
      disableTouch: false, // Enable touch for active sessions
      pruneSessionInterval: 60 * 60 * 1000, // Prune expired sessions every hour
      errorLog: (error: any) => {
        console.error('PostgreSQL session store error:', error.message);
      }
    });
  }

  getSessionConfig() {
    return {
      store: this.sessionStore,
      secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
      name: 'aiq_session',
      resave: false,
      saveUninitialized: false,
      rolling: true, // Extend session on activity
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'strict' as const
      }
    };
  }

  // Session touch middleware for active sessions
  sessionTouchMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.session && req.session.userId) {
        // Touch session to extend TTL
        req.session.touch();
        req.session.lastActivity = Date.now();
      }
      next();
    };
  }

  // Session regeneration for login security
  async regenerateSession(req: Request, userData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const oldSessionData = { ...req.session };
      
      req.session.regenerate((err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Restore session data after regeneration
        Object.assign(req.session, oldSessionData, userData);
        
        req.session.save((saveErr) => {
          if (saveErr) {
            reject(saveErr);
            return;
          }
          resolve();
        });
      });
    });
  }

  // Validate session and tie to Drizzle user data
  async validateSession(req: Request): Promise<any> {
    if (!req.session || !req.session.userId) {
      return null;
    }

    try {
      // Verify user exists in database
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
      
      if (!user) {
        // User doesn't exist, clear session
        req.session.destroy(() => {});
        return null;
      }

      // Update session with fresh user data
      req.session.userEmail = user.email;
      req.session.lastValidated = Date.now();
      req.session.touch();

      return user;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Establish session with Drizzle integration
  async establishSession(req: Request, userId: string, userEmail: string): Promise<void> {
    // First regenerate session for security
    await this.regenerateSession(req, {
      userId,
      userEmail,
      establishedAt: new Date().toISOString(),
      lastActivity: Date.now(),
      sessionId: req.sessionID
    });

    // Update subscribers.json for backward compatibility
    await this.syncToSubscribersJson(userId, userEmail, req.sessionID);
  }

  // Sync session data to subscribers.json
  private async syncToSubscribersJson(userId: string, userEmail: string, sessionId: string) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const subscribersPath = path.join(process.cwd(), 'data', 'subscribers.json');
      
      let subscribers = [];
      try {
        const subscribersData = await fs.promises.readFile(subscribersPath, 'utf8');
        subscribers = JSON.parse(subscribersData);
      } catch (error) {
        // File doesn't exist or is invalid, start with empty array
        subscribers = [];
      }

      // Update or add user session data
      const existingIndex = subscribers.findIndex((sub: any) => sub.userId === userId);
      const sessionData = {
        userId,
        userEmail,
        sessionId,
        lastActivity: new Date().toISOString(),
        source: 'session_establishment'
      };

      if (existingIndex >= 0) {
        subscribers[existingIndex] = { ...subscribers[existingIndex], ...sessionData };
      } else {
        subscribers.push(sessionData);
      }

      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(subscribersPath), { recursive: true });
      
      // Write updated subscribers
      await fs.promises.writeFile(subscribersPath, JSON.stringify(subscribers, null, 2));
      
      console.log(`📋 Session data synced to subscribers.json for user ${userId}`);
    } catch (error) {
      console.error('Failed to sync to subscribers.json:', error);
      // Don't throw error - this is non-critical
    }
  }

  // Clear session properly
  async clearSession(req: Request): Promise<void> {
    return new Promise((resolve) => {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}