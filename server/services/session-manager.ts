/**
 * Session Manager Service
 * Secure session management following Flask pattern with SECRET_KEY
 */

import session from 'express-session';
import crypto from 'crypto';
import { Request, Response } from 'express';

export class SessionManager {
  /**
   * Get session configuration with Flask-inspired secure settings
   */
  static getSessionConfig() {
    const SECRET_KEY = process.env.SECRET_KEY || 'default_secure_key_change_in_production';
    const MemoryStore = session.MemoryStore;
    const sessionStore = new MemoryStore();
    
    return {
      secret: SECRET_KEY,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      name: 'theagencyiq.session',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false, // Allow frontend access
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      },
      rolling: true, // Reset expiration on activity
      genid: () => {
        return crypto.randomBytes(16).toString('hex');
      }
    };
  }

  /**
   * Set session user
   */
  static setUser(req: Request, userId: number, userEmail?: string) {
    (req as any).session.userId = userId;
    if (userEmail) {
      (req as any).session.userEmail = userEmail;
    }
  }

  /**
   * Get session user
   */
  static getUser(req: Request): { userId?: number; userEmail?: string } {
    const session = (req as any).session;
    return {
      userId: session?.userId,
      userEmail: session?.userEmail
    };
  }

  /**
   * Clear session
   */
  static clearSession(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      (req as any).session.destroy((err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Test session functionality
   */
  static testSession(req: Request, res: Response) {
    const SECRET_KEY = process.env.SECRET_KEY || 'default_secure_key_change_in_production';
    
    // Set session test data
    (req as any).session.testUser = 'session_test_user';
    (req as any).session.testTime = new Date().toISOString();
    
    // Save session and respond
    (req as any).session.save((err: any) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ 
          error: 'Session save failed',
          details: err.message 
        });
      }
      
      res.json({
        message: 'Session test successful',
        sessionId: req.sessionID,
        testUser: (req as any).session.testUser,
        testTime: (req as any).session.testTime,
        secretConfigured: SECRET_KEY !== 'default_secure_key_change_in_production'
      });
    });
  }
}