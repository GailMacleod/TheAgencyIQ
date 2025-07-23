import { db } from '../db';
import { quotaUsage, postSchedule, platformConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { AtomicQuotaManager } from '../services/AtomicQuotaManager';
import { AuthenticatedAutoPosting } from '../services/AuthenticatedAutoPosting';

/**
 * Atomic Posting Manager with Drizzle transactions
 * Eliminates race conditions between post creation and quota enforcement
 */
export class AtomicPostingManager {
  private authenticatedPosting: AuthenticatedAutoPosting;

  constructor() {
    this.authenticatedPosting = new AuthenticatedAutoPosting();
  }

  /**
   * Atomic post creation with quota enforcement using Drizzle transactions
   */
  async createPostWithQuotaCheck(
    userId: string,
    platform: string,
    content: string,
    userPlan: string = 'professional'
  ): Promise<{ success: boolean; postId?: string; message: string; quotaRemaining?: number }> {
    
    try {
      return await db.transaction(async (tx) => {
        console.log(`🔐 Starting atomic post creation for ${platform} - User: ${userId}`);

        // Step 1: Check quota atomically with SELECT FOR UPDATE
        const quotaResult = await AtomicQuotaManager.enforceQuota(
          userId,
          platform,
          'post',
          userPlan
        );

        if (!quotaResult.allowed) {
          console.log(`❌ Quota exceeded for ${platform}: ${quotaResult.message}`);
          return {
            success: false,
            message: quotaResult.message,
            quotaRemaining: quotaResult.remaining
          };
        }

        // Step 2: Check OAuth connection exists
        const connection = await tx
          .select()
          .from(platformConnections)
          .where(
            and(
              eq(platformConnections.userId, userId),
              eq(platformConnections.platform, platform),
              eq(platformConnections.isActive, true)
            )
          );

        if (!connection.length) {
          // Rollback quota usage if no OAuth connection
          await AtomicQuotaManager.resetQuota(userId, platform, 'post');
          return {
            success: false,
            message: `No ${platform} connection found. Please connect your account first.`,
            quotaRemaining: quotaResult.remaining + 1 // Restore quota
          };
        }

        // Step 3: Create post record with proper ID generation
        const postId = `post_${userId}_${platform}_${Date.now()}`;
        
        await tx.insert(postSchedule).values({
          postId,
          userId,
          platform,
          content,
          status: 'approved', // Ready for posting
          isCounted: false, // Will be true after successful posting
          createdAt: new Date()
        });

        console.log(`✅ Post created atomically with quota enforcement: ${postId}`);
        
        return {
          success: true,
          postId,
          message: `Post created successfully for ${platform}`,
          quotaRemaining: quotaResult.remaining
        };
      });

    } catch (error) {
      console.error(`❌ Atomic post creation failed:`, error);
      return {
        success: false,
        message: `Failed to create post: ${error.message}`
      };
    }
  }

  /**
   * Bulk post creation with atomic quota checks
   */
  async createBulkPostsWithQuotaCheck(
    userId: string,
    posts: { platform: string; content: string }[],
    userPlan: string = 'professional'
  ): Promise<{ success: boolean; results: any[]; totalQuotaUsed: number }> {
    
    const results = [];
    let totalQuotaUsed = 0;

    console.log(`🚀 Starting bulk post creation: ${posts.length} posts for user ${userId}`);

    for (const post of posts) {
      const result = await this.createPostWithQuotaCheck(
        userId,
        post.platform,
        post.content,
        userPlan
      );

      results.push({
        platform: post.platform,
        ...result
      });

      if (result.success) {
        totalQuotaUsed++;
      }

      // Rate limiting between posts (2 seconds)
      if (posts.indexOf(post) < posts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Bulk post creation completed: ${successCount}/${posts.length} successful`);

    return {
      success: successCount > 0,
      results,
      totalQuotaUsed
    };
  }

  /**
   * Execute auto-posting with atomic operations
   */
  async executeAutoPosting(userId: string): Promise<{ success: boolean; results: any[]; processed: number }> {
    try {
      console.log(`🤖 Starting auto-posting execution for user ${userId}`);

      // Get approved posts that haven't been posted yet
      const approvedPosts = await db
        .select()
        .from(postSchedule)
        .where(
          and(
            eq(postSchedule.userId, userId),
            eq(postSchedule.status, 'approved'),
            eq(postSchedule.isCounted, false)
          )
        );

      if (!approvedPosts.length) {
        return {
          success: true,
          results: [],
          processed: 0
        };
      }

      console.log(`📝 Found ${approvedPosts.length} approved posts ready for publishing`);

      // Execute authenticated posting with real APIs
      const postingResults = await this.authenticatedPosting.enforceAutoPosting(userId, approvedPosts);

      // Update post statuses based on results
      for (let i = 0; i < postingResults.length; i++) {
        const result = postingResults[i];
        const post = approvedPosts[i];

        await db
          .update(postSchedule)
          .set({
            status: result.success ? 'posted' : 'failed',
            isCounted: result.success,
            publishedAt: result.success ? new Date() : undefined
          })
          .where(eq(postSchedule.postId, post.postId));
      }

      const successCount = postingResults.filter(r => r.success).length;
      console.log(`✅ Auto-posting completed: ${successCount}/${approvedPosts.length} successful`);

      return {
        success: successCount > 0,
        results: postingResults,
        processed: approvedPosts.length
      };

    } catch (error) {
      console.error(`❌ Auto-posting execution failed:`, error);
      return {
        success: false,
        results: [],
        processed: 0
      };
    }
  }

  /**
   * Get posting status with quota information
   */
  async getPostingStatus(userId: string, userPlan: string = 'professional') {
    try {
      // Get quota status
      const quotaStatus = await AtomicQuotaManager.getQuotaStatus(userId, userPlan);

      // Get recent posts
      const recentPosts = await db
        .select()
        .from(postSchedule)
        .where(eq(postSchedule.userId, userId))
        .orderBy(postSchedule.createdAt)
        .limit(10);

      // Get platform connections
      const connections = await db
        .select()
        .from(platformConnections)
        .where(
          and(
            eq(platformConnections.userId, userId),
            eq(platformConnections.isActive, true)
          )
        );

      return {
        success: true,
        quota: quotaStatus,
        recentPosts: recentPosts.map(post => ({
          postId: post.postId,
          platform: post.platform,
          content: post.content.substring(0, 100) + '...',
          status: post.status,
          createdAt: post.createdAt,
          publishedAt: post.publishedAt
        })),
        connectedPlatforms: connections.map(conn => ({
          platform: conn.platform,
          isActive: conn.isActive,
          connectedAt: conn.createdAt
        })),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to get posting status:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}