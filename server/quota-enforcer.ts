/**
 * Post Quota Enforcement System
 * Ensures strict adherence to subscription limits and prevents post count inflation
 */

import { storage } from './storage';
import type { User, Post } from '@shared/schema';

interface QuotaLimits {
  starter: number;
  growth: number;
  professional: number;
}

const QUOTA_LIMITS: QuotaLimits = {
  starter: 12,
  growth: 27,
  professional: 52
};

export class QuotaEnforcer {
  /**
   * Enforces strict quota limits before post generation
   */
  static async enforceQuotaBeforeGeneration(userId: number): Promise<{
    allowed: boolean;
    quota: number;
    current: number;
    remaining: number;
    plan: string;
  }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const plan = user.subscriptionPlan?.toLowerCase() || 'professional';
    const quota = QUOTA_LIMITS[plan as keyof QuotaLimits] || 52;

    // Get all posts for user
    const allPosts = await storage.getPostsByUser(userId);
    
    // Count successful posts in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const successfulPosts = allPosts.filter(p => 
      p.status === 'success' && 
      p.publishedAt && 
      new Date(p.publishedAt) > thirtyDaysAgo
    );

    const remaining = Math.max(0, quota - successfulPosts.length);

    return {
      allowed: remaining > 0,
      quota,
      current: successfulPosts.length,
      remaining,
      plan: user.subscriptionPlan || 'Professional'
    };
  }

  /**
   * Cleans up excess posts beyond quota limits
   */
  static async cleanupExcessPosts(userId: number): Promise<{
    removed: number;
    kept: number;
  }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const plan = user.subscriptionPlan?.toLowerCase() || 'professional';
    const quota = QUOTA_LIMITS[plan as keyof QuotaLimits] || 52;

    const allPosts = await storage.getPostsByUser(userId);
    
    // Keep successful posts (they count toward quota)
    const successfulPosts = allPosts.filter(p => p.status === 'success');
    
    // Remove excess non-successful posts
    const nonSuccessfulPosts = allPosts.filter(p => p.status !== 'success');
    const totalAllowed = quota;
    const excessPosts = Math.max(0, allPosts.length - totalAllowed);
    
    let removedCount = 0;
    
    // Remove non-successful posts first
    for (const post of nonSuccessfulPosts.slice(0, excessPosts)) {
      await storage.deletePost(post.id);
      removedCount++;
    }

    const remainingPosts = await storage.getPostsByUser(userId);
    
    console.log(`[QUOTA-ENFORCER] User ${userId} (${plan}): Removed ${removedCount} excess posts, ${remainingPosts.length} posts remaining`);

    return {
      removed: removedCount,
      kept: remainingPosts.length
    };
  }

  /**
   * Validates post status transitions to prevent false successes
   */
  static async validateStatusTransition(postId: number, newStatus: string): Promise<boolean> {
    const post = await storage.getPost(postId);
    if (!post) {
      return false;
    }

    // Prevent false success status
    if (newStatus === 'success' && !post.publishedAt) {
      console.log(`[QUOTA-ENFORCER] Blocked invalid success status for post ${postId} - no publishedAt timestamp`);
      return false;
    }

    // Only allow valid status transitions
    const validTransitions = {
      'draft': ['pending', 'approved'],
      'pending': ['approved', 'failed'],
      'approved': ['published', 'failed'],
      'published': ['success', 'failed'],
      'failed': ['pending', 'draft'],
      'success': [] // Final state
    };

    const allowedNext = validTransitions[post.status as keyof typeof validTransitions] || [];
    return allowedNext.includes(newStatus as any);
  }
}