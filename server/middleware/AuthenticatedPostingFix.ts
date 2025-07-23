import type { Request, Response, NextFunction } from "express";

// ✅ AUTHENTICATED POSTING FIX - ELIMINATES requireAuth2 REFERENCE ERROR
// This middleware fixes the server startup failure by providing proper authentication
// for the authenticated posting system, eliminating requireAuth2 dependency issues

export function authenticatedPostingAuth(req: any, res: Response, next: NextFunction) {
  // Check for valid session and user authentication
  if (!req.session || !req.session.userId) {
    console.log('❌ Authenticated posting blocked: No valid session');
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required for posting",
      redirectTo: "/login",
      error: "SESSION_REQUIRED"
    });
  }

  // Validate session integrity
  if (!req.session.lastActivity) {
    console.log('❌ Authenticated posting blocked: Invalid session format');
    return res.status(401).json({ 
      success: false, 
      message: "Session validation failed",
      error: "SESSION_INVALID"
    });
  }

  console.log(`✅ Authenticated posting authorized for user: ${req.session.userId}`);
  next();
}

// Export for authenticated posting routes
export const requireAuthenticatedPosting = authenticatedPostingAuth;

// ✅ QUOTA VALIDATION MIDDLEWARE
export function quotaValidationAuth(req: any, res: Response, next: NextFunction) {
  // Ensure authentication before quota checks
  if (!req.session?.userId) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required for quota validation",
      error: "AUTH_REQUIRED_FOR_QUOTA"
    });
  }

  next();
}

// ✅ COMPREHENSIVE AUTH STATUS CHECK
export function authStatusCheck(req: any, res: Response, next: NextFunction) {
  const authStatus = {
    authenticated: !!req.session?.userId,
    sessionId: req.sessionID,
    userId: req.session?.userId,
    lastActivity: req.session?.lastActivity
  };

  console.log('🔐 Auth status check:', authStatus);
  
  if (!authStatus.authenticated) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication verification failed",
      authStatus,
      error: "AUTH_VERIFICATION_FAILED"
    });
  }

  next();
}