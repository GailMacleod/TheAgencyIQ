import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Direct session mapping system - bypasses complex middleware issues
export const sessionUserMap = new Map<string, number>();

export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  try {
    // Check session.userId first (primary method)
    if (req.session?.userId) {
      req.user = { id: req.session.userId };
      console.log(`✅ AuthGuard: User ${req.session.userId} authenticated via session`);
      next();
      return;
    }

    // Extract session ID from cookie for fallback authentication
    const cookieHeader = req.headers.cookie || '';
    const sessionMatch = cookieHeader.match(/theagencyiq\.session=([^;]+)/);
    
    if (sessionMatch) {
      let cookieSessionId = sessionMatch[1];
      
      // Handle signed cookies
      if (cookieSessionId.startsWith('s%3A')) {
        const decoded = decodeURIComponent(cookieSessionId);
        cookieSessionId = decoded.substring(4).split('.')[0];
      }
      
      console.log(`🔍 AuthGuard: Checking session ID ${cookieSessionId} from cookie`);
      
      // Check session mapping first
      if (sessionUserMap.has(cookieSessionId)) {
        const userId = sessionUserMap.get(cookieSessionId);
        req.user = { id: userId };
        req.session.userId = userId;
        
        // Force session persistence
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save error in AuthGuard:', err);
          }
        });
        
        console.log(`✅ AuthGuard: User ${userId} authenticated via session mapping`);
        next();
        return;
      }
      
      // Check if session ID matches current session
      if (cookieSessionId === req.sessionID && sessionUserMap.has(req.sessionID)) {
        const userId = sessionUserMap.get(req.sessionID);
        req.user = { id: userId };
        req.session.userId = userId;
        
        // Force session persistence
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save error in AuthGuard:', err);
          }
        });
        
        console.log(`✅ AuthGuard: User ${userId} authenticated via session ID match`);
        next();
        return;
      }
    }

    // Fallback to session mapping if session is corrupted but cookie exists
    const sessionId = req.sessionID;
    if (sessionId && sessionUserMap.has(sessionId)) {
      const userId = sessionUserMap.get(sessionId);
      req.user = { id: userId };
      req.session.userId = userId; // Restore session data
      
      // Force session persistence
      req.session.save((err: any) => {
        if (err) {
          console.error('Session save error in AuthGuard:', err);
        }
      });
      
      console.log(`✅ AuthGuard: User ${userId} authenticated via session mapping fallback`);
      next();
      return;
    }

    console.log(`❌ AuthGuard: Authentication failed - no valid session found`);
    res.status(401).json({ message: 'Unauthorized', redirectTo: '/login' });
  } catch (error) {
    console.error('AuthGuard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const setSessionMapping = (sessionId: string, userId: number) => {
  sessionUserMap.set(sessionId, userId);
  console.log(`📝 Session mapping set: ${sessionId} -> User ID ${userId}`);
};

export const requireAuthForPayment = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required for payment' });
  }
  next();
};