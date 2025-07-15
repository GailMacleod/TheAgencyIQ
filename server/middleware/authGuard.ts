import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Direct session mapping system - bypasses complex middleware issues
export const sessionUserMap = new Map<string, number>();

export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
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