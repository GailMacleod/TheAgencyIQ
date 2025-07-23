/**
 * ENHANCED AUTO-POSTING SERVICE
 * Replaces mock auto-posting with real social media API integration
 * Includes OAuth token refresh, retry logic, and SendGrid/Twilio notifications
 */

import { RealPublishingService } from './RealPublishingService';
import { OAuthTokenManager } from './OAuthTokenManager';
import { NotificationService } from './NotificationService';
import { storage } from '../storage';
import { db } from '../db';
import { posts, platformConnections } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface BulkPublishResult {
  success: boolean;
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  platformResults: Array<{
    postId: number;
    platform: string;
    success: boolean;
    platformPostId?: string;
    error?: string;
    retryScheduled?: boolean;
  }>;
  notifications: {
    emailSent: boolean;
    smsSent: boolean;
  };
}

export class EnhancedAutoPostingService {
  private static tokenManager = new OAuthTokenManager();
  private static notifications = new NotificationService();

  /**
   * Main entry point for enhanced auto-posting
   * Publishes all approved posts with real OAuth APIs
   */
  static async executeEnhancedAutoPosting(userId: number): Promise<BulkPublishResult> {
    console.log(`🚀 [ENHANCED-AUTO-POST] Starting real publishing for user ${userId}`);

    try {
      // Step 1: Get all posts ready for publishing
      const postsToPublish = await this.getPostsReadyForPublishing(userId);
      
      if (postsToPublish.length === 0) {
        console.log(`📭 [ENHANCED-AUTO-POST] No posts ready for publishing`);
        return {
          success: true,
          totalPosts: 0,
          successfulPosts: 0,
          failedPosts: 0,
          platformResults: [],
          notifications: { emailSent: false, smsSent: false }
        };
      }

      console.log(`📋 [ENHANCED-AUTO-POST] Found ${postsToPublish.length} posts to publish`);

      // Step 2: Validate OAuth connections before publishing
      const connectedPlatforms = await this.validateOAuthConnections(userId);
      console.log(`🔗 [ENHANCED-AUTO-POST] Connected platforms: ${connectedPlatforms.join(', ')}`);

      // Step 3: Execute real publishing with rate limiting
      const publishResults = await this.executeRealPublishing(
        postsToPublish,
        userId,
        connectedPlatforms
      );

      // Step 4: Send notifications about results
      await this.sendBulkNotifications(userId, publishResults);

      return publishResults;

    } catch (error: any) {
      console.error(`❌ [ENHANCED-AUTO-POST] Critical error:`, error);
      
      // Send failure notification
      await this.notifications.sendFailureNotification(
        userId,
        'system',
        0,
        `Auto-posting system error: ${error.message}`
      );

      return {
        success: false,
        totalPosts: 0,
        successfulPosts: 0,
        failedPosts: 0,
        platformResults: [],
        notifications: { emailSent: true, smsSent: false }
      };
    }
  }

  /**
   * Get all posts that are ready for publishing
   */
  private static async getPostsReadyForPublishing(userId: number) {
    return await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.userId, userId),
          inArray(posts.status, ['approved', 'draft'])
        )
      );
  }

  /**
   * Validate OAuth connections and return connected platforms
   */
  private static async validateOAuthConnections(userId: number): Promise<string[]> {
    try {
      const validConnections = await this.tokenManager.getAllValidConnections(userId);
      return validConnections.map(conn => conn.platform);
    } catch (error: any) {
      console.error(`❌ [OAUTH-VALIDATION] Error validating connections:`, error);
      return [];
    }
  }

  /**
   * Execute real publishing with OAuth APIs and rate limiting
   */
  private static async executeRealPublishing(
    postsToPublish: any[],
    userId: number,
    connectedPlatforms: string[]
  ): Promise<BulkPublishResult> {
    const result: BulkPublishResult = {
      success: true,
      totalPosts: postsToPublish.length,
      successfulPosts: 0,
      failedPosts: 0,
      platformResults: [],
      notifications: { emailSent: false, smsSent: false }
    };

    let publishCount = 0;

    for (const post of postsToPublish) {
      console.log(`📤 [PUBLISHING] Post ${post.id} to ${post.platform} (${publishCount + 1}/${postsToPublish.length})`);

      // Check if platform is connected
      if (!connectedPlatforms.includes(post.platform)) {
        console.log(`⚠️ [PUBLISHING] Skipping ${post.platform} - not connected`);
        
        result.platformResults.push({
          postId: post.id,
          platform: post.platform,
          success: false,
          error: `${post.platform} account not connected`
        });
        
        result.failedPosts++;
        continue;
      }

      try {
        // Execute real API call with OAuth tokens
        const publishResult = await RealPublishingService.publishPost(
          post.id,
          userId,
          post.platform,
          post.content
        );

        result.platformResults.push({
          postId: post.id,
          platform: post.platform,
          success: publishResult.success,
          platformPostId: publishResult.platformPostId,
          error: publishResult.error,
          retryScheduled: !!publishResult.retryAfter
        });

        if (publishResult.success) {
          result.successfulPosts++;
          console.log(`✅ [PUBLISHING] Success: ${post.platform} post ${publishResult.platformPostId}`);
        } else {
          result.failedPosts++;
          console.log(`❌ [PUBLISHING] Failed: ${post.platform} - ${publishResult.error}`);
        }

        // Rate limiting: 2-second delay between posts to prevent platform bans
        if (publishCount < postsToPublish.length - 1) {
          console.log(`⏱️ [RATE-LIMIT] Waiting 2 seconds before next post...`);
          await this.sleep(2000);
        }

        publishCount++;

      } catch (error: any) {
        console.error(`❌ [PUBLISHING] Unexpected error for post ${post.id}:`, error);
        
        result.platformResults.push({
          postId: post.id,
          platform: post.platform,
          success: false,
          error: `Unexpected error: ${error.message}`
        });
        
        result.failedPosts++;
      }
    }

    // Calculate overall success
    result.success = result.successfulPosts > 0 && result.failedPosts === 0;
    
    console.log(`📊 [PUBLISHING] Complete: ${result.successfulPosts}/${result.totalPosts} successful`);
    
    return result;
  }

  /**
   * Send notifications about bulk publishing results
   */
  private static async sendBulkNotifications(
    userId: number,
    results: BulkPublishResult
  ): Promise<void> {
    try {
      const platforms = [...new Set(results.platformResults.map(r => r.platform))];
      
      await this.notifications.sendBulkSummaryNotification(userId, {
        total: results.totalPosts,
        successful: results.successfulPosts,
        failed: results.failedPosts,
        platforms
      });

      results.notifications.emailSent = true;
      console.log(`📧 [NOTIFICATIONS] Bulk summary sent to user ${userId}`);

    } catch (error: any) {
      console.error(`❌ [NOTIFICATIONS] Failed to send bulk summary:`, error);
      results.notifications.emailSent = false;
    }
  }

  /**
   * Publish a single post with enhanced features
   */
  static async publishSinglePost(
    postId: number,
    userId: number,
    retryCount = 0
  ): Promise<{ success: boolean; platformPostId?: string; error?: string; analytics?: any }> {
    console.log(`📤 [SINGLE-PUBLISH] Publishing post ${postId} for user ${userId} (attempt ${retryCount + 1})`);

    try {
      // Get post details
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId));

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // Validate OAuth connection
      const tokenResult = await this.tokenManager.getValidToken(userId, post.platform);
      if (!tokenResult.success) {
        throw new Error(`OAuth validation failed: ${tokenResult.error}`);
      }

      // Execute real publishing
      const result = await RealPublishingService.publishPost(
        postId,
        userId,
        post.platform,
        post.content,
        retryCount
      );

      if (result.success) {
        console.log(`✅ [SINGLE-PUBLISH] Success: Post ${postId} published as ${result.platformPostId}`);
      } else {
        console.log(`❌ [SINGLE-PUBLISH] Failed: Post ${postId} - ${result.error}`);
      }

      return result;

    } catch (error: any) {
      console.error(`❌ [SINGLE-PUBLISH] Error publishing post ${postId}:`, error);
      
      await this.notifications.sendFailureNotification(
        userId,
        'unknown',
        postId,
        error.message
      );

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get enhanced auto-posting status for a user
   */
  static async getAutoPostingStatus(userId: number): Promise<{
    connectedPlatforms: string[];
    pendingPosts: number;
    lastPublished?: Date;
    nextScheduled?: Date;
  }> {
    try {
      // Get connected platforms
      const connectedPlatforms = await this.validateOAuthConnections(userId);

      // Get pending posts count
      const pendingPosts = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.userId, userId),
            inArray(posts.status, ['approved', 'draft'])
          )
        );

      // Get last published post
      const [lastPublished] = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.userId, userId),
            eq(posts.status, 'published')
          )
        )
        .orderBy(posts.publishedAt)
        .limit(1);

      return {
        connectedPlatforms,
        pendingPosts: pendingPosts.length,
        lastPublished: lastPublished?.publishedAt || undefined,
        nextScheduled: pendingPosts.length > 0 ? new Date() : undefined
      };

    } catch (error: any) {
      console.error(`❌ [STATUS] Error getting auto-posting status:`, error);
      return {
        connectedPlatforms: [],
        pendingPosts: 0
      };
    }
  }

  /**
   * Test OAuth connections for all platforms
   */
  static async testOAuthConnections(userId: number): Promise<{
    [platform: string]: { connected: boolean; error?: string; expiresAt?: Date }
  }> {
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    const results: any = {};

    for (const platform of platforms) {
      try {
        const tokenResult = await this.tokenManager.getValidToken(userId, platform);
        results[platform] = {
          connected: tokenResult.success,
          error: tokenResult.error,
          expiresAt: tokenResult.expiresAt
        };
      } catch (error: any) {
        results[platform] = {
          connected: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Helper function for delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Emergency retry failed posts
   */
  static async retryFailedPosts(userId: number): Promise<BulkPublishResult> {
    console.log(`🔄 [RETRY] Retrying failed posts for user ${userId}`);

    const failedPosts = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.userId, userId),
          eq(posts.status, 'failed')
        )
      );

    if (failedPosts.length === 0) {
      return {
        success: true,
        totalPosts: 0,
        successfulPosts: 0,
        failedPosts: 0,
        platformResults: [],
        notifications: { emailSent: false, smsSent: false }
      };
    }

    // Reset failed posts to approved for retry
    await db
      .update(posts)
      .set({ status: 'approved' })
      .where(
        and(
          eq(posts.userId, userId),
          eq(posts.status, 'failed')
        )
      );

    // Execute enhanced auto-posting
    return await this.executeEnhancedAutoPosting(userId);
  }
}