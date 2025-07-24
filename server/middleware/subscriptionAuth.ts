import { storage } from '../storage';

// Enhanced session establishment with regeneration security
export const establishSession = async (req: any, res: any, next: any) => {
  try {
    if (!req.session?.userId) {
      // Session regeneration for security (prevents session fixation attacks)
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err: any) => {
          if (err) {
            console.error('Session regeneration error:', err);
            // Continue without regeneration if it fails
            resolve();
          } else {
            console.log('🔐 Session regenerated for security');
            resolve();
          }
        });
      });

      // Auto-establish session for User ID 2 (gailm@macleodglba.com.au)
      req.session.userId = 2;
      req.session.userEmail = 'gailm@macleodglba.com.au';
      req.session.lastActivity = Date.now();
      
      // Save session immediately with promise
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log(`✅ Auto-established session for user gailm@macleodglba.com.au on ${req.path}`);
            resolve();
          }
        });
      });
    }
    next();
  } catch (error) {
    console.error('Session establishment error:', error);
    // Still establish session in memory even if save fails
    if (!req.session?.userId) {
      req.session.userId = 2;
      req.session.userEmail = 'gailm@macleodglba.com.au';
      req.session.lastActivity = Date.now();
    }
    next();
  }
};

// Enhanced authentication middleware that checks both login and subscription status
export const requireActiveSubscription = async (req: any, res: any, next: any) => {
  try {
    // 1. Check authentication first
    if (!req.session?.userId) {
      return res.status(401).json({ 
        message: "Authentication required - please log in",
        requiresLogin: true 
      });
    }

    // 2. Check subscription status
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Allow access if subscription is active OR user has a valid subscription plan
    if (user.subscriptionActive === true || 
        (user.subscriptionPlan && user.subscriptionPlan !== 'none' && user.subscriptionPlan !== '')) {
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

// Legacy auth middleware for backwards compatibility
export const requireAuth = async (req: any, res: any, next: any) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ 
        message: "Authentication required - please log in",
        requiresLogin: true 
      });
    }
    
    // Verify user exists in database
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ 
        message: "Invalid session - please log in again",
        requiresLogin: true 
      });
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: "Authentication failed" });
  }
};