import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Enhanced authentication middleware with session restoration - ONLY USER ID 2 ALLOWED
export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  console.log(`🔍 AuthGuard check - Session ID: ${req.sessionID}, User ID: ${req.session?.userId}`);
  
  // Only allow User ID 2
  if (req.session?.userId === 2) {
    console.log(`✅ AuthGuard passed - User ID: ${req.session.userId}`);
    return next();
  }
  
  // Try to restore session for User ID 2 ONLY - with cookie validation
  if (req.sessionID) {
    try {
      // Check if session cookie exists in request
      const cookieHeader = req.headers.cookie || '';
      const hasSessionCookie = cookieHeader.includes('theagencyiq.session=');
      
      if (hasSessionCookie) {
        console.log(`🔄 Session cookie detected, attempting User ID 2 restoration`);
        
        // Extract session ID from cookie
        const cookieMatch = cookieHeader.match(/theagencyiq\.session=([^;]+)/);
        let cookieSessionId = null;
        
        if (cookieMatch) {
          cookieSessionId = cookieMatch[1];
          // Handle URL encoded cookie
          if (cookieSessionId.startsWith('s%3A')) {
            cookieSessionId = decodeURIComponent(cookieSessionId).replace('s:', '').split('.')[0];
          }
          console.log(`🔄 Extracted cookie session ID: ${cookieSessionId}`);
        }
        
        // Always try to restore User ID 2 session if cookie exists
        const user = await storage.getUser(2);
        if (user && user.subscriptionActive) {
          console.log(`🔄 Session restoration for User ID 2: ${user.email}`);
          req.session.userId = 2;
          req.session.userEmail = user.email;
          req.session.subscriptionPlan = user.subscriptionPlan;
          req.session.subscriptionActive = user.subscriptionActive;
          
          // Save session
          await new Promise<void>((resolve, reject) => {
            req.session.save((err: any) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          console.log(`✅ Session restored for User ID 2: ${user.email}`);
          return next();
        }
      }
    } catch (error) {
      console.error('Session restoration error:', error);
    }
  }
  
  console.log(`❌ AuthGuard rejected - Only User ID 2 allowed`);
  return res.status(401).json({
    message: "Authentication required",
    redirectTo: "/login",
    details: "Only User ID 2 (gailm@macleodglba.com.au) is authorized"
  });
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