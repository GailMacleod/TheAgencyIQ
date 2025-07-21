import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class QuotaManager {
  private static quotaLimits = {
    free: { videos: 1, apiCalls: 5, posts: 5 },
    starter: { videos: 5, apiCalls: 50, posts: 20 },
    growth: { videos: 15, apiCalls: 150, posts: 50 },
    professional: { videos: 50, apiCalls: 500, posts: 100 }
  };

  // Pre-check video generation quota
  static async canGenerateVideo(userId: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      console.log(`🔍 Checking video quota for user ${userId}...`);

      // Get user subscription
      const [user] = await db.select().from(users).where(eq(users.id, userId.toString()));
      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      const plan = user.subscriptionPlan || 'free';
      const limits = this.quotaLimits[plan as keyof typeof this.quotaLimits] || this.quotaLimits.free;

      // Check current usage from Replit database
      const Database = require('@replit/database');
      const quotaDb = new Database();
      
      const today = new Date().toISOString().split('T')[0];
      const quotaKey = `quota:${userId}:${today}`;
      
      let usage = await quotaDb.get(quotaKey) || { videos: 0, apiCalls: 0, posts: 0 };

      console.log(`📊 Current usage for ${plan} plan:`, usage);
      console.log(`📊 Plan limits:`, limits);

      if (usage.videos >= limits.videos) {
        return { 
          allowed: false, 
          reason: `Video quota exceeded (${usage.videos}/${limits.videos}) for ${plan} plan` 
        };
      }

      console.log(`✅ Video generation allowed: ${usage.videos + 1}/${limits.videos}`);
      return { allowed: true };

    } catch (error) {
      console.error('❌ Quota check failed:', error);
      return { allowed: false, reason: 'Quota check failed' };
    }
  }

  // Increment video usage after successful generation
  static async incrementVideoUsage(userId: number): Promise<void> {
    try {
      const Database = require('@replit/database');
      const quotaDb = new Database();
      
      const today = new Date().toISOString().split('T')[0];
      const quotaKey = `quota:${userId}:${today}`;
      
      let usage = await quotaDb.get(quotaKey) || { videos: 0, apiCalls: 0, posts: 0 };
      usage.videos += 1;
      usage.lastUpdated = new Date().toISOString();

      await quotaDb.set(quotaKey, usage, { EX: 86400 }); // 24 hour expiry
      console.log(`📈 Video usage incremented for user ${userId}: ${usage.videos}`);

    } catch (error) {
      console.error('❌ Failed to increment video usage:', error);
    }
  }

  // Pre-check API calls quota
  static async canMakeApiCall(userId: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId.toString()));
      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      const plan = user.subscriptionPlan || 'free';
      const limits = this.quotaLimits[plan as keyof typeof this.quotaLimits] || this.quotaLimits.free;

      const Database = require('@replit/database');
      const quotaDb = new Database();
      
      const today = new Date().toISOString().split('T')[0];
      const quotaKey = `quota:${userId}:${today}`;
      
      let usage = await quotaDb.get(quotaKey) || { videos: 0, apiCalls: 0, posts: 0 };

      if (usage.apiCalls >= limits.apiCalls) {
        return { 
          allowed: false, 
          reason: `API quota exceeded (${usage.apiCalls}/${limits.apiCalls}) for ${plan} plan` 
        };
      }

      return { allowed: true };

    } catch (error) {
      console.error('❌ API quota check failed:', error);
      return { allowed: false, reason: 'API quota check failed' };
    }
  }

  // Increment API usage
  static async incrementApiUsage(userId: number): Promise<void> {
    try {
      const Database = require('@replit/database');
      const quotaDb = new Database();
      
      const today = new Date().toISOString().split('T')[0];
      const quotaKey = `quota:${userId}:${today}`;
      
      let usage = await quotaDb.get(quotaKey) || { videos: 0, apiCalls: 0, posts: 0 };
      usage.apiCalls += 1;
      usage.lastUpdated = new Date().toISOString();

      await quotaDb.set(quotaKey, usage, { EX: 86400 });
      console.log(`📈 API usage incremented for user ${userId}: ${usage.apiCalls}`);

    } catch (error) {
      console.error('❌ Failed to increment API usage:', error);
    }
  }

  // Get current quota status
  static async getQuotaStatus(userId: number): Promise<any> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId.toString()));
      if (!user) {
        return null;
      }

      const plan = user.subscriptionPlan || 'free';
      const limits = this.quotaLimits[plan as keyof typeof this.quotaLimits] || this.quotaLimits.free;

      const Database = require('@replit/database');
      const quotaDb = new Database();
      
      const today = new Date().toISOString().split('T')[0];
      const quotaKey = `quota:${userId}:${today}`;
      
      let usage = await quotaDb.get(quotaKey) || { videos: 0, apiCalls: 0, posts: 0 };

      return {
        plan,
        limits,
        usage,
        remaining: {
          videos: Math.max(0, limits.videos - usage.videos),
          apiCalls: Math.max(0, limits.apiCalls - usage.apiCalls),
          posts: Math.max(0, limits.posts - usage.posts)
        }
      };

    } catch (error) {
      console.error('❌ Failed to get quota status:', error);
      return null;
    }
  }
}

// Export singleton instance for middleware compatibility
export const quotaManager = QuotaManager;