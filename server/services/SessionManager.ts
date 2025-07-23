/**
 * SESSION MANAGER
 * Comprehensive session management with PostgreSQL persistence via Drizzle ORM
 * Handles session establishment, regeneration, validation, and cleanup with database storage
 */

import { Request, Response } from 'express';

// Extend Express Request interface for session
declare module 'express-serve-static-core' {
  interface Request {
    session: any;
  }
}
import { db } from '../db';
import { sessions } from '../../shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import winston from 'winston';
import crypto from 'crypto';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export interface SessionData {
  sessionId: string;
  userId: string;
  email?: string;
  isAuthenticated: boolean;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface EstablishSessionOptions {
  userId: string;
  email?: string;
  userAgent?: string;
  ipAddress?: string;
  rememberMe?: boolean;
  regenerate?: boolean;
}

export class SessionManager {
  private static readonly SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly SESSION_PREFIX = 'aiq_';
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Start session cleanup process
    this.startSessionCleanup();
  }

  /**
   * Establish new session with PostgreSQL persistence via Drizzle
   */
  async establishSession(req: Request, res: Response, options: EstablishSessionOptions): Promise<SessionData> {
    try {
      const sessionId = this.generateSessionId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SessionManager.SESSION_TTL);

      logger.info('Establishing session', {
        sessionId: sessionId.substring(0, 16) + '...',
        userId: options.userId.substring(0, 8) + '...',
        email: options.email?.substring(0, 20) + '...',
        userAgent: options.userAgent?.substring(0, 50),
        rememberMe: options.rememberMe
      });

      // Regenerate session if requested (security best practice)
      if (options.regenerate && req.session) {
        await this.regenerateSession(req, res);
      }

      // Create session data
      const sessionData: SessionData = {
        sessionId,
        userId: options.userId,
        email: options.email,
        isAuthenticated: true,
        createdAt: now,
        lastActivity: now,
        expiresAt,
        userAgent: options.userAgent || req.get('User-Agent'),
        ipAddress: options.ipAddress || req.ip
      };

      // Store in PostgreSQL via Drizzle
      await db.insert(sessions).values({
        sid: sessionId,
        sess: {
          ...sessionData,
          cookie: {
            maxAge: SessionManager.SESSION_TTL,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          }
        },
        expire: expiresAt
      }).onConflictDoUpdate({
        target: sessions.sid,
        set: {
          sess: {
            ...sessionData,
            cookie: {
              maxAge: SessionManager.SESSION_TTL,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict'
            }
          },
          expire: expiresAt
        }
      });

      // Set Express session
      req.session.userId = options.userId;
      req.session.isAuthenticated = true;
      req.session.sessionId = sessionId;
      req.session.email = options.email;
      req.session.lastActivity = now;

      // Set secure cookies
      this.setSecureCookies(res, sessionId, expiresAt);

      logger.info('Session established successfully', {
        sessionId: sessionId.substring(0, 16) + '...',
        userId: options.userId.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString(),
        stored: 'postgresql_drizzle'
      });

      return sessionData;

    } catch (error: any) {
      logger.error('Session establishment failed', {
        error: error.message,
        userId: options.userId?.substring(0, 8) + '...',
        stack: error.stack
      });
      throw new Error(`Session establishment failed: ${error.message}`);
    }
  }

  /**
   * Regenerate session for security (prevents fixation attacks)
   */
  async regenerateSession(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        resolve();
        return;
      }

      const oldSessionId = req.session.sessionId;
      
      req.session.regenerate(async (err: any) => {
        if (err) {
          logger.error('Session regeneration failed', {
            error: err.message,
            oldSessionId: oldSessionId?.substring(0, 16) + '...'
          });
          reject(err);
          return;
        }

        try {
          // Clean up old session from database
          if (oldSessionId) {
            await db.delete(sessions).where(eq(sessions.sid, oldSessionId));
            logger.info('Old session cleaned up', {
              oldSessionId: oldSessionId.substring(0, 16) + '...'
            });
          }

          logger.info('Session regenerated successfully', {
            newSessionId: req.session.id?.substring(0, 16) + '...'
          });
          resolve();

        } catch (dbError: any) {
          logger.error('Session cleanup failed', {
            error: dbError.message,
            oldSessionId: oldSessionId?.substring(0, 16) + '...'
          });
          // Don't reject - regeneration succeeded even if cleanup failed
          resolve();
        }
      });
    });
  }

  /**
   * Validate session with database lookup
   */
  async validateSession(sessionId: string): Promise<{ valid: boolean; sessionData?: SessionData; errors: string[] }> {
    const errors: string[] = [];

    try {
      if (!sessionId || !sessionId.startsWith(SessionManager.SESSION_PREFIX)) {
        errors.push('Invalid session ID format');
        return { valid: false, errors };
      }

      // Lookup session in PostgreSQL via Drizzle
      const [sessionRecord] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sid, sessionId));

      if (!sessionRecord) {
        errors.push('Session not found in database');
        return { valid: false, errors };
      }

      // Check expiration
      const now = new Date();
      if (sessionRecord.expire < now) {
        errors.push('Session expired');
        // Clean up expired session
        await db.delete(sessions).where(eq(sessions.sid, sessionId));
        return { valid: false, errors };
      }

      // Extract session data
      const sessionData = sessionRecord.sess as any;
      
      if (!sessionData.isAuthenticated) {
        errors.push('Session not authenticated');
        return { valid: false, errors };
      }

      // Update last activity
      await this.touchSession(sessionId);

      logger.info('Session validated successfully', {
        sessionId: sessionId.substring(0, 16) + '...',
        userId: sessionData.userId?.substring(0, 8) + '...',
        lastActivity: sessionData.lastActivity,
        expiresAt: sessionRecord.expire.toISOString()
      });

      return {
        valid: true,
        sessionData: {
          sessionId,
          userId: sessionData.userId,
          email: sessionData.email,
          isAuthenticated: sessionData.isAuthenticated,
          createdAt: new Date(sessionData.createdAt),
          lastActivity: new Date(sessionData.lastActivity),
          expiresAt: sessionRecord.expire,
          userAgent: sessionData.userAgent,
          ipAddress: sessionData.ipAddress
        },
        errors: []
      };

    } catch (error: any) {
      errors.push(`Session validation error: ${error.message}`);
      logger.error('Session validation failed', {
        error: error.message,
        sessionId: sessionId?.substring(0, 16) + '...',
        stack: error.stack
      });
      return { valid: false, errors };
    }
  }

  /**
   * Touch session to extend expiry (activity tracking)
   */
  async touchSession(sessionId: string): Promise<void> {
    try {
      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + SessionManager.SESSION_TTL);

      await db
        .update(sessions)
        .set({
          expire: newExpiresAt,
          sess: {
            lastActivity: now.toISOString(),
            expiresAt: newExpiresAt.toISOString()
          } as any
        })
        .where(eq(sessions.sid, sessionId));

      logger.debug('Session touched', {
        sessionId: sessionId.substring(0, 16) + '...',
        newExpiresAt: newExpiresAt.toISOString()
      });

    } catch (error: any) {
      logger.error('Session touch failed', {
        error: error.message,
        sessionId: sessionId?.substring(0, 16) + '...'
      });
    }
  }

  /**
   * Clear session and cleanup database
   */
  async clearSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.session?.sessionId || req.session?.id;

      if (sessionId) {
        // Remove from PostgreSQL
        await db.delete(sessions).where(eq(sessions.sid, sessionId));
        
        logger.info('Session cleared from database', {
          sessionId: sessionId.substring(0, 16) + '...'
        });
      }

      // Clear Express session
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) {
            logger.error('Express session destruction failed', { error: err.message });
          }
        });
      }

      // Clear cookies
      this.clearSecureCookies(res);

      logger.info('Session cleared successfully', {
        sessionId: sessionId?.substring(0, 16) + '...'
      });

    } catch (error: any) {
      logger.error('Session clearing failed', {
        error: error.message,
        sessionId: req.session?.sessionId?.substring(0, 16) + '...'
      });
      throw error;
    }
  }

  /**
   * Create test session for testing purposes
   */
  async createTestSession(options: {
    userId?: string;
    email?: string;
    ttl?: number;
  } = {}): Promise<SessionData> {
    try {
      const sessionId = this.generateSessionId();
      const now = new Date();
      const ttl = options.ttl || SessionManager.SESSION_TTL;
      const expiresAt = new Date(now.getTime() + ttl);
      const userId = options.userId || 'test-user-' + Date.now();

      const sessionData: SessionData = {
        sessionId,
        userId,
        email: options.email || `${userId}@test.com`,
        isAuthenticated: true,
        createdAt: now,
        lastActivity: now,
        expiresAt,
        userAgent: 'SessionManagerTest/1.0',
        ipAddress: '127.0.0.1'
      };

      // Store in PostgreSQL
      await db.insert(sessions).values({
        sid: sessionId,
        sess: {
          ...sessionData,
          cookie: {
            maxAge: ttl,
            httpOnly: true,
            secure: false, // Allow for testing
            sameSite: 'strict'
          }
        },
        expire: expiresAt
      });

      logger.info('Test session created', {
        sessionId: sessionId.substring(0, 16) + '...',
        userId: userId.substring(0, 8) + '...',
        ttl: ttl / 1000 + 's'
      });

      return sessionData;

    } catch (error: any) {
      logger.error('Test session creation failed', {
        error: error.message,
        userId: options.userId?.substring(0, 8) + '...'
      });
      throw error;
    }
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `${SessionManager.SESSION_PREFIX}${timestamp}_${randomBytes}`;
  }

  /**
   * Set secure cookies
   */
  private setSecureCookies(res: Response, sessionId: string, expiresAt: Date): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      expires: expiresAt,
      path: '/'
    };

    res.cookie('theagencyiq.session', `s:${sessionId}.signature`, cookieOptions);
    res.cookie('aiq_backup_session', sessionId, { ...cookieOptions, httpOnly: false }); // Backup for client access
  }

  /**
   * Clear secure cookies
   */
  private clearSecureCookies(res: Response): void {
    const clearOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      expires: new Date(0),
      path: '/'
    };

    res.clearCookie('theagencyiq.session', clearOptions);
    res.clearCookie('aiq_backup_session', clearOptions);
    res.clearCookie('connect.sid', clearOptions);
  }

  /**
   * Cleanup expired sessions (runs periodically)
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      const result = await db.delete(sessions).where(lt(sessions.expire, now));
      const cleanedCount = Array.isArray(result) ? result.length : 0;
      
      if (cleanedCount > 0) {
        logger.info('Expired sessions cleaned up', {
          cleaned: cleanedCount,
          timestamp: now.toISOString()
        });
      }

    } catch (error: any) {
      logger.error('Session cleanup failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Start periodic session cleanup
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, SessionManager.CLEANUP_INTERVAL);

    logger.info('Session cleanup started', {
      interval: SessionManager.CLEANUP_INTERVAL / 1000 + 's'
    });
  }
}

export const sessionManager = new SessionManager();
export default SessionManager;