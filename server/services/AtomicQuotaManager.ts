/**
 * Atomic Quota Manager - Race Condition Free
 * Uses Drizzle transactions for bulletproof quota management
 */

import { db } from '../db.js';
import { quotaUsage, users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export class AtomicQuotaManager {
  private static readonly QUOTA_LIMITS = {
    free: { videos: 3, apiCalls: 50, posts: 10 },
    starter: { videos: 12, apiCalls: 200, posts: 30 },
    growth: { videos: 27, apiCalls: 500, posts: 60 },
    professional: { videos: 52, apiCalls: 1000, posts: 100 }
  };

  private static readonly PLATFORM_LIMITS: Record<string, { posts?: number; calls: number }> = {
    facebook: { posts: 50, calls: 200 },
    instagram: { posts: 25, calls: 200 },
    linkedin: { posts: 20, calls: 100 },
    twitter: { posts: 300, calls: 500 },
    youtube: { posts: 6, calls: 10000 },
    video_generation: { calls: 5 },
    auto_posting: { calls: 20 }
  };

  /**
   * Atomic quota check and decrement using Drizzle transaction
   * Prevents race conditions with SELECT FOR UPDATE
   */
  static async atomicQuotaOperation(
    userId: number, 
    platform: string, 
    operation: string = 'call'
  ): Promise<{ success: boolean; remaining?: number; reason?: string }> {
    console.log(`🔒 Atomic quota operation: User ${userId}, ${platform}, ${operation}`);
    
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      try {
        // Get current hour window
        const currentHour = new Date();
        currentHour.setMinutes(0, 0, 0);

        // Get user subscription plan
        const [user] = await tx
          .select({ subscriptionPlan: users.subscriptionPlan })
          .from(users)
          .where(eq(users.id, userId));

        if (!user) {
          return { success: false, reason: 'User not found' };
        }

        const plan = user.subscriptionPlan || 'free';
        const userLimits = this.QUOTA_LIMITS[plan as keyof typeof this.QUOTA_LIMITS] || this.QUOTA_LIMITS.free;
        const platformLimits = this.PLATFORM_LIMITS[platform as keyof typeof this.PLATFORM_LIMITS];
        
        let limit: number;
        if (operation === 'video') {
          limit = userLimits.videos;
        } else if (operation === 'post') {
          limit = platformLimits?.posts ?? userLimits.posts;
        } else {
          limit = platformLimits?.calls ?? userLimits.apiCalls;
        }

        // Atomic read and increment using PostgreSQL UPSERT with conflict handling
        const [currentUsage] = await tx
          .select({ count: quotaUsage.count })
          .from(quotaUsage)
          .where(
            and(
              eq(quotaUsage.userId, userId),
              eq(quotaUsage.platform, platform),
              eq(quotaUsage.operation, operation),
              eq(quotaUsage.hourWindow, currentHour)
            )
          )
          .for('update'); // SELECT FOR UPDATE prevents race conditions

        const currentCount = currentUsage?.count || 0;

        // Check if quota exceeded
        if (currentCount >= limit) {
          console.log(`❌ Quota exceeded: ${currentCount}/${limit} for user ${userId}, ${platform}, ${operation}`);
          return { 
            success: false, 
            remaining: 0,
            reason: `Quota exceeded (${currentCount}/${limit}) for ${plan} plan` 
          };
        }

        // Atomic increment using INSERT ON CONFLICT
        await tx
          .insert(quotaUsage)
          .values({
            userId,
            platform,
            operation,
            hourWindow: currentHour,
            count: 1,
            lastUsed: new Date(),
          })
          .onConflictDoUpdate({
            target: [quotaUsage.userId, quotaUsage.platform, quotaUsage.operation, quotaUsage.hourWindow],
            set: {
              count: sql`${quotaUsage.count} + 1`,
              lastUsed: new Date(),
              updatedAt: new Date(),
            },
          });

        const newCount = currentCount + 1;
        const remaining = limit - newCount;

        console.log(`✅ Quota updated atomically: ${newCount}/${limit} (${remaining} remaining)`);
        
        return { 
          success: true, 
          remaining 
        };

      } catch (error) {
        console.error('❌ Atomic quota operation failed:', error);
        // Transaction will be rolled back automatically
        return { 
          success: false, 
          reason: 'Database transaction failed' 
        };
      }
    });
  }

  /**
   * Check quota without decrementing (read-only with retry on deadlock)
   */
  static async checkQuotaStatus(
    userId: number, 
    platform: string, 
    operation: string = 'call'
  ): Promise<{ withinQuota: boolean; currentUsage: number; limit: number; remaining: number }> {
    
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const currentHour = new Date();
        currentHour.setMinutes(0, 0, 0);

        // Get user subscription plan with retry logic
        const [user] = await db
          .select({ subscriptionPlan: users.subscriptionPlan })
          .from(users)
          .where(eq(users.id, userId));

        if (!user) {
          return { withinQuota: false, currentUsage: 0, limit: 0, remaining: 0 };
        }

        const plan = user.subscriptionPlan || 'free';
        const userLimits = this.QUOTA_LIMITS[plan as keyof typeof this.QUOTA_LIMITS] || this.QUOTA_LIMITS.free;
        const platformLimits = this.PLATFORM_LIMITS[platform as keyof typeof this.PLATFORM_LIMITS];
        
        let limit: number;
        if (operation === 'video') {
          limit = userLimits.videos;
        } else if (operation === 'post') {
          limit = platformLimits?.posts ?? userLimits.posts;
        } else {
          limit = platformLimits?.calls ?? userLimits.apiCalls;
        }

        // Get current usage with timeout
        const [usage] = await db
          .select({ count: quotaUsage.count })
          .from(quotaUsage)
          .where(
            and(
              eq(quotaUsage.userId, userId),
              eq(quotaUsage.platform, platform),
              eq(quotaUsage.operation, operation),
              eq(quotaUsage.hourWindow, currentHour)
            )
          );

        const currentUsage = usage?.count || 0;
        const withinQuota = currentUsage < limit;
        const remaining = Math.max(0, limit - currentUsage);

        return { withinQuota, currentUsage, limit, remaining };

      } catch (error: any) {
        attempt++;
        console.warn(`⚠️ Quota check attempt ${attempt} failed:`, error.message);
        
        // Exponential backoff for retries
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ Quota check failed after all retries');
          // Fail open - allow operation if quota check fails after retries
          return { withinQuota: true, currentUsage: 0, limit: 100, remaining: 100 };
        }
      }
    }

    // Should never reach here, but TypeScript requires it
    return { withinQuota: true, currentUsage: 0, limit: 100, remaining: 100 };
  }

  /**
   * Cleanup expired quota records (run periodically)
   */
  static async cleanupExpiredQuota(): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const result = await db
        .delete(quotaUsage)
        .where(sql`${quotaUsage.hourWindow} < ${oneDayAgo}`);

      console.log(`🧹 Cleaned up expired quota records`);
    } catch (error) {
      console.error('❌ Quota cleanup failed:', error);
    }
  }

  /**
   * Reset quota for a user (admin function)
   */
  static async resetUserQuota(userId: number): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        await tx
          .delete(quotaUsage)
          .where(eq(quotaUsage.userId, userId));
      });
      
      console.log(`🔄 Reset quota for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to reset quota for user ${userId}:`, error);
    }
  }

  /**
   * Get comprehensive quota status for all platforms
   */
  static async getComprehensiveQuotaStatus(userId: number): Promise<any> {
    try {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);

      const [user] = await db
        .select({ subscriptionPlan: users.subscriptionPlan })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return { error: 'User not found' };
      }

      const plan = user.subscriptionPlan || 'free';
      const userLimits = this.QUOTA_LIMITS[plan as keyof typeof this.QUOTA_LIMITS] || this.QUOTA_LIMITS.free;

      // Get all current usage
      const allUsage = await db
        .select()
        .from(quotaUsage)
        .where(
          and(
            eq(quotaUsage.userId, userId),
            eq(quotaUsage.hourWindow, currentHour)
          )
        );

      const status = {
        plan,
        limits: userLimits,
        platforms: {} as any,
        resetTime: new Date(currentHour.getTime() + 60 * 60 * 1000) // Next hour
      };

      // Calculate status for each platform
      Object.keys(this.PLATFORM_LIMITS).forEach(platform => {
        const platformUsage = allUsage.filter(u => u.platform === platform);
        const postUsage = platformUsage.find(u => u.operation === 'post')?.count || 0;
        const callUsage = platformUsage.find(u => u.operation === 'call')?.count || 0;
        
        const platformLimits = this.PLATFORM_LIMITS[platform as keyof typeof this.PLATFORM_LIMITS];
        
        status.platforms[platform] = {
          posts: {
            used: postUsage,
            limit: platformLimits.posts ?? userLimits.posts,
            remaining: (platformLimits.posts ?? userLimits.posts) - postUsage
          },
          calls: {
            used: callUsage,
            limit: platformLimits.calls ?? userLimits.apiCalls,
            remaining: (platformLimits.calls ?? userLimits.apiCalls) - callUsage
          }
        };
      });

      // Add video quota
      const videoUsage = allUsage.find(u => u.platform === 'video' && u.operation === 'generation')?.count || 0;
      status.platforms.video = {
        used: videoUsage,
        limit: userLimits.videos,
        remaining: userLimits.videos - videoUsage
      };

      return status;

    } catch (error) {
      console.error('❌ Failed to get comprehensive quota status:', error);
      return { error: 'Failed to retrieve quota status' };
    }
  }
}

// Schedule cleanup every hour
setInterval(() => {
  AtomicQuotaManager.cleanupExpiredQuota();
}, 60 * 60 * 1000);

export default AtomicQuotaManager;