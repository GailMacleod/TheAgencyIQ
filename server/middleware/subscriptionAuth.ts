import { storage } from '../storage';

// Enhanced authentication middleware that checks both login and subscription status
export const requireActiveSubscription = async (req: any, res: any, next: any) => {
  try {
    // 1. Check authentication (existing logic)
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // 2. Check subscription status
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // TESTER BYPASS: Allow full access for certificate-based testers
    // Check if user has redeemed any gift certificate (certificate-based testing)
    const hasRedeemedCertificate = await storage.hasUserRedeemedCertificate(user.userId);
    if (hasRedeemedCertificate) {
      return next(); // Full access for certificate testers
    }

    // Allow access if subscription is active (paying customers)
    if (user.subscriptionActive) {
      return next();
    }

    // Block access for non-subscribers without certificates
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
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};