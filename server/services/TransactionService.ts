/**
 * Transaction Service for Post/Quota Operations
 * Handles atomic database transactions with Drizzle ORM
 */

import { db } from '../db';
import { posts, quotaUsage, users, oauthTokens } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notificationService } from './NotificationService';

interface CreatePostOptions {
  userId: string;
  platform: string;
  content: string;
  title?: string;
  scheduledAt?: Date;
  imageUrl?: string;
}

interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  resetTime: Date;
}

interface PostCreationResult {
  success: boolean;
  postId?: string;
  error?: string;
  quotaInfo?: QuotaCheckResult;
}

export class TransactionService {
  
  /**
   * Platform-specific quota limits
   */
  private readonly PLATFORM_LIMITS = {
    facebook: { posts: 50, calls: 200 },
    instagram: { posts: 25, calls: 200 },
    linkedin: { posts: 20, calls: 100 },
    twitter: { posts: 300, calls: 500 },
    youtube: { posts: 6, calls: 10000 }
  };

  /**
   * Check quota usage for user and platform
   */
  async checkQuota(userId: string, platform: string, operation: 'post' | 'call'): Promise<QuotaCheckResult> {
    const hourWindow = new Date();
    hourWindow.setMinutes(0, 0, 0); // Start of current hour

    const limit = this.PLATFORM_LIMITS[platform as keyof typeof this.PLATFORM_LIMITS];
    if (!limit) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    const maxAllowed = operation === 'post' ? limit.posts : limit.calls;

    try {
      // Get current usage for this hour
      const [usage] = await db
        .select({
          count: sql<number>`COALESCE(SUM(${quotaUsage.count}), 0)`
        })
        .from(quotaUsage)
        .where(and(
          eq(quotaUsage.userId, userId),
          eq(quotaUsage.platform, platform),
          eq(quotaUsage.operation, operation),
          eq(quotaUsage.hourWindow, hourWindow)
        ));

      const currentUsage = Number(usage?.count || 0);
      const resetTime = new Date(hourWindow.getTime() + 60 * 60 * 1000); // Next hour

      return {
        allowed: currentUsage < maxAllowed,
        currentUsage,
        limit: maxAllowed,
        resetTime
      };
    } catch (error) {
      console.error('❌ Quota check failed:', error);
      throw new Error('Failed to check quota usage');
    }
  }

  /**
   * Increment quota usage atomically
   */
  async incrementQuota(userId: string, platform: string, operation: 'post' | 'call', count: number = 1): Promise<void> {
    const hourWindow = new Date();
    hourWindow.setMinutes(0, 0, 0);

    try {
      await db
        .insert(quotaUsage)
        .values({
          id: `quota_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          userId,
          platform,
          operation,
          hourWindow,
          count,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [quotaUsage.userId, quotaUsage.platform, quotaUsage.operation, quotaUsage.hourWindow],
          set: {
            count: sql`${quotaUsage.count} + ${count}`,
            updatedAt: new Date()
          }
        });

      console.log(`📊 Quota incremented: ${platform}/${operation} +${count} for user ${userId}`);
    } catch (error) {
      console.error('❌ Quota increment failed:', error);
      throw new Error('Failed to update quota usage');
    }
  }

  /**
   * Create post with quota check in transaction
   */
  async createPostWithQuotaCheck(options: CreatePostOptions): Promise<PostCreationResult> {
    const { userId, platform, content, title, scheduledAt, imageUrl } = options;

    try {
      return await db.transaction(async (tx) => {
        // Step 1: Check quota
        const quotaInfo = await this.checkQuota(userId, platform, 'post');
        
        if (!quotaInfo.allowed) {
          return {
            success: false,
            error: `Quota exceeded for ${platform}. Limit: ${quotaInfo.limit}, Current: ${quotaInfo.currentUsage}`,
            quotaInfo
          };
        }

        // Step 2: Verify user exists
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId));

        if (!user) {
          return {
            success: false,
            error: 'User not found'
          };
        }

        // Step 3: Create post
        const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        
        await tx
          .insert(posts)
          .values({
            id: postId,
            userId,
            platform,
            content,
            title: title || '',
            status: scheduledAt ? 'scheduled' : 'draft',
            scheduledAt,
            imageUrl,
            createdAt: new Date(),
            updatedAt: new Date()
          });

        // Step 4: Increment quota
        await this.incrementQuota(userId, platform, 'post');

        console.log(`✅ Post created successfully: ${postId} for ${platform}`);

        // Step 5: Send notification
        if (user.email) {
          await notificationService.sendPostNotification(
            user.email,
            platform,
            title || content.substring(0, 50),
            true
          ).catch(error => {
            console.warn('⚠️ Notification sending failed:', error);
          });
        }

        return {
          success: true,
          postId,
          quotaInfo
        };
      });
    } catch (error) {
      console.error('❌ Post creation transaction failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  /**
   * Publish post with OAuth token validation
   */
  async publishPost(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await db.transaction(async (tx) => {
        // Step 1: Get post details
        const [post] = await tx
          .select()
          .from(posts)
          .where(eq(posts.id, postId));

        if (!post) {
          return { success: false, error: 'Post not found' };
        }

        if (post.status === 'published') {
          return { success: false, error: 'Post already published' };
        }

        // Step 2: Get OAuth tokens
        const [tokens] = await tx
          .select()
          .from(oauthTokens)
          .where(and(
            eq(oauthTokens.userId, post.userId),
            eq(oauthTokens.platform, post.platform),
            eq(oauthTokens.isActive, true)
          ));

        if (!tokens) {
          return { success: false, error: `No OAuth tokens found for ${post.platform}` };
        }

        // Step 3: Check token expiry
        if (tokens.expiresAt && new Date() > tokens.expiresAt) {
          await tx
            .update(oauthTokens)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(oauthTokens.id, tokens.id));
          
          return { success: false, error: `OAuth token expired for ${post.platform}` };
        }

        // Step 4: Update post status
        await tx
          .update(posts)
          .set({
            status: 'published',
            publishedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(posts.id, postId));

        // Step 5: Increment API call quota
        await this.incrementQuota(post.userId, post.platform, 'call');

        console.log(`🚀 Post published successfully: ${postId} on ${post.platform}`);

        return { success: true };
      });
    } catch (error) {
      console.error('❌ Post publishing transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Publishing failed'
      };
    }
  }

  /**
   * Get quota status for user across all platforms
   */
  async getQuotaStatus(userId: string): Promise<Record<string, QuotaCheckResult>> {
    const platforms = Object.keys(this.PLATFORM_LIMITS);
    const status: Record<string, QuotaCheckResult> = {};

    for (const platform of platforms) {
      try {
        status[platform] = await this.checkQuota(userId, platform, 'post');
      } catch (error) {
        console.error(`❌ Failed to get quota for ${platform}:`, error);
        status[platform] = {
          allowed: false,
          currentUsage: 0,
          limit: 0,
          resetTime: new Date()
        };
      }
    }

    return status;
  }

  /**
   * Reset quota for testing (development only)
   */
  async resetQuota(userId: string, platform?: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Quota reset not allowed in production');
    }

    try {
      if (platform) {
        await db
          .delete(quotaUsage)
          .where(and(
            eq(quotaUsage.userId, userId),
            eq(quotaUsage.platform, platform)
          ));
        console.log(`🔄 Quota reset for ${platform} - user ${userId}`);
      } else {
        await db
          .delete(quotaUsage)
          .where(eq(quotaUsage.userId, userId));
        console.log(`🔄 All quota reset for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Quota reset failed:', error);
      throw new Error('Failed to reset quota');
    }
  }
}

export const transactionService = new TransactionService();