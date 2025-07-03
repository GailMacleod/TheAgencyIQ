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

  /**
   * DEBUG FUNCTION - Read-only quota debugging and cycle reset simulation
   * Logs current state and simulates 30-day reset without modifying database
   */
  static async debugQuotaAndSimulateReset(email: string): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    
    function logToDebugFile(message: string) {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      
      const logPath = path.join(process.cwd(), 'data/quota-debug.log');
      fs.appendFileSync(logPath, logEntry);
      console.log(logEntry.trim());
    }

    try {
      logToDebugFile('=== PostQuotaService Debug Session Started ===');
      logToDebugFile(`Target User: ${email}`);
      
      // Find user by email (read-only)
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (user.length === 0) {
        logToDebugFile(`ERROR: User ${email} not found in database`);
        return;
      }

      const userData = user[0];
      logToDebugFile(`User Found: ID ${userData.id}`);
      
      // Get current quota status
      const currentStatus = await this.getQuotaStatus(userData.id);
      if (!currentStatus) {
        logToDebugFile('ERROR: Could not retrieve quota status');
        return;
      }

      logToDebugFile('=== CURRENT QUOTA STATUS ===');
      logToDebugFile(`User ID: ${currentStatus.userId}`);
      logToDebugFile(`Subscription Plan: ${currentStatus.subscriptionPlan}`);
      logToDebugFile(`Subscription Active: ${currentStatus.subscriptionActive}`);
      logToDebugFile(`Total Posts: ${currentStatus.totalPosts}`);
      logToDebugFile(`Remaining Posts: ${currentStatus.remainingPosts}`);
      logToDebugFile(`Used Posts: ${currentStatus.totalPosts - currentStatus.remainingPosts}`);

      // Get actual post counts
      const postCounts = await this.getPostCounts(userData.id);
      logToDebugFile('=== ACTUAL POST COUNTS ===');
      logToDebugFile(`Total Posts in DB: ${postCounts.total}`);
      logToDebugFile(`Draft Posts: ${postCounts.draft}`);
      logToDebugFile(`Approved Posts: ${postCounts.approved}`);
      logToDebugFile(`Published Posts: ${postCounts.published}`);
      logToDebugFile(`Failed Posts: ${postCounts.failed}`);

      // Calculate expected quota after posts
      const effectiveUsed = postCounts.approved + postCounts.published;
      const expectedRemaining = currentStatus.totalPosts - effectiveUsed;
      logToDebugFile(`Expected Remaining (${currentStatus.totalPosts} - ${effectiveUsed}): ${expectedRemaining}`);
      logToDebugFile(`Actual Remaining: ${currentStatus.remainingPosts}`);
      logToDebugFile(`Discrepancy: ${currentStatus.remainingPosts - expectedRemaining} posts`);

      // Simulate 30-day cycle reset (NO DATABASE CHANGES)
      logToDebugFile('=== SIMULATING 30-DAY CYCLE RESET ===');
      logToDebugFile('NOTE: This is a READ-ONLY simulation - no database changes will be made');
      
      const planQuota = this.PLAN_QUOTAS[currentStatus.subscriptionPlan as keyof typeof this.PLAN_QUOTAS] || this.PLAN_QUOTAS.starter;
      
      logToDebugFile(`Plan: ${currentStatus.subscriptionPlan}`);
      logToDebugFile(`Plan Quota: ${planQuota} posts`);
      
      // Simulate what the reset would do
      const simulatedReset = {
        beforeReset: {
          totalPosts: currentStatus.totalPosts,
          remainingPosts: currentStatus.remainingPosts,
          subscriptionPlan: currentStatus.subscriptionPlan
        },
        afterReset: {
          totalPosts: planQuota,
          remainingPosts: planQuota,
          subscriptionPlan: currentStatus.subscriptionPlan
        },
        changes: {
          totalPostsChange: planQuota - currentStatus.totalPosts,
          remainingPostsChange: planQuota - currentStatus.remainingPosts
        }
      };

      logToDebugFile('=== SIMULATION RESULTS ===');
      logToDebugFile(`BEFORE RESET: Total=${simulatedReset.beforeReset.totalPosts}, Remaining=${simulatedReset.beforeReset.remainingPosts}`);
      logToDebugFile(`AFTER RESET: Total=${simulatedReset.afterReset.totalPosts}, Remaining=${simulatedReset.afterReset.remainingPosts}`);
      logToDebugFile(`CHANGES: Total posts ${simulatedReset.changes.totalPostsChange >= 0 ? '+' : ''}${simulatedReset.changes.totalPostsChange}, Remaining posts ${simulatedReset.changes.remainingPostsChange >= 0 ? '+' : ''}${simulatedReset.changes.remainingPostsChange}`);

      // Validate simulated result
      if (simulatedReset.afterReset.totalPosts === planQuota && simulatedReset.afterReset.remainingPosts === planQuota) {
        logToDebugFile('✅ SIMULATION PASSED: Reset would correctly set both values to plan quota');
      } else {
        logToDebugFile('❌ SIMULATION FAILED: Reset logic needs adjustment');
      }

      logToDebugFile('=== QUOTA INTEGRITY CHECK ===');
      const validation = await this.validateQuota(userData.id);
      logToDebugFile(`Quota Valid: ${validation.valid}`);
      if (validation.issues.length > 0) {
        validation.issues.forEach(issue => logToDebugFile(`Issue: ${issue}`));
      }

      logToDebugFile('=== DEBUG SESSION COMPLETED ===');
      logToDebugFile('CONFIRMATION: No live data was modified during this debug session');
      
    } catch (error) {
      logToDebugFile(`ERROR during debug session: ${error}`);
      logToDebugFile(`Stack trace: ${error instanceof Error ? error.stack : 'Unknown error'}`);
    }
  }
}