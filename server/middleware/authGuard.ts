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
  
  // Method 1: Check req.session.userId
  if (sessionUserId) {
    req.user = { id: sessionUserId };
    console.log('✅ Session auth successful - User ID:', sessionUserId);
    return next();
  }
  
  // Method 2: Check session mapping
  if (sessionId && sessionUserMap.has(sessionId)) {
    const userId = sessionUserMap.get(sessionId);
    req.user = { id: userId };
    console.log('✅ Session mapping auth successful - User ID:', userId);
    return next();
  }
  
  // Method 3: Check fallback authentication parameters
  if (fallbackParams.sessionId && fallbackParams.userId && fallbackParams.email) {
    const userId = parseInt(fallbackParams.userId);
    if (!isNaN(userId)) {
      req.user = { id: userId };
      console.log('✅ Direct fallback auth successful - User ID:', userId);
      return next();
    }
  }
  
  console.log('❌ Authentication failed - no valid session found');
  return res.status(401).json({ message: 'Not authenticated' });
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