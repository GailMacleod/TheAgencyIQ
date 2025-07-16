import { generateSessionToken, verifySessionToken } from '../middleware/session-security';

// Session refresh service for handling token refresh and session management
export class SessionRefreshService {
  private static instance: SessionRefreshService;
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  public static getInstance(): SessionRefreshService {
    if (!SessionRefreshService.instance) {
      SessionRefreshService.instance = new SessionRefreshService();
    }
    return SessionRefreshService.instance;
  }
  
  // Start session refresh timer for a user
  public startRefreshTimer(sessionId: string, userId: number, email: string): void {
    // Clear existing timer if any
    this.clearRefreshTimer(sessionId);
    
    // Set timer for 25 minutes (refresh before 30-minute expiry)
    const timer = setTimeout(() => {
      this.refreshSession(sessionId, userId, email);
    }, 25 * 60 * 1000);
    
    this.refreshIntervals.set(sessionId, timer);
    console.log(`🔄 Session refresh timer started for session: ${sessionId}`);
  }
  
  // Clear refresh timer
  public clearRefreshTimer(sessionId: string): void {
    const timer = this.refreshIntervals.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.refreshIntervals.delete(sessionId);
      console.log(`🔄 Session refresh timer cleared for session: ${sessionId}`);
    }
  }
  
  // Refresh session token
  private async refreshSession(sessionId: string, userId: number, email: string): Promise<void> {
    try {
      // Generate new token
      const newToken = generateSessionToken(userId, email);
      
      // Update session in database or memory store
      // This would integrate with your session store
      console.log(`🔄 Session refreshed for user ${userId}: ${sessionId}`);
      
      // Restart the timer
      this.startRefreshTimer(sessionId, userId, email);
      
    } catch (error) {
      console.error('Session refresh failed:', error);
      this.clearRefreshTimer(sessionId);
    }
  }
  
  // Validate and refresh token if needed
  public async validateAndRefreshToken(token: string): Promise<{ valid: boolean; newToken?: string; userId?: number }> {
    const decoded = verifySessionToken(token);
    
    if (!decoded) {
      return { valid: false };
    }
    
    // Check if token is close to expiry (less than 5 minutes left)
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    if (timeUntilExpiry < 5 * 60) { // Less than 5 minutes left
      // Generate new token
      const newToken = generateSessionToken(decoded.userId, decoded.email);
      return {
        valid: true,
        newToken,
        userId: decoded.userId
      };
    }
    
    return {
      valid: true,
      userId: decoded.userId
    };
  }
  
  // Clean up all timers
  public cleanup(): void {
    this.refreshIntervals.forEach((timer) => clearTimeout(timer));
    this.refreshIntervals.clear();
    console.log('🧹 Session refresh service cleaned up');
  }
}

// Session activity tracker
export class SessionActivityTracker {
  private static activities: Map<string, number> = new Map();
  
  // Track user activity
  public static trackActivity(sessionId: string): void {
    this.activities.set(sessionId, Date.now());
  }
  
  // Get last activity time
  public static getLastActivity(sessionId: string): number | null {
    return this.activities.get(sessionId) || null;
  }
  
  // Check if session is active (within 30 minutes)
  public static isSessionActive(sessionId: string): boolean {
    const lastActivity = this.getLastActivity(sessionId);
    if (!lastActivity) return false;
    
    const thirtyMinutes = 30 * 60 * 1000;
    return (Date.now() - lastActivity) < thirtyMinutes;
  }
  
  // Clean up inactive sessions
  public static cleanupInactiveSessions(): void {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    for (const [sessionId, lastActivity] of this.activities.entries()) {
      if (now - lastActivity > thirtyMinutes) {
        this.activities.delete(sessionId);
        console.log(`🧹 Cleaned up inactive session: ${sessionId}`);
      }
    }
  }
}

// Start cleanup interval
setInterval(() => {
  SessionActivityTracker.cleanupInactiveSessions();
}, 5 * 60 * 1000); // Every 5 minutes