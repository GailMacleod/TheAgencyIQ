import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Direct session mapping system - bypasses complex middleware issues
export const sessionUserMap = new Map<string, number>();

export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  // Check session.userId first (primary method)
  if (req.session?.userId) {
    req.user = { id: req.session.userId };
    console.log(`✅ AuthGuard: User ${req.session.userId} authenticated via session`);
    next();
    return;
  }

  // Fallback to session mapping if session is corrupted but cookie exists
  const sessionId = req.sessionID;
  if (sessionId && sessionUserMap.has(sessionId)) {
    const userId = sessionUserMap.get(sessionId);
    req.user = { id: userId };
    req.session.userId = userId; // Restore session data
    console.log(`✅ AuthGuard: User ${userId} authenticated via session mapping fallback`);
    next();
    return;
  }

  // Check localStorage fallback session ID
  const cookieHeader = req.headers.cookie || '';
  const sessionMatch = cookieHeader.match(/theagencyiq\.session=([^;]+)/);
  if (sessionMatch) {
    let cookieSessionId = sessionMatch[1];
    
    // Handle signed cookies
    if (cookieSessionId.startsWith('s%3A')) {
      const decoded = decodeURIComponent(cookieSessionId);
      cookieSessionId = decoded.substring(4).split('.')[0];
    }
    
    if (sessionUserMap.has(cookieSessionId)) {
      const userId = sessionUserMap.get(cookieSessionId);
      req.user = { id: userId };
      req.session.userId = userId;
      console.log(`✅ AuthGuard: User ${userId} authenticated via cookie fallback`);
      next();
      return;
    }
  }

  console.log(`❌ AuthGuard: Authentication failed - no valid session found`);
  res.status(401).json({ message: 'Unauthorized', redirectTo: '/login' });
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