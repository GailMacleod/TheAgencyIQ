import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Direct session mapping system - bypasses complex middleware issues
export const sessionUserMap = new Map<string, number>();

export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  const sessionId = req.sessionID;
  const sessionUserId = req.session?.userId;
  
  // Check fallback authentication parameters from query string
  const fallbackParams = {
    sessionId: req.query.fallback_session_id as string,
    userId: req.query.fallback_user_id as string,
    email: req.query.fallback_user_email as string
  };
  
  console.log('🔍 AuthGuard - checking authentication:', {
    sessionId,
    sessionUserId,
    mappedSessions: Array.from(sessionUserMap.entries()),
    fallbackParams
  });
  
  if (req.session.userId) {
    req.user = { id: req.session.userId };
    return next();
  } else {
    return res.status(401).json({ message: 'Not authenticated', redirectTo: '/login' });
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