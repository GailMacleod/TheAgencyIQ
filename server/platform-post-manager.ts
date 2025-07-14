/**
 * PLATFORM POST ID MANAGEMENT SERVICE
 * Handles post ID tracking, quota deduction, and rollback for failed publications
 * Integrates with logging service for complete audit trail
 */

import { storage } from './storage';
import { loggingService } from './logging-service';

interface PlatformPostResult {
  success: boolean;
  postId?: string;
  platform: string;
  error?: string;
}

interface PublishResult {
  success: boolean;
  successfulPlatforms: string[];
  failedPlatforms: string[];
  platformPostIds: { [platform: string]: string };
  quotaDeducted: boolean;
  error?: string;
}

export class PlatformPostManager {
  private userId: number;
  private userEmail: string;
  private sessionId: string;

  constructor(userId: number, userEmail: string, sessionId: string) {
    this.userId = userId;
    this.userEmail = userEmail;
    this.sessionId = sessionId;
  }

  /**
   * Publishes a post to multiple platforms with proper quota management
   */
  async publishToMultiplePlatforms(
    postId: number,
    platforms: string[],
    publishingFunction: (platform: string) => Promise<PlatformPostResult>
  ): Promise<PublishResult> {
    const result: PublishResult = {
      success: false,
      successfulPlatforms: [],
      failedPlatforms: [],
      platformPostIds: {},
      quotaDeducted: false
    };

    try {
      // Get user's current quota before publishing
      const user = await storage.getUser(this.userId);
      if (!user) {
        throw new Error(`User ${this.userId} not found`);
      }

      const quotaBefore = user.remainingPosts;
      
      // Validate subscription and quota
      const hasActiveSubscription = await storage.validateActiveSubscription(this.userId);
      if (!hasActiveSubscription) {
        throw new Error('Active subscription required for publishing');
      }

      if (quotaBefore <= 0) {
        throw new Error('Quota exceeded - no posts remaining');
      }

      // Log post creation attempt
      loggingService.logPostCreation(
        this.userId,
        this.userEmail,
        this.sessionId,
        postId,
        platforms,
        true,
        { action: 'publish_attempt', quotaBefore },
        undefined
      );

      // Attempt to publish to all platforms
      const publishResults: { [platform: string]: PlatformPostResult } = {};

      for (const platform of platforms) {
        try {
          const platformResult = await publishingFunction(platform);
          publishResults[platform] = platformResult;

          if (platformResult.success && platformResult.postId) {
            result.successfulPlatforms.push(platform);
            result.platformPostIds[platform] = platformResult.postId;

            // Log successful platform publish
            loggingService.logPlatformPublish(
              this.userId,
              this.userEmail,
              postId,
              platform,
              platformResult.postId,
              true,
              { publishResult: platformResult },
              undefined
            );

            console.log(`✅ ${platform} publish successful: ${platformResult.postId}`);
          } else {
            result.failedPlatforms.push(platform);

            // Log failed platform publish
            loggingService.logPlatformPublish(
              this.userId,
              this.userEmail,
              postId,
              platform,
              null,
              false,
              { publishResult: platformResult },
              platformResult.error || 'Unknown error'
            );

            console.log(`❌ ${platform} publish failed: ${platformResult.error}`);
          }
        } catch (error) {
          result.failedPlatforms.push(platform);
          console.error(`❌ ${platform} publish error:`, error);

          // Log platform publish error
          loggingService.logPlatformPublish(
            this.userId,
            this.userEmail,
            postId,
            platform,
            null,
            false,
            { error: error.message },
            error.message
          );
        }
      }

      // Determine success based on publication results
      const hasSuccessfulPublications = result.successfulPlatforms.length > 0;
      
      if (hasSuccessfulPublications) {
        // Deduct quota only if at least one platform succeeded
        await this.deductQuota(postId, quotaBefore);
        result.quotaDeducted = true;
        result.success = true;

        // Update post with platform IDs for successful platforms
        await this.updatePostWithPlatformIds(postId, result.platformPostIds);

        console.log(`✅ Post ${postId} published successfully to ${result.successfulPlatforms.length}/${platforms.length} platforms`);
      } else {
        // No successful publications - don't deduct quota
        result.success = false;
        result.error = 'Failed to publish to any platform';
        
        // Log failed post creation
        loggingService.logPostCreation(
          this.userId,
          this.userEmail,
          this.sessionId,
          postId,
          platforms,
          false,
          { 
            action: 'publish_failed',
            quotaBefore,
            failedPlatforms: result.failedPlatforms 
          },
          result.error
        );

        console.log(`❌ Post ${postId} failed to publish to any platform`);
      }

      return result;

    } catch (error) {
      console.error('❌ Platform publishing error:', error);
      
      // Log publishing error
      loggingService.logPostCreation(
        this.userId,
        this.userEmail,
        this.sessionId,
        postId,
        platforms,
        false,
        { action: 'publish_error', error: error.message },
        error.message
      );

      return {
        success: false,
        successfulPlatforms: [],
        failedPlatforms: platforms,
        platformPostIds: {},
        quotaDeducted: false,
        error: error.message
      };
    }
  }

  /**
   * Deducts quota and logs the transaction
   */
  private async deductQuota(postId: number, quotaBefore: number): Promise<void> {
    try {
      const updatedUser = await storage.updateQuotaUsage(this.userId, quotaBefore - 1);
      const quotaAfter = updatedUser.remainingPosts;

      // Log quota deduction
      loggingService.logQuotaDeduction(
        this.userId,
        this.userEmail,
        postId,
        quotaBefore,
        quotaAfter,
        true,
        { 
          action: 'quota_deducted',
          quotaUsed: quotaBefore - quotaAfter
        }
      );

      console.log(`📊 Quota deducted: ${quotaBefore} → ${quotaAfter} (Post ${postId})`);
    } catch (error) {
      console.error('❌ Quota deduction failed:', error);
      
      // Log quota deduction failure
      loggingService.logQuotaDeduction(
        this.userId,
        this.userEmail,
        postId,
        quotaBefore,
        quotaBefore, // No change since it failed
        false,
        { action: 'quota_deduction_failed', error: error.message }
      );
      
      throw error;
    }
  }

  /**
   * Updates post with platform post IDs
   */
  private async updatePostWithPlatformIds(postId: number, platformPostIds: { [platform: string]: string }): Promise<void> {
    try {
      // Store platform post IDs in a structured format
      const platformPostIdString = JSON.stringify(platformPostIds);
      
      await storage.updatePostPlatformId(postId, platformPostIdString, true);
      
      console.log(`📋 Post ${postId} updated with platform IDs:`, platformPostIds);
    } catch (error) {
      console.error('❌ Failed to update post with platform IDs:', error);
      throw error;
    }
  }

  /**
   * Rollback quota deduction if post creation fails
   */
  async rollbackQuotaDeduction(postId: number): Promise<void> {
    try {
      const user = await storage.getUser(this.userId);
      if (!user) {
        throw new Error(`User ${this.userId} not found`);
      }

      const quotaBefore = user.remainingPosts;
      const restoredQuota = quotaBefore + 1;

      // Restore quota
      await storage.updateQuotaUsage(this.userId, restoredQuota);

      // Log quota rollback
      loggingService.logQuotaDeduction(
        this.userId,
        this.userEmail,
        postId,
        quotaBefore,
        restoredQuota,
        true,
        { 
          action: 'quota_rollback',
          quotaRestored: 1
        }
      );

      console.log(`🔄 Quota rollback: ${quotaBefore} → ${restoredQuota} (Post ${postId})`);
    } catch (error) {
      console.error('❌ Quota rollback failed:', error);
      throw error;
    }
  }

  /**
   * Validates platform post IDs exist for a post
   */
  async validatePlatformPostIds(postId: number): Promise<{ [platform: string]: string }> {
    try {
      const post = await storage.getPost(postId);
      if (!post || !post.platformPostId) {
        return {};
      }

      try {
        return JSON.parse(post.platformPostId);
      } catch (parseError) {
        console.error('❌ Failed to parse platform post IDs:', parseError);
        return {};
      }
    } catch (error) {
      console.error('❌ Failed to validate platform post IDs:', error);
      return {};
    }
  }

  /**
   * Gets publishing statistics for user
   */
  async getPublishingStats(): Promise<{
    totalPosts: number;
    successfulPublications: number;
    failedPublications: number;
    quotaRemaining: number;
    quotaUsed: number;
  }> {
    try {
      const user = await storage.getUser(this.userId);
      if (!user) {
        throw new Error(`User ${this.userId} not found`);
      }

      const posts = await storage.getPostsByUser(this.userId);
      const publishedPosts = posts.filter(post => post.status === 'published');

      return {
        totalPosts: posts.length,
        successfulPublications: publishedPosts.length,
        failedPublications: posts.length - publishedPosts.length,
        quotaRemaining: user.remainingPosts,
        quotaUsed: user.totalPosts - user.remainingPosts
      };
    } catch (error) {
      console.error('❌ Failed to get publishing stats:', error);
      throw error;
    }
  }
}

export default PlatformPostManager;