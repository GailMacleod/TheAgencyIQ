/**
 * Session Iframe Fix Utilities
 * Handles session management in Replit's iframe environment
 */

import { Request, Response, NextFunction } from 'express';
import { JWTAuthMiddleware } from './middleware/jwt-auth';
import { storage } from './storage';

interface SessionData {
  userId?: number;
  userEmail?: string;
  established?: boolean;
  lastAccess?: Date;
}

export class SessionIframeFix {
  private static sessionMap: Map<string, SessionData> = new Map();
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Establish session with JWT token fallback
   */
  static establishSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userId: number | undefined;
      let userEmail: string | undefined;
      let token: string | undefined;

      // Method 1: Check existing session
      if (req.session && (req.session as any).userId) {
        userId = (req.session as any).userId;
        userEmail = (req.session as any).userEmail;
        console.log('🔄 Session found:', { userId, userEmail });
      }

      // Method 2: Check JWT token in URL params (iframe compatibility)
      if (!userId && req.query.auth_token) {
        token = req.query.auth_token as string;
        const decoded = JWTAuthMiddleware.verifyToken(token);
        if (decoded) {
          userId = decoded.userId;
          userEmail = decoded.userEmail;
          console.log('🔑 JWT token authenticated:', { userId, userEmail });
        }
      }

      // Method 3: Check JWT token in headers
      if (!userId && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
          const decoded = JWTAuthMiddleware.verifyToken(token);
          if (decoded) {
            userId = decoded.userId;
            userEmail = decoded.userEmail;
            console.log('🔐 Header JWT authenticated:', { userId, userEmail });
          }
        }
      }

      // Method 4: Fallback to session mapping
      if (!userId && req.sessionID) {
        const sessionData = this.sessionMap.get(req.sessionID);
        if (sessionData && this.isSessionValid(sessionData)) {
          userId = sessionData.userId;
          userEmail = sessionData.userEmail;
          console.log('🗂️ Session mapping found:', { userId, userEmail });
        }
      }

      // If we found a user, establish the session
      if (userId && userEmail) {
        // Update express session
        (req.session as any).userId = userId;
        (req.session as any).userEmail = userEmail;
        (req.session as any).established = true;

        // Update session mapping
        this.sessionMap.set(req.sessionID, {
          userId,
          userEmail,
          established: true,
          lastAccess: new Date()
        });

        // Add to request object
        (req as any).user = { id: userId, email: userEmail };
        (req as any).userId = userId;
        (req as any).userEmail = userEmail;

        // Generate/refresh JWT token
        if (!token) {
          token = JWTAuthMiddleware.generateToken(userId, userEmail);
        }
        
        // Set authentication cookie
        JWTAuthMiddleware.setAuthCookie(res, token);

        console.log('✅ Session established successfully:', { userId, userEmail, sessionId: req.sessionID });
        
        // Save session
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
          }
        });
      }

      next();
    } catch (error) {
      console.error('Session establishment error:', error);
      next();
    }
  }

  /**
   * Middleware to handle iframe session issues
   */
  static iframeSessionHandler = (req: Request, res: Response, next: NextFunction) => {
    try {
      // Set headers for iframe compatibility
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *.replit.dev *.replit.com");

      // Handle CORS for iframe
      if (req.headers.origin && req.headers.origin.includes('replit')) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        return res.status(200).end();
      }

      next();
    } catch (error) {
      console.error('Iframe session handler error:', error);
      next();
    }
  }

  /**
   * Authentication guard with iframe fallback
   */
  static authGuard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const sessionUserId = (req.session as any)?.userId;
      
      // Check if user is authenticated via any method
      if (userId || sessionUserId) {
        // Ensure user exists in database
        const user = await storage.getUser(userId || sessionUserId);
        if (user) {
          (req as any).user = user;
          (req as any).userId = user.id;
          console.log('🔒 Auth guard passed:', { userId: user.id });
          return next();
        }
      }

      // Authentication failed
      console.log('❌ Auth guard failed:', { userId, sessionUserId, sessionId: req.sessionID });
      
      // Return JSON response with iframe-friendly redirect
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
        redirectTo: '/login',
        authUrl: `/auth/login?redirect=${encodeURIComponent(req.originalUrl)}`,
        iframe: true
      });
    } catch (error) {
      console.error('Auth guard error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Internal server error during authentication'
      });
    }
  }

  /**
   * Check if session is valid
   */
  private static isSessionValid(sessionData: SessionData): boolean {
    if (!sessionData.lastAccess) return false;
    
    const now = new Date();
    const timeDiff = now.getTime() - sessionData.lastAccess.getTime();
    
    return timeDiff < this.SESSION_TIMEOUT;
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): void {
    const now = new Date();
    
    for (const [sessionId, sessionData] of this.sessionMap.entries()) {
      if (!this.isSessionValid(sessionData)) {
        this.sessionMap.delete(sessionId);
      }
    }
    
    console.log('🧹 Cleaned up expired sessions');
  }

  /**
   * Get session statistics
   */
  static getSessionStats(): any {
    const now = new Date();
    const activeSessions = Array.from(this.sessionMap.values()).filter(session => 
      this.isSessionValid(session)
    );
    
    return {
      totalSessions: this.sessionMap.size,
      activeSessions: activeSessions.length,
      establishedSessions: activeSessions.filter(s => s.established).length,
      lastCleanup: now.toISOString()
    };
  }

  /**
   * Initialize session cleanup interval
   */
  static initCleanupInterval(): void {
    // Clean up every 30 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 30 * 60 * 1000);
    
    console.log('⏰ Session cleanup interval initialized');
  }
}

// Initialize cleanup on module load
SessionIframeFix.initCleanupInterval();