/**
 * Secure Session Manager
 * Backend-only session handling with proper security validation
 */

import { Request, Response } from 'express';

interface SecureSessionOptions {
  userId: string;
  email?: string;
  rotateOnLogin?: boolean;
}

export class SecureSessionManager {
  
  /**
   * Establish secure session (backend only)
   */
  static establishSession(req: Request, res: Response, options: SecureSessionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('❌ Session regeneration failed:', err);
          return reject(new Error('Session establishment failed'));
        }

        // Set session data
        req.session.userId = options.userId;
        req.session.email = options.email;
        req.session.establishedAt = new Date();
        req.session.lastActivity = new Date();

        // Mark for rotation on next request if needed
        if (options.rotateOnLogin) {
          req.session.shouldRotate = true;
        }

        // Save session
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('❌ Session save failed:', saveErr);
            return reject(new Error('Session save failed'));
          }

          console.log(`✅ Secure session established for user ${options.userId}`);
          resolve();
        });
      });
    });
  }

  /**
   * Validate session expiration (backend only)
   */
  static validateSessionExpiration(req: Request): { valid: boolean; error?: string } {
    if (!req.session || !req.session.establishedAt) {
      return { valid: false, error: 'No session established' };
    }

    const now = new Date();
    const establishedAt = new Date(req.session.establishedAt);
    const maxAge = 72 * 60 * 60 * 1000; // 72 hours
    const sessionAge = now.getTime() - establishedAt.getTime();

    if (sessionAge > maxAge) {
      return { valid: false, error: 'Session expired' };
    }

    // Check last activity
    if (req.session.lastActivity) {
      const lastActivity = new Date(req.session.lastActivity);
      const inactivityLimit = 24 * 60 * 60 * 1000; // 24 hours of inactivity
      const inactiveTime = now.getTime() - lastActivity.getTime();

      if (inactiveTime > inactivityLimit) {
        return { valid: false, error: 'Session inactive too long' };
      }
    }

    return { valid: true };
  }

  /**
   * Destroy session securely (backend only)
   */
  static destroySession(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        return resolve();
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Session destruction failed:', err);
          return reject(new Error('Session destruction failed'));
        }

        // Clear session cookie
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });

        console.log('🧹 Session destroyed securely');
        resolve();
      });
    });
  }

  /**
   * Get session info (backend only, no cookie exposure)
   */
  static getSessionInfo(req: Request): { 
    authenticated: boolean; 
    userId?: string; 
    email?: string; 
    sessionId?: string;
    valid: boolean;
    error?: string;
  } {
    if (!req.session) {
      return { authenticated: false, valid: false, error: 'No session' };
    }

    const validation = this.validateSessionExpiration(req);
    if (!validation.valid) {
      return { 
        authenticated: false, 
        valid: false, 
        error: validation.error 
      };
    }

    return {
      authenticated: !!req.session.userId,
      userId: req.session.userId,
      email: req.session.email,
      sessionId: req.sessionID.substring(0, 12) + '...', // Masked for security
      valid: true
    };
  }

  /**
   * Touch session to extend TTL
   */
  static touchSession(req: Request): void {
    if (req.session) {
      req.session.touch();
      req.session.lastActivity = new Date();
    }
  }

  /**
   * Middleware for session validation
   */
  static requireValidSession() {
    return (req: Request, res: Response, next: Function) => {
      const sessionInfo = SecureSessionManager.getSessionInfo(req);
      
      if (!sessionInfo.valid || !sessionInfo.authenticated) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: sessionInfo.error || 'Valid session required',
          timestamp: new Date().toISOString()
        });
      }

      // Touch session for active users
      SecureSessionManager.touchSession(req);
      next();
    };
  }

  /**
   * Middleware for optional session (allows anonymous access)
   */
  static optionalSession() {
    return (req: Request, res: Response, next: Function) => {
      const sessionInfo = SecureSessionManager.getSessionInfo(req);
      
      // Add session info to request for downstream middleware
      (req as any).sessionInfo = sessionInfo;
      
      if (sessionInfo.valid && sessionInfo.authenticated) {
        SecureSessionManager.touchSession(req);
      }
      
      next();
    };
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      sessionInfo?: {
        authenticated: boolean;
        userId?: string;
        email?: string;
        sessionId?: string;
        valid: boolean;
        error?: string;
      };
    }
  }
}