import { storage } from '../storage';
import { sessionAuthMiddleware } from './session-auth.js';

// Enhanced session establishment with proper authentication security
export const establishSession = async (req: any, res: any, next: any) => {
  try {
    // SECURITY FIX: Validate existing session instead of auto-establishing
    const userSession = sessionAuthMiddleware.extractUserFromSession(req);
    
    if (!userSession) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'SESSION_REQUIRED',
        message: 'Valid authenticated session required. Please establish session first.',
        timestamp: new Date().toISOString()
      });
    }

    // Update session activity for validated sessions
    sessionAuthMiddleware.updateSessionActivity(req);
    
    console.log(`✅ Validated session for user ${userSession.email} on ${req.path}`);
    next();
    
  } catch (error) {
    console.error('Session establishment error:', error);
    return res.status(500).json({ 
      error: 'Session validation failed',
      message: error.message 
    });
  }
};

// Enhanced authentication middleware that checks both login and subscription status
export const requireActiveSubscription = async (req: any, res: any, next: any) => {
  try {
    // 1. Validate authenticated session (no auto-establishment)
    const userSession = sessionAuthMiddleware.extractUserFromSession(req);
    
    if (!userSession) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'SESSION_REQUIRED',
        message: 'Valid authenticated session required. Please establish session first.'
      });
    }

    // 2. Check subscription status with actual user data
    const user = await storage.getUser(userSession.userId);
    if (!user) {
      return res.status(401).json({ 
        message: "User not found",
        code: 'USER_NOT_FOUND'
      });
    }

    // 3. Update session activity
    sessionAuthMiddleware.updateSessionActivity(req);

    // Allow access if subscription is active OR user has a valid subscription plan
    if (user.subscriptionActive === true || 
        (user.subscriptionPlan && user.subscriptionPlan !== 'none' && user.subscriptionPlan !== '')) {
      return next();
    }

    // Block access for inactive subscriptions
    return res.status(403).json({ 
      message: "Subscription required", 
      redirectTo: "/subscription",
      code: 'SUBSCRIPTION_REQUIRED',
      details: "Complete your subscription or redeem a certificate to access the platform"
    });

  } catch (error) {
    console.error('Subscription auth error:', error);
    return res.status(500).json({ 
      message: "Authorization check failed",
      code: 'AUTHORIZATION_ERROR'
    });
  }
};

// Secure authentication middleware with session validation
export const requireAuth = async (req: any, res: any, next: any) => {
  try {
    // SECURITY FIX: Use session authentication middleware instead of auto-establishment
    const userSession = sessionAuthMiddleware.extractUserFromSession(req);
    
    if (!userSession) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'SESSION_REQUIRED',
        message: 'Valid authenticated session required. Please establish session first.'
      });
    }

    // Update session activity for authenticated users
    sessionAuthMiddleware.updateSessionActivity(req);
    
    // Attach user info to request for downstream middleware
    req.authenticatedUser = userSession;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      message: "Authentication failed",
      code: 'AUTHENTICATION_ERROR'
    });
  }
};

// Environment-based session establishment for scripts (replaces hardcoded user ID)
export const establishScriptSession = () => {
  try {
    return sessionAuthMiddleware.establishSessionFromEnv();
  } catch (error) {
    console.error('Script session establishment failed:', error);
    throw new Error(`Script authentication failed: ${error.message}`);
  }
};

// Session validation helper for API endpoints
export const validateSessionIntegrity = (req: any) => {
  return sessionAuthMiddleware.validateSessionIntegrity(req);
};