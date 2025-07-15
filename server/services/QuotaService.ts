import { storage } from '../storage';
import { SUBSCRIPTION_PLANS } from '../stripe/subscription';

export class QuotaService {
  
  /**
   * Reset user quota to full amount based on their subscription plan
   */
  async resetUserQuota(userId: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === user.subscriptionPlan);
    if (!plan) {
      throw new Error('Invalid subscription plan');
    }

    await storage.updateUser(userId, {
      remainingPosts: plan.posts,
      totalPosts: plan.posts
    });

    console.log(`✅ Quota reset for user ${userId}: ${plan.posts} posts available`);
  }

  /**
   * Deduct quota when a post is successfully published
   */
  async deductQuota(userId: number, amount: number = 1): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.remainingPosts < amount) {
      throw new Error('Insufficient quota remaining');
    }

    await storage.updateUser(userId, {
      remainingPosts: user.remainingPosts - amount
    });

    console.log(`✅ Quota deducted for user ${userId}: ${amount} posts, ${user.remainingPosts - amount} remaining`);
    return true;
  }

  /**
   * Get user quota information
   */
  async getUserQuota(userId: number): Promise<{
    total: number;
    remaining: number;
    used: number;
    plan: string;
  }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      total: user.totalPosts || 0,
      remaining: user.remainingPosts || 0,
      used: (user.totalPosts || 0) - (user.remainingPosts || 0),
      plan: user.subscriptionPlan || 'free'
    };
  }

  /**
   * Check if user has sufficient quota for posting
   */
  async hasQuota(userId: number, amount: number = 1): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) {
      return false;
    }

    return (user.remainingPosts || 0) >= amount;
  }

  /**
   * Initialize quota for new subscribers
   */
  async initializeQuota(userId: number, planId: string): Promise<void> {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Invalid subscription plan');
    }

    await storage.updateUser(userId, {
      subscriptionPlan: planId,
      subscriptionActive: true,
      remainingPosts: plan.posts,
      totalPosts: plan.posts
    });

    console.log(`✅ Quota initialized for user ${userId}: ${plan.posts} posts for ${planId} plan`);
  }

  /**
   * Monthly quota reset (called by cron job)
   */
  async monthlyQuotaReset(): Promise<void> {
    const users = await storage.getAllUsers();
    
    for (const user of users) {
      if (user.subscriptionActive && user.subscriptionPlan) {
        const plan = SUBSCRIPTION_PLANS.find(p => p.id === user.subscriptionPlan);
        if (plan) {
          await storage.updateUser(user.id, {
            remainingPosts: plan.posts,
            totalPosts: plan.posts
          });
          console.log(`✅ Monthly quota reset for user ${user.id}: ${plan.posts} posts`);
        }
      }
    }
  }
}

export const quotaService = new QuotaService();