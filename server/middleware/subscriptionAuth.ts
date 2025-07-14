import { storage } from '../storage';

// Manual session establishment endpoint - only creates sessions when explicitly called
export const establishSession = async (req: any, res: any, next: any) => {
  // This should only be called from /api/establish-session endpoint
  // Never auto-establishes sessions
  console.log('Session establishment middleware called - this should only happen for manual login');
  next();
};

// Enhanced authentication middleware that checks both login and subscription status
export const requireActiveSubscription = async (req: any, res: any, next: any) => {
  try {
    // 1. Require valid user session - NO AUTO-ESTABLISHMENT
    if (!req.session?.userId) {
      return res.status(401).json({ 
        message: "Authentication required", 
        redirectTo: "/login",
        details: "Please login to access this feature"
      });
    }

    // 2. Check subscription status
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      // Clear invalid session
      req.session.destroy((err: any) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ message: "Invalid session. Please login again." });
    }

    // Allow access if subscription is active OR user has a valid subscription plan
    if (user.subscriptionActive === true || user.subscription_active === true || 
        (user.subscriptionPlan && user.subscriptionPlan !== 'none' && user.subscriptionPlan !== '') ||
        (user.subscription_plan && user.subscription_plan !== 'none' && user.subscription_plan !== '')) {
      return next();
    }

    // Block access for inactive subscriptions
    return res.status(403).json({ 
      message: "Subscription required", 
      redirectTo: "/subscription",
      details: "Complete your subscription or redeem a certificate to access the platform"
    });

  } catch (error) {
    console.error('Subscription auth error:', error);
    return res.status(500).json({ message: "Authorization check failed" });
  }
};

// Strict authentication middleware - NEVER auto-establishes sessions
export const requireAuth = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required. Please login first." });
  }
  
  try {
    // Verify user exists in database
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      // Clear invalid session
      req.session.destroy((err: any) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ message: "Invalid user session. Please login again." });
    }
    
    // Refresh session
    req.session.touch();
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: "Authentication error" });
  }
};