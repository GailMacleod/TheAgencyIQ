/**
 * PLATFORM POST MANAGER SERVICE
 * Handles post ID tracking, quota deduction integration, and rollback capabilities
 * Ensures quota is only deducted for successful publications
 */

import { db } from "../db";
import { posts, postLedger, users } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storage } from "../storage";
import { loggingService } from "./logging-service";

export interface PlatformPostResult {
  success: boolean;
  platformPostId?: string;
  platform: string;
  postId: number;
  error?: string;
  quotaDeducted: boolean;
}

export interface QuotaTransaction {
  userId: number;
  postId: number;
  platform: string;
  quotaUsed: number;
  quotaRemaining: number;
  rollbackRequired: boolean;
}

class PlatformPostManager {
  private quotaTransactions: Map<string, QuotaTransaction> = new Map();

  /**
   * Record platform post ID and handle quota deduction
   */
  async recordPlatformPost(
    userId: number,
    postId: number,
    platform: string,
    platformPostId: string,
    sessionId?: string
  ): Promise<PlatformPostResult> {
    try {
      // Get user's current quota
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has enough quota
      if (user.remainingPosts <= 0) {
        await loggingService.logQuotaManagement({
          userId,
          userEmail: user.email,
          sessionId,
          postId,
          platform,
          quotaUsed: 0,
          quotaRemaining: user.remainingPosts,
          action: 'quota_check_failed'
        }, false, 'Insufficient quota');

        return {
          success: false,
          platform,
          postId,
          error: 'Insufficient quota',
          quotaDeducted: false
        };
      }

      // Record the platform post ID in database
      await storage.updatePostPlatformId(postId, platformPostId, true);

      // Deduct quota only after successful platform post
      const updatedUser = await storage.updateQuotaUsage(userId, 1);

      // Create quota transaction for potential rollback
      const transactionKey = `${userId}-${postId}-${platform}`;
      this.quotaTransactions.set(transactionKey, {
        userId,
        postId,
        platform,
        quotaUsed: 1,
        quotaRemaining: updatedUser.remainingPosts,
        rollbackRequired: false
      });

      // Log successful quota deduction
      await loggingService.logQuotaManagement({
        userId,
        userEmail: user.email,
        sessionId,
        postId,
        platform,
        quotaUsed: 1,
        quotaRemaining: updatedUser.remainingPosts,
        action: 'deduct'
      }, true);

      // Log successful platform publishing
      await loggingService.logPlatformPublishing({
        userId,
        userEmail: user.email,
        sessionId,
        postId,
        platform,
        platformPostId,
        quotaUsed: 1,
        quotaRemaining: updatedUser.remainingPosts
      }, true);

      return {
        success: true,
        platformPostId,
        platform,
        postId,
        quotaDeducted: true
      };

    } catch (error) {
      await loggingService.logPlatformPublishing({
        userId,
        sessionId,
        postId,
        platform,
        platformPostId
      }, false, error.message);

      return {
        success: false,
        platform,
        postId,
        error: error.message,
        quotaDeducted: false
      };
    }
  }

  /**
   * Rollback quota if platform posting fails
   */
  async rollbackQuotaOnFailure(
    userId: number,
    postId: number,
    platform: string,
    error: string,
    sessionId?: string
  ): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const transactionKey = `${userId}-${postId}-${platform}`;
      const transaction = this.quotaTransactions.get(transactionKey);

      if (transaction && !transaction.rollbackRequired) {
        // Rollback the quota deduction
        const rollbackQuota = transaction.quotaUsed;
        await storage.updateQuotaUsage(userId, -rollbackQuota);

        // Mark post as failed
        await storage.updatePostPlatformId(postId, '', false);

        // Update transaction to prevent double rollback
        transaction.rollbackRequired = true;
        this.quotaTransactions.set(transactionKey, transaction);

        // Log rollback
        await loggingService.logQuotaManagement({
          userId,
          userEmail: user.email,
          sessionId,
          postId,
          platform,
          quotaUsed: -rollbackQuota,
          quotaRemaining: user.remainingPosts + rollbackQuota,
          action: 'rollback'
        }, true);

        console.log(`🔄 QUOTA ROLLBACK: User ${userId} - Post ${postId} - Platform ${platform} - Quota restored: ${rollbackQuota}`);
        return true;
      }

      return false;
    } catch (error) {
      await loggingService.logQuotaManagement({
        userId,
        sessionId,
        postId,
        platform,
        action: 'rollback_failed'
      }, false, error.message);

      console.error(`❌ ROLLBACK FAILED: User ${userId} - Post ${postId} - ${error.message}`);
      return false;
    }
  }

  /**
   * Get all platform posts for a user
   */
  async getUserPlatformPosts(userId: number): Promise<any[]> {
    try {
      const userPosts = await storage.getPostsWithPlatformIds(userId);
      return userPosts.filter(post => post.platformPostId);
    } catch (error) {
      console.error(`Error getting platform posts for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Validate platform post ID
   */
  async validatePlatformPostId(postId: number): Promise<boolean> {
    try {
      const post = await storage.getPost(postId);
      return !!(post && post.platformPostId && post.platformPostId.length > 0);
    } catch (error) {
      console.error(`Error validating platform post ID for post ${postId}:`, error);
      return false;
    }
  }

  /**
   * Get quota utilization statistics
   */
  async getQuotaStats(userId: number): Promise<{
    totalPosts: number;
    successfulPosts: number;
    failedPosts: number;
    quotaUtilization: number;
  }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const userPosts = await storage.getPostsByUser(userId);
      const successfulPosts = userPosts.filter(post => post.platformPostId && post.platformPostId.length > 0);
      const failedPosts = userPosts.filter(post => !post.platformPostId || post.platformPostId.length === 0);

      return {
        totalPosts: userPosts.length,
        successfulPosts: successfulPosts.length,
        failedPosts: failedPosts.length,
        quotaUtilization: user.totalPosts > 0 ? ((user.totalPosts - user.remainingPosts) / user.totalPosts) * 100 : 0
      };
    } catch (error) {
      console.error(`Error getting quota stats for user ${userId}:`, error);
      return {
        totalPosts: 0,
        successfulPosts: 0,
        failedPosts: 0,
        quotaUtilization: 0
      };
    }
  }

  /**
   * Clean up old quota transactions
   */
  async cleanupOldTransactions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, transaction] of this.quotaTransactions.entries()) {
      // Simple cleanup - remove transactions older than 24 hours
      // In production, you might want to add timestamp to transactions
      if (this.quotaTransactions.size > 1000) {
        this.quotaTransactions.delete(key);
      }
    }

    console.log(`🧹 QUOTA TRANSACTIONS CLEANED: ${this.quotaTransactions.size} remaining`);
  }
}

export const platformPostManager = new PlatformPostManager();