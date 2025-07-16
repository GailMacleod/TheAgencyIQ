/**
 * Session Manager Service
 * Handles session management for iframe compatibility
 */

import { Request, Response } from 'express';
import { JWTAuthMiddleware } from '../middleware/jwt-auth';

interface SessionData {
  userId: number;
  userEmail: string;
  established: boolean;
  createdAt: Date;
  lastAccess: Date;
}

export class SessionManager {
  private static sessions: Map<string, SessionData> = new Map();
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Initialize session management
   */
  static initialize(): void {
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 30 * 60 * 1000); // Every 30 minutes

    console.log('✅ Session Manager initialized');
  }

  /**
   * Establish session for user
   */
  static async establishSession(req: Request, res: Response, userId: number, userEmail: string): Promise<string> {
    try {
      // Generate session ID
      const sessionId = this.generateSessionId();
      
      // Create session data
      const sessionData: SessionData = {
        userId,
        userEmail,
        established: true,
        createdAt: new Date(),
        lastAccess: new Date()
      };

      // Store session
      this.sessions.set(sessionId, sessionData);

      // Generate JWT token
      const token = JWTAuthMiddleware.generateToken(userId, userEmail);

      // Set session cookie
      res.cookie('session_id', sessionId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: this.SESSION_TIMEOUT,
        path: '/'
      });

      // Set auth token cookie
      JWTAuthMiddleware.setAuthCookie(res, token);

      // Update express session if available
      if (req.session) {
        (req.session as any).userId = userId;
        (req.session as any).userEmail = userEmail;
        (req.session as any).established = true;
      }

      console.log('✅ Session established:', { sessionId, userId, userEmail });
      return sessionId;
    } catch (error) {
      console.error('Session establishment error:', error);
      throw error;
    }
  }

  /**
   * Get session data
   */
  static getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last access
    session.lastAccess = new Date();
    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Validate session
   */
  static validateSession(req: Request): SessionData | null {
    try {
      // Try to get session from various sources
      let sessionId: string | undefined;

      // 1. From cookie
      if (req.cookies.session_id) {
        sessionId = req.cookies.session_id;
      }

      // 2. From query parameter (iframe compatibility)
      if (!sessionId && req.query.session_id) {
        sessionId = req.query.session_id as string;
      }

      // 3. From express session
      if (!sessionId && req.sessionID) {
        sessionId = req.sessionID;
      }

      if (!sessionId) {
        return null;
      }

      return this.getSession(sessionId);
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Destroy session
   */
  static destroySession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    console.log('🗑️ Session destroyed:', { sessionId, deleted });
    return deleted;
  }

  /**
   * Check if session is expired
   */
  private static isSessionExpired(session: SessionData): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - session.lastAccess.getTime();
    return timeDiff > this.SESSION_TIMEOUT;
  }

  /**
   * Clean up expired sessions
   */
  private static cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (this.isSessionExpired(session)) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Generate session ID
   */
  private static generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session statistics
   */
  static getStats(): any {
    const now = new Date();
    const activeSessions = Array.from(this.sessions.values()).filter(
      session => !this.isSessionExpired(session)
    );

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      establishedSessions: activeSessions.filter(s => s.established).length,
      lastUpdate: now.toISOString()
    };
  }
}