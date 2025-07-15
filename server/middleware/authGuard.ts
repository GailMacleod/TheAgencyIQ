import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Direct session mapping system - bypasses complex middleware issues
export const sessionUserMap = new Map<string, number>();

export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  console.log(`🔍 AuthGuard check - Session ID: ${req.sessionID}, User ID: ${req.session?.userId}`);
  
  // Check if session already has user ID
  if (req.session?.userId) {
    console.log(`✅ AuthGuard passed - User ID: ${req.session.userId}`);
    return next();
  }
  
  // SECURITY: Block all other unauthorized headers and fake tokens
  const userIdHeader = req.headers['x-user-id'];
  const authTokenHeader = req.headers['x-auth-token'];
  
  if (userIdHeader) {
    console.log(`🚨 SECURITY ALERT: Direct user ID header blocked: ${userIdHeader}`);
    return res.status(401).json({
      message: "Not authenticated",
      redirectTo: "/login"
    });
  }
  
  if (authTokenHeader) {
    console.log(`🚨 SECURITY ALERT: Unauthorized auth token blocked: ${authTokenHeader}`);
    return res.status(401).json({
      message: "Not authenticated",
      redirectTo: "/login"
    });
  }
  
  // Check if session already has user ID
  if (req.session?.userId) {
    console.log(`✅ AuthGuard passed - User ID: ${req.session.userId}`);
    return next();
  }
  
  // Check session mapping
  const mappedUserId = sessionUserMap.get(req.sessionID);
  if (mappedUserId) {
    console.log(`🔄 Restoring session mapping for User ID: ${mappedUserId}`);
    req.session.userId = mappedUserId;
    const user = await storage.getUser(mappedUserId);
    if (user) {
      req.session.userEmail = user.email;
      req.session.subscriptionPlan = user.subscriptionPlan;
      req.session.subscriptionActive = user.subscriptionActive;
      
      // Save session
      await new Promise<void>((resolve) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save error:', err);
          } else {
            console.log(`✅ Session restored for User ID: ${mappedUserId}`);
          }
          resolve();
        });
      });
      
      return next();
    }
  }
  
  // CRITICAL: Check for session mapping by cookie session ID (both signed and unsigned)
  const cookieHeader = req.headers.cookie || '';
  
  // First try signed cookies (s%3A format)
  let sessionCookieMatch = cookieHeader.match(/theagencyiq\.session=s%3A([^;.]+)/);
  let cookieSessionId = null;
  
  if (sessionCookieMatch) {
    cookieSessionId = sessionCookieMatch[1];
    console.log(`🔍 Found SIGNED session cookie: ${cookieSessionId}`);
  } else {
    // Try unsigned cookies
    sessionCookieMatch = cookieHeader.match(/theagencyiq\.session=([^;]+)/);
    if (sessionCookieMatch) {
      cookieSessionId = sessionCookieMatch[1];
      console.log(`🔍 Found UNSIGNED session cookie: ${cookieSessionId}`);
    }
  }
  
  if (cookieSessionId) {
    // Check if this session ID has a mapping
    const cookieMappedUserId = sessionUserMap.get(cookieSessionId);
    if (cookieMappedUserId) {
      console.log(`🔄 Using cookie session mapping for User ID: ${cookieMappedUserId}`);
      req.session.userId = cookieMappedUserId;
      const user = await storage.getUser(cookieMappedUserId);
      if (user) {
        req.session.userEmail = user.email;
        req.session.subscriptionPlan = user.subscriptionPlan;
        req.session.subscriptionActive = user.subscriptionActive;
        
        // Also map current session ID
        sessionUserMap.set(req.sessionID, cookieMappedUserId);
        
        // Save session
        await new Promise<void>((resolve) => {
          req.session.save((err: any) => {
            if (err) {
              console.error('Session save error:', err);
            } else {
              console.log(`✅ Session restored from cookie for User ID: ${cookieMappedUserId}`);
            }
            resolve();
          });
        });
        
        return next();
      }
    }
    
    // CRITICAL: If no mapping found, check if this session ID already exists in session store
    // This handles cases where the session exists but mapping was lost
    if (cookieSessionId === req.sessionID) {
      // Session IDs match, check if session store has user data
      console.log(`🔍 Session ID matches, checking session store for User ID`);
      
      // Try to get session data from store
      const sessionStore = req.sessionStore;
      await new Promise<void>((resolve) => {
        sessionStore.get(cookieSessionId, (err: any, sessionData: any) => {
          if (!err && sessionData && sessionData.userId) {
            console.log(`🔄 Found session data in store for User ID: ${sessionData.userId}`);
            req.session.userId = sessionData.userId;
            req.session.userEmail = sessionData.userEmail;
            req.session.subscriptionPlan = sessionData.subscriptionPlan;
            req.session.subscriptionActive = sessionData.subscriptionActive;
            
            // Update mapping
            sessionUserMap.set(cookieSessionId, sessionData.userId);
            console.log(`✅ Session mapping restored for User ID: ${sessionData.userId}`);
          }
          resolve();
        });
      });
      
      if (req.session.userId) {
        return next();
      }
    }
  }
  
  // This section is already handled above in the cookie parsing section
  
  // SECURITY: Only allow authenticated sessions - no automatic establishment
  // Remove default session establishment to enforce strict authentication
  
  console.log(`❌ AuthGuard rejected - No authenticated session found`);
  return res.status(401).json({
    message: "Not authenticated",
    redirectTo: "/login"
  });
};

// Export the session mapping for use in session establishment
export const setSessionMapping = (sessionId: string, userId: number) => {
  sessionUserMap.set(sessionId, userId);
  console.log(`📝 Session mapping set: ${sessionId} -> User ID ${userId}`);
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