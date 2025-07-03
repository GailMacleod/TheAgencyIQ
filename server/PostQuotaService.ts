/**
 * CENTRALIZED POST QUOTA SERVICE
 * Single source of truth for all post counting and quota management
 * Eliminates fragmented systems causing post count doubling
 */

import { storage } from './storage';
import { db } from './db';
import { users, posts } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface QuotaStatus {
  userId: number;
  remainingPosts: number;
  totalPosts: number;
  subscriptionPlan: string;
  subscriptionActive: boolean;
}

interface PostCountSummary {
  approved: number;
  draft: number;
  published: number;
  failed: number;
  total: number;
}

export class PostQuotaService {
  
  /**
   * PLAN QUOTAS - Single source of truth
   */
  private static readonly PLAN_QUOTAS = {
    'starter': 12,
    'growth': 27, 
    'professional': 52
  };

  /**
   * Get current quota status for a user
   */
  static async getQuotaStatus(userId: number): Promise<QuotaStatus | null> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return null;

      return {
        userId: user.id,
        remainingPosts: user.remainingPosts || 0,
        totalPosts: user.totalPosts || 0,
        subscriptionPlan: user.subscriptionPlan || 'starter',
        subscriptionActive: user.subscriptionActive || false
      };
    } catch (error) {
      console.error('Error getting quota status:', error);
      return null;
    }
  }

  /**
   * Initialize quota for new user based on plan
   */
  static async initializeQuota(userId: number, plan: string): Promise<boolean> {
    try {
      const quota = this.PLAN_QUOTAS[plan as keyof typeof this.PLAN_QUOTAS] || this.PLAN_QUOTAS.starter;
      
      await db.update(users)
        .set({
          remainingPosts: quota,
          totalPosts: quota,
          subscriptionPlan: plan,
          subscriptionActive: true
        })
        .where(eq(users.id, userId));

      console.log(`✅ Quota initialized for user ${userId}: ${quota} posts (${plan} plan)`);
      return true;
    } catch (error) {
      console.error('Error initializing quota:', error);
      return false;
    }
  }

  /**
   * Deduct one post from user's quota - SINGLE DEDUCTION POINT
   */
  static async deductPost(userId: number, postId: number): Promise<boolean> {
    try {
      const status = await this.getQuotaStatus(userId);
      if (!status) {
        console.error(`Cannot deduct post: user ${userId} not found`);
        return false;
      }

      if (status.remainingPosts <= 0) {
        console.error(`Cannot deduct post: user ${userId} has no remaining posts`);
        return false;
      }

      // Single atomic deduction
      const result = await db.update(users)
        .set({
          remainingPosts: sql`${users.remainingPosts} - 1`
        })
        .where(
          and(
            eq(users.id, userId),
            sql`${users.remainingPosts} > 0`
          )
        );

      console.log(`📉 Post deducted for user ${userId}. Remaining: ${status.remainingPosts - 1}`);
      return true;
    } catch (error) {
      console.error('Error deducting post:', error);
      return false;
    }
  }

  /**
   * Get actual post counts from database
   */
  static async getPostCounts(userId: number): Promise<PostCountSummary> {
    try {
      const userPosts = await storage.getPostsByUser(userId);
      
      const summary: PostCountSummary = {
        approved: userPosts.filter(p => p.status === 'approved').length,
        draft: userPosts.filter(p => p.status === 'draft').length,
        published: userPosts.filter(p => p.status === 'published').length,
        failed: userPosts.filter(p => p.status === 'failed').length,
        total: userPosts.length
      };

      return summary;
    } catch (error) {
      console.error('Error getting post counts:', error);
      return { approved: 0, draft: 0, published: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Check if user has posts remaining
   */
  static async hasPostsRemaining(userId: number): Promise<boolean> {
    const status = await this.getQuotaStatus(userId);
    return status ? status.remainingPosts > 0 && status.subscriptionActive : false;
  }

  /**
   * Upgrade user's plan and adjust quota
   */
  static async upgradePlan(userId: number, newPlan: string): Promise<boolean> {
    try {
      const newQuota = this.PLAN_QUOTAS[newPlan as keyof typeof this.PLAN_QUOTAS];
      if (!newQuota) {
        console.error(`Invalid plan: ${newPlan}`);
        return false;
      }

      const currentStatus = await this.getQuotaStatus(userId);
      if (!currentStatus) return false;

      // Add the difference to remaining posts
      const quotaDifference = newQuota - (currentStatus.totalPosts || 0);
      const newRemaining = Math.max(0, currentStatus.remainingPosts + quotaDifference);

      await db.update(users)
        .set({
          subscriptionPlan: newPlan,
          totalPosts: newQuota,
          remainingPosts: newRemaining
        })
        .where(eq(users.id, userId));

      console.log(`✅ Plan upgraded for user ${userId}: ${newPlan} (${newQuota} total posts)`);
      return true;
    } catch (error) {
      console.error('Error upgrading plan:', error);
      return false;
    }
  }

  /**
   * Reset quota to plan default (admin function)
   */
  static async resetQuota(userId: number): Promise<boolean> {
    try {
      const status = await this.getQuotaStatus(userId);
      if (!status) return false;

      const defaultQuota = this.PLAN_QUOTAS[status.subscriptionPlan as keyof typeof this.PLAN_QUOTAS] || this.PLAN_QUOTAS.starter;

      await db.update(users)
        .set({
          remainingPosts: defaultQuota,
          totalPosts: defaultQuota
        })
        .where(eq(users.id, userId));

      console.log(`🔄 Quota reset for user ${userId}: ${defaultQuota} posts`);
      return true;
    } catch (error) {
      console.error('Error resetting quota:', error);
      return false;
    }
  }

  /**
   * Validate quota integrity
   */
  static async validateQuota(userId: number): Promise<{ valid: boolean; issues: string[] }> {
    try {
      const status = await this.getQuotaStatus(userId);
      const issues: string[] = [];

      if (!status) {
        return { valid: false, issues: ['User not found'] };
      }

      // Check for negative values
      if (status.remainingPosts < 0) {
        issues.push(`Negative remaining posts: ${status.remainingPosts}`);
      }

      // Check for over-allocation
      if (status.remainingPosts > status.totalPosts) {
        issues.push(`Remaining posts (${status.remainingPosts}) exceeds total (${status.totalPosts})`);
      }

      // Check plan consistency
      const expectedQuota = this.PLAN_QUOTAS[status.subscriptionPlan as keyof typeof this.PLAN_QUOTAS];
      if (expectedQuota && status.totalPosts !== expectedQuota) {
        issues.push(`Total posts (${status.totalPosts}) doesn't match plan quota (${expectedQuota})`);
      }

      return { valid: issues.length === 0, issues };
    } catch (error) {
      console.error('Error validating quota:', error);
      return { valid: false, issues: ['Validation error'] };
    }
  }
}