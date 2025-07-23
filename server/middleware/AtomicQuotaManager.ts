import { db } from '../db';
import { quotaUsage, users } from '@shared/schema';
import { sql, eq, and, gte } from 'drizzle-orm';

export interface QuotaLimits {
  facebook: { post: number; api_calls: number };
  instagram: { post: number; api_calls: number };
  linkedin: { post: number; api_calls: number };
  twitter: { post: number; api_calls: number };
  youtube: { post: number; api_calls: number };
  veo: { video: number; api_calls: number };
}

export interface PlanLimits {
  starter: QuotaLimits;
  growth: QuotaLimits;
  professional: QuotaLimits;
}

// Platform-specific quota limits by plan
const PLAN_LIMITS: PlanLimits = {
  starter: {
    facebook: { post: 20, api_calls: 100 },
    instagram: { post: 15, api_calls: 100 },
    linkedin: { post: 10, api_calls: 50 },
    twitter: { post: 100, api_calls: 200 },
    youtube: { post: 3, api_calls: 50 },
    veo: { video: 3, api_calls: 50 }
  },
  growth: {
    facebook: { post: 35, api_calls: 150 },
    instagram: { post: 20, api_calls: 150 },
    linkedin: { post: 15, api_calls: 75 },
    twitter: { post: 200, api_calls: 350 },
    youtube: { post: 5, api_calls: 100 },
    veo: { video: 5, api_calls: 100 }
  },
  professional: {
    facebook: { post: 50, api_calls: 200 },
    instagram: { post: 25, api_calls: 200 },
    linkedin: { post: 20, api_calls: 100 },
    twitter: { post: 300, api_calls: 500 },
    youtube: { post: 6, api_calls: 10000 },
    veo: { video: 6, api_calls: 10000 }
  }
};

export class AtomicQuotaManager {
  
  /**
   * Enforce quota with atomic operations using SELECT FOR UPDATE
   */
  static async enforceQuota(
    userId: string,
    platform: string,
    operation: string,
    userPlan: string = 'professional'
  ): Promise<{ allowed: boolean; remaining: number; message: string }> {
    
    const planKey = userPlan as keyof PlanLimits;
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.professional;
    const platformLimits = limits[platform as keyof QuotaLimits];
    
    if (!platformLimits) {
      return {
        allowed: false,
        remaining: 0,
        message: `Invalid platform: ${platform}`
      };
    }

    const operationLimit = platformLimits[operation as keyof typeof platformLimits];
    
    if (operationLimit === undefined) {
      return {
        allowed: false,
        remaining: 0,
        message: `Invalid operation: ${operation} for platform: ${platform}`
      };
    }

    // Get current hour window
    const now = new Date();
    const hourWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    try {
      return await db.transaction(async (tx) => {
        // Use SELECT FOR UPDATE to prevent race conditions
        const existingQuota = await tx
          .select()
          .from(quotaUsage)
          .where(
            and(
              eq(quotaUsage.userId, userId),
              eq(quotaUsage.platform, platform),
              eq(quotaUsage.operation, operation),
              eq(quotaUsage.hourWindow, hourWindow)
            )
          )
          .for('update');

        const currentCount = existingQuota[0]?.count || 0;
        const remaining = Math.max(0, operationLimit - currentCount);

        if (currentCount >= operationLimit) {
          return {
            allowed: false,
            remaining: 0,
            message: `Quota exceeded for ${platform} ${operation}. Limit: ${operationLimit}/hour`
          };
        }

        // Increment quota usage atomically
        if (existingQuota.length > 0) {
          await tx
            .update(quotaUsage)
            .set({ 
              count: currentCount + 1,
              updatedAt: new Date()
            })
            .where(eq(quotaUsage.id, existingQuota[0].id));
        } else {
          await tx.insert(quotaUsage).values({
            userId,
            platform,
            operation,
            hourWindow,
            count: 1
          });
        }

        return {
          allowed: true,
          remaining: remaining - 1,
          message: `Quota enforced: ${currentCount + 1}/${operationLimit} used for ${platform} ${operation}`
        };
      });

    } catch (error) {
      console.error('Quota enforcement error:', error);
      
      // On error, allow request but log issue
      return {
        allowed: true,
        remaining: 999,
        message: 'Quota check failed, allowing request'
      };
    }
  }

  /**
   * Get quota status without consuming quota
   */
  static async getQuotaStatus(userId: string, userPlan: string = 'professional') {
    const planKey = userPlan as keyof PlanLimits;
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.professional;
    
    const now = new Date();
    const hourWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    
    try {
      const quotaRecords = await db
        .select()
        .from(quotaUsage)
        .where(
          and(
            eq(quotaUsage.userId, userId),
            eq(quotaUsage.hourWindow, hourWindow)
          )
        );

      const status: any = {
        userId,
        userPlan,
        hourWindow: hourWindow.toISOString(),
        platforms: {}
      };

      // Build status for each platform
      for (const [platformName, platformLimits] of Object.entries(limits)) {
        status.platforms[platformName] = {};
        
        for (const [operation, limit] of Object.entries(platformLimits)) {
          const record = quotaRecords.find(r => 
            r.platform === platformName && r.operation === operation
          );
          
          const used = record?.count || 0;
          
          status.platforms[platformName][operation] = {
            limit,
            used,
            remaining: Math.max(0, limit - used),
            percentage: Math.round((used / limit) * 100)
          };
        }
      }

      return status;
      
    } catch (error) {
      console.error('Get quota status error:', error);
      throw error;
    }
  }

  /**
   * Cleanup old quota records (run daily)
   */
  static async cleanupOldQuotaRecords() {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const result = await db
        .delete(quotaUsage)
        .where(gte(quotaUsage.hourWindow, oneDayAgo));

      console.log(`✅ Cleaned up old quota records older than 24 hours`);
      return result;
      
    } catch (error) {
      console.error('Quota cleanup error:', error);
      throw error;
    }
  }

  /**
   * Reset quota for a user/platform/operation (admin use)
   */
  static async resetQuota(userId: string, platform?: string, operation?: string) {
    try {
      let whereCondition = eq(quotaUsage.userId, userId);
      
      if (platform) {
        whereCondition = and(whereCondition, eq(quotaUsage.platform, platform));
      }
      
      if (operation) {
        whereCondition = and(whereCondition, eq(quotaUsage.operation, operation));
      }

      const result = await db
        .delete(quotaUsage)
        .where(whereCondition);

      console.log(`✅ Reset quota for user ${userId}, platform: ${platform || 'all'}, operation: ${operation || 'all'}`);
      return result;
      
    } catch (error) {
      console.error('Quota reset error:', error);
      throw error;
    }
  }
}