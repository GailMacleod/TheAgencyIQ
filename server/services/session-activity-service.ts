/**
 * Session Activity Service
 * Tracks user session activity and enforces security requirements
 */

import { storage } from "../storage";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface SessionActivity {
  userId: number;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
  endpoint: string;
  isActive: boolean;
}

export interface SecurityCheck {
  valid: boolean;
  userId: number;
  reason?: string;
  requiresReauth?: boolean;
}

export class SessionActivityService {
  private activities: Map<string, SessionActivity> = new Map();
  private readonly MAX_IDLE_TIME = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_SESSIONS_PER_USER = 3;
  
  /**
   * Track user session activity
   */
  trackActivity(sessionId: string, userId: number, ipAddress: string, userAgent: string, endpoint: string): void {
    const activity: SessionActivity = {
      userId,
      sessionId,
      ipAddress,
      userAgent,
      lastActivity: new Date(),
      endpoint,
      isActive: true
    };
    
    this.activities.set(sessionId, activity);
    
    // Log activity for security monitoring
    console.log(`📊 Session Activity: User ${userId} - ${endpoint} - ${sessionId.substring(0, 10)}...`);
  }
  
  /**
   * Validate session security
   */
  async validateSessionSecurity(sessionId: string, userId: number, ipAddress: string): Promise<SecurityCheck> {
    const activity = this.activities.get(sessionId);
    
    if (!activity) {
      return {
        valid: false,
        userId: 0,
        reason: 'Session not found',
        requiresReauth: true
      };
    }
    
    // Check if session is still active
    const now = new Date();
    const timeSinceActivity = now.getTime() - activity.lastActivity.getTime();
    
    if (timeSinceActivity > this.MAX_IDLE_TIME) {
      this.activities.delete(sessionId);
      return {
        valid: false,
        userId: activity.userId,
        reason: 'Session expired due to inactivity',
        requiresReauth: true
      };
    }
    
    // Check for IP address changes (basic security)
    if (activity.ipAddress !== ipAddress) {
      console.warn(`🚨 Security Alert: IP address changed for session ${sessionId}`);
      console.warn(`   Previous: ${activity.ipAddress}, Current: ${ipAddress}`);
    }
    
    // Validate user still exists and is active
    const user = await storage.getUser(userId);
    if (!user) {
      this.activities.delete(sessionId);
      return {
        valid: false,
        userId: 0,
        reason: 'User not found',
        requiresReauth: true
      };
    }
    
    // Update last activity
    activity.lastActivity = now;
    
    return {
      valid: true,
      userId: activity.userId
    };
  }
  
  /**
   * Check if user has too many active sessions
   */
  checkSessionLimit(userId: number): boolean {
    const userSessions = Array.from(this.activities.values())
      .filter(activity => activity.userId === userId && activity.isActive);
    
    return userSessions.length < this.MAX_SESSIONS_PER_USER;
  }
  
  /**
   * Terminate session
   */
  terminateSession(sessionId: string): void {
    const activity = this.activities.get(sessionId);
    if (activity) {
      activity.isActive = false;
      console.log(`🔒 Session terminated: ${sessionId.substring(0, 10)}...`);
    }
    this.activities.delete(sessionId);
  }
  
  /**
   * Get active sessions for user
   */
  getUserActiveSessions(userId: number): SessionActivity[] {
    return Array.from(this.activities.values())
      .filter(activity => activity.userId === userId && activity.isActive);
  }
  
  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, activity] of this.activities.entries()) {
      const timeSinceActivity = now.getTime() - activity.lastActivity.getTime();
      if (timeSinceActivity > this.MAX_IDLE_TIME) {
        expiredSessions.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessions) {
      this.terminateSession(sessionId);
    }
    
    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }
  
  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalActiveSessions: number;
    uniqueUsers: number;
    averageSessionAge: number;
  } {
    const activeSessions = Array.from(this.activities.values())
      .filter(activity => activity.isActive);
    
    const uniqueUsers = new Set(activeSessions.map(s => s.userId)).size;
    
    const now = new Date();
    const totalAge = activeSessions.reduce((sum, activity) => {
      return sum + (now.getTime() - activity.lastActivity.getTime());
    }, 0);
    
    const averageSessionAge = activeSessions.length > 0 ? totalAge / activeSessions.length : 0;
    
    return {
      totalActiveSessions: activeSessions.length,
      uniqueUsers,
      averageSessionAge
    };
  }
}

export const sessionActivityService = new SessionActivityService();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  sessionActivityService.cleanupExpiredSessions();
}, 5 * 60 * 1000);