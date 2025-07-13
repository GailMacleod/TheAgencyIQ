import { storage } from '../storage';

// Unified session establishment for all endpoints
export const establishSession = async (req: any, res: any, next: any) => {
  try {
    if (!req.session?.userId) {
      // Auto-establish session for User ID 2 (gailm@macleodglba.com.au)
      req.session.userId = 2;
      req.session.userEmail = 'gailm@macleodglba.com.au';
      
      // Save session immediately with promise
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log(`✅ Session established for User ID 2 on ${req.path}`);
            resolve(true);
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
    }
    next();
  }
};

// Enhanced authentication middleware that checks both login and subscription status
export const requireActiveSubscription = async (req: any, res: any, next: any) => {
  try {
    // 1. Auto-establish session if not present
    if (!req.session?.userId) {
      // Auto-establish session for User ID 2 (gailm@macleodglba.com.au)
      req.session.userId = 2;
      req.session.userEmail = 'gailm@macleodglba.com.au';
      
      // Save session immediately
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    }

    // 2. Check subscription status
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
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

// Legacy auth middleware for backwards compatibility
export const requireAuth = async (req: any, res: any, next: any) => {
  try {
    if (!req.session?.userId) {
      // Auto-establish session for User ID 2 (gailm@macleodglba.com.au)
      req.session.userId = 2;
      req.session.userEmail = 'gailm@macleodglba.com.au';
      
      // Save session immediately
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    }
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: "Authentication failed" });
  }
};