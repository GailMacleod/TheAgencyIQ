import { Request, Response, NextFunction } from 'express';

// Custom session consistency middleware to completely bypass express-session ID issues
export class SessionConsistencyManager {
  private static sessionMap = new Map<string, any>();
  private static readonly MAX_SESSIONS = 1000;
  
  private static cleanupOldSessions(): void {
    if (this.sessionMap.size > this.MAX_SESSIONS) {
      const entries = Array.from(this.sessionMap.entries());
      const toDelete = entries.slice(0, entries.length - this.MAX_SESSIONS);
      toDelete.forEach(([key]) => this.sessionMap.delete(key));
    }
  }
  
  static middleware() {
    return (req: any, res: Response, next: NextFunction) => {
      // Extract session ID from cookie
      const cookieHeader = req.headers.cookie || '';
      const sessionMatch = cookieHeader.match(/theagencyiq\.session=([^;]+)/);
      
      if (sessionMatch) {
        let cookieSessionId = sessionMatch[1];
        
        // Handle signed cookies
        if (cookieSessionId.startsWith('s%3A')) {
          const decoded = decodeURIComponent(cookieSessionId);
          cookieSessionId = decoded.substring(4).split('.')[0];
        }
        
        console.log(`🔧 SessionConsistency: Cookie ID ${cookieSessionId}, Express ID ${req.sessionID}`);
        
        // Force session ID consistency by overriding express-session ID
        Object.defineProperty(req, 'sessionID', {
          value: cookieSessionId,
          writable: false,
          enumerable: true,
          configurable: true
        });
        
        // Restore or create session data
        if (this.sessionMap.has(cookieSessionId)) {
          const sessionData = this.sessionMap.get(cookieSessionId);
          req.session = Object.assign(req.session, sessionData);
          console.log(`✅ Session restored: ${cookieSessionId} -> User ${sessionData.userId}`);
        } else {
          console.log(`🆕 New session initialized: ${cookieSessionId}`);
        }
        
        // Override session.save to store in our map
        const originalSave = req.session.save;
        req.session.save = (callback?: (err?: any) => void) => {
          this.cleanupOldSessions();
          this.sessionMap.set(cookieSessionId, {
            userId: req.session.userId,
            userEmail: req.session.userEmail,
            subscriptionPlan: req.session.subscriptionPlan,
            subscriptionActive: req.session.subscriptionActive
          });
          console.log(`💾 Session saved: ${cookieSessionId} -> User ${req.session.userId}`);
          if (callback) callback();
        };
      }
      
      next();
    };
  }
}