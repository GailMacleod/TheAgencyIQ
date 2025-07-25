import { Request, Response, NextFunction } from 'express';
import { eq, sql } from 'drizzle-orm';
import { pgTable, integer, varchar, timestamp } from 'drizzle-orm/pg-core';

// Quota tracking table schema
export const quotaUsage = pgTable('quota_usage', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar('user_id').notNull(),
  dailyApiCalls: integer('daily_api_calls').default(0),
  dailyPosts: integer('daily_posts').default(0),
  lastReset: timestamp('last_reset').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
});

// Persistent quota tracking middleware
export function createPersistentQuotaMiddleware(limits: { dailyApiCalls: number; dailyPosts: number }) {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required for quota tracking' });
    }

    const userId = req.session.userId.toString();
    
    try {
      // Get or create user quota record - using dbManager singleton
      const { db } = await import('../db-init.js');
      let [userQuota] = await db.select().from(quotaUsage).where(eq(quotaUsage.userId, userId));
      
      if (!userQuota) {
        const { db } = await import('../db-init.js');
        [userQuota] = await db.insert(quotaUsage).values({
          userId,
          dailyApiCalls: 0,
          dailyPosts: 0
        }).returning();
      }
      
      // Check if we need to reset daily counters (24 hours)
      const lastReset = userQuota.lastReset ? new Date(userQuota.lastReset) : new Date();
      const now = new Date();
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceReset >= 24) {
        const { db } = await import('../db-init.js');
        await db.update(quotaUsage)
          .set({
            dailyApiCalls: 0,
            dailyPosts: 0,
            lastReset: now
          })
          .where(eq(quotaUsage.userId, userId));
        
        userQuota.dailyApiCalls = 0;
        userQuota.dailyPosts = 0;
        console.log(`🔄 Daily quota reset for user ${userId}`);
      }
      
      // Check API call limits
      if ((userQuota.dailyApiCalls || 0) >= limits.dailyApiCalls) {
        return res.status(429).json({ 
          error: 'Daily API quota exceeded',
          limit: limits.dailyApiCalls,
          used: userQuota.dailyApiCalls,
          resetIn: 24 - hoursSinceReset + ' hours'
        });
      }
      
      // Check post limits for posting endpoints
      if (req.path.includes('post') || req.path.includes('auto-posting')) {
        if ((userQuota.dailyPosts || 0) >= limits.dailyPosts) {
          return res.status(429).json({ 
            error: 'Daily posting quota exceeded',
            limit: limits.dailyPosts,
            used: userQuota.dailyPosts,
            resetIn: 24 - hoursSinceReset + ' hours'
          });
        }
      }
      
      // Increment API call counter
      const { db } = await import('../db-init.js');
      await db.update(quotaUsage)
        .set({
          dailyApiCalls: sql`${quotaUsage.dailyApiCalls} + 1`
        })
        .where(eq(quotaUsage.userId, userId));
      
      // Increment post counter for posting endpoints
      if (req.path.includes('post') || req.path.includes('auto-posting')) {
        await db.update(quotaUsage)
          .set({
            dailyPosts: sql`${quotaUsage.dailyPosts} + 1`
          })
          .where(eq(quotaUsage.userId, userId));
      }
      
      // Add quota info to request for downstream use
      req.quotaInfo = {
        apiCalls: (userQuota.dailyApiCalls || 0) + 1,
        posts: (userQuota.dailyPosts || 0) + (req.path.includes('post') ? 1 : 0),
        limits
      };
      
      next();
    } catch (error) {
      console.error('❌ Quota tracking error:', error);
      // Don't block request on quota tracking failure
      next();
    }
  };
}

// Get quota status for user
export async function getQuotaStatus(userId: string) {
  try {
    const { db } = await import('../db-init.js');
    const [userQuota] = await db.select().from(quotaUsage).where(eq(quotaUsage.userId, userId));
    
    if (!userQuota) {
      return {
        dailyApiCalls: 0,
        dailyPosts: 0,
        lastReset: new Date()
      };
    }
    
    return userQuota;
  } catch (error) {
    console.error('❌ Get quota status error:', error);
    return null;
  }
}