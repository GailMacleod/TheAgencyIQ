// import jwt from 'jsonwebtoken'; // Package not available, using custom implementation
import crypto from 'crypto';
import { sql } from 'drizzle-orm';
import { db } from '../db';

// Custom JWT implementation since jsonwebtoken package is not available
class CustomJWT {
  private static base64UrlEscape(str: string): string {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private static base64UrlUnescape(str: string): string {
    str += new Array(5 - str.length % 4).join('=');
    return str.replace(/\-/g, '+').replace(/_/g, '/');
  }

  private static base64UrlDecode(str: string): string {
    return Buffer.from(this.base64UrlUnescape(str), 'base64').toString();
  }

  private static base64UrlEncode(str: string): string {
    return this.base64UrlEscape(Buffer.from(str).toString('base64'));
  }

  static sign(payload: any, secret: string, options: { expiresIn?: string } = {}): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + (options.expiresIn === '7d' ? 7 * 24 * 60 * 60 : 60 * 60) // 7 days or 1 hour
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload));
    
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64');
    
    return `${data}.${this.base64UrlEscape(signature)}`;
  }

  static verify(token: string, secret: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // Verify signature
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64');
    
    if (this.base64UrlEscape(signature) !== encodedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return payload;
  }
}

interface SessionData {
  userId: number;
  email: string;
  sessionId: string;
  lastActivity: Date;
  createdAt: Date;
}

interface JWTPayload {
  userId: number;
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export class JWTSessionManager {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRY: string = '7d'; // 7 days
  private readonly REFRESH_THRESHOLD: number = 24 * 60 * 60 * 1000; // 24 hours in ms
  private sessions: Map<string, SessionData> = new Map();
  
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'default-secret-key';
    
    if (this.JWT_SECRET === 'default-secret-key') {
      console.warn('⚠️  Using default JWT secret. Set JWT_SECRET environment variable for production.');
    }
    
    // Start cleanup timer
    this.startCleanupTimer();
  }

  async createSession(userId: number, email: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    
    const sessionData: SessionData = {
      userId,
      email,
      sessionId,
      lastActivity: now,
      createdAt: now
    };
    
    // Store in memory for fast access
    this.sessions.set(sessionId, sessionData);
    
    // Store in database for persistence
    try {
      await db.execute(sql`
        INSERT INTO sessions (sid, sess, expire)
        VALUES (${sessionId}, ${JSON.stringify(sessionData)}, ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)})
        ON CONFLICT (sid) DO UPDATE SET
          sess = ${JSON.stringify(sessionData)},
          expire = ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
      `);
    } catch (error) {
      console.error('Failed to store session in database:', error);
    }
    
    // Create JWT token
    const payload: JWTPayload = {
      userId,
      email,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000)
    };
    
    const token = CustomJWT.sign(payload, this.JWT_SECRET, { 
      expiresIn: this.JWT_EXPIRY
    });
    
    console.log(`✅ Session created for user ${userId} (${email}) - Session ID: ${sessionId}`);
    return token;
  }

  async validateSession(token: string): Promise<SessionData | null> {
    try {
      // Verify JWT token
      const payload = CustomJWT.verify(token, this.JWT_SECRET) as JWTPayload;
      
      if (!payload || !payload.sessionId) {
        return null;
      }
      
      // Check in-memory cache first
      let sessionData = this.sessions.get(payload.sessionId);
      
      if (!sessionData) {
        // Load from database
        sessionData = await this.loadSessionFromDatabase(payload.sessionId);
        if (sessionData) {
          this.sessions.set(payload.sessionId, sessionData);
        }
      }
      
      if (!sessionData) {
        return null;
      }
      
      // Update last activity
      sessionData.lastActivity = new Date();
      this.sessions.set(payload.sessionId, sessionData);
      
      // Update database periodically (every 5 minutes)
      const timeSinceLastUpdate = Date.now() - sessionData.lastActivity.getTime();
      if (timeSinceLastUpdate > 5 * 60 * 1000) {
        this.updateSessionInDatabase(sessionData);
      }
      
      return sessionData;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Token expired')) {
          console.log('Token expired');
        } else if (error.message.includes('Invalid')) {
          console.log('Invalid token');
        } else {
          console.error('Session validation error:', error);
        }
      }
      return null;
    }
  }

  async refreshSession(token: string): Promise<string | null> {
    try {
      // For refresh, we need to handle expired tokens
      let payload: JWTPayload;
      try {
        payload = CustomJWT.verify(token, this.JWT_SECRET) as JWTPayload;
      } catch (error) {
        // If expired, manually decode to check if it's recent enough to refresh
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payloadPart = parts[1];
        const decoded = JSON.parse(Buffer.from(payloadPart.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
        
        // Check if token is within refresh window (7 days)
        const tokenAge = Date.now() - (decoded.iat * 1000);
        if (tokenAge > 7 * 24 * 60 * 60 * 1000) {
          return null;
        }
        payload = decoded;
      }
      
      if (!payload || !payload.sessionId) {
        return null;
      }
      
      // Check if session exists
      const sessionData = this.sessions.get(payload.sessionId) || 
                          await this.loadSessionFromDatabase(payload.sessionId);
      
      if (!sessionData) {
        return null;
      }
      
      // Check if token is within refresh threshold
      const tokenAge = Date.now() - (payload.iat * 1000);
      if (tokenAge > 7 * 24 * 60 * 60 * 1000) { // 7 days
        return null; // Token too old to refresh
      }
      
      // Create new token
      return await this.createSession(sessionData.userId, sessionData.email);
    } catch (error) {
      console.error('Session refresh error:', error);
      return null;
    }
  }

  async destroySession(token: string): Promise<boolean> {
    try {
      const payload = CustomJWT.verify(token, this.JWT_SECRET) as JWTPayload;
      
      if (!payload || !payload.sessionId) {
        return false;
      }
      
      // Remove from memory
      this.sessions.delete(payload.sessionId);
      
      // Remove from database
      try {
        await db.execute(sql`DELETE FROM sessions WHERE sid = ${payload.sessionId}`);
      } catch (error) {
        console.error('Failed to remove session from database:', error);
      }
      
      console.log(`✅ Session destroyed for session ID: ${payload.sessionId}`);
      return true;
    } catch (error) {
      console.error('Session destruction error:', error);
      return false;
    }
  }

  private async loadSessionFromDatabase(sessionId: string): Promise<SessionData | null> {
    try {
      const result = await db.execute(sql`
        SELECT sess FROM sessions 
        WHERE sid = ${sessionId} AND expire > ${new Date()}
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const sessionData = result.rows[0].sess as SessionData;
      return {
        ...sessionData,
        lastActivity: new Date(sessionData.lastActivity),
        createdAt: new Date(sessionData.createdAt)
      };
    } catch (error) {
      console.error('Failed to load session from database:', error);
      return null;
    }
  }

  private async updateSessionInDatabase(sessionData: SessionData): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE sessions 
        SET sess = ${JSON.stringify(sessionData)}, expire = ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
        WHERE sid = ${sessionData.sessionId}
      `);
    } catch (error) {
      console.error('Failed to update session in database:', error);
    }
  }

  private startCleanupTimer(): void {
    // Clean up expired sessions every hour
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000); // 1 hour
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    // Find expired sessions in memory
    for (const [sessionId, sessionData] of this.sessions.entries()) {
      const lastActivity = sessionData.lastActivity.getTime();
      if (now - lastActivity > 7 * 24 * 60 * 60 * 1000) { // 7 days
        expiredSessions.push(sessionId);
      }
    }
    
    // Remove expired sessions from memory
    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }
    
    // Clean up database
    try {
      await db.execute(sql`DELETE FROM sessions WHERE expire < ${new Date()}`);
    } catch (error) {
      console.error('Failed to cleanup expired sessions from database:', error);
    }
    
    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  // Get session statistics
  getSessionStats(): { total: number; active: number } {
    const now = Date.now();
    const activeThreshold = 30 * 60 * 1000; // 30 minutes
    
    let activeCount = 0;
    for (const sessionData of this.sessions.values()) {
      if (now - sessionData.lastActivity.getTime() < activeThreshold) {
        activeCount++;
      }
    }
    
    return {
      total: this.sessions.size,
      active: activeCount
    };
  }
}

export const jwtSessionManager = new JWTSessionManager();