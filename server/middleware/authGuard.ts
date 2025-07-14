import { Request, Response, NextFunction } from 'express';

// Strict authentication middleware - NO AUTO-ESTABLISHMENT
export const requireAuth = (req: any, res: Response, next: NextFunction) => {
  console.log(`🔍 AuthGuard check - Session ID: ${req.sessionID}, User ID: ${req.session?.userId}`);
  
  if (!req.session?.userId) {
    console.log(`❌ AuthGuard rejected - No session or userId`);
    return res.status(401).json({
      message: "Authentication required",
      redirectTo: "/login",
      details: "Please login to access this feature"
    });
  }
  
  console.log(`✅ AuthGuard passed - User ID: ${req.session.userId}`);
  next();
};

// Payment endpoint authentication - CRITICAL SECURITY
export const requireAuthForPayment = (req: any, res: Response, next: NextFunction) => {
  console.log(`🔍 Payment AuthGuard check - Session ID: ${req.sessionID}, User ID: ${req.session?.userId}`);
  
  if (!req.session?.userId) {
    console.log('🚨 SECURITY ALERT: Payment attempt without authentication');
    return res.status(401).json({
      message: "Authentication required for payment",
      redirectTo: "/login",
      details: "You must be logged in to create a subscription"
    });
  }
  console.log('✅ Payment authentication verified for user ID:', req.session.userId);
  next();
};