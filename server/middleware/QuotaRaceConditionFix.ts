import { db } from '../db';
import { sql, eq, and, unique, index } from 'drizzle-orm';
import { pgTable, serial, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

interface QuotaLimits {
  posts: number;
  apiCalls: number;
}

const PLATFORM_LIMITS: Record<string, QuotaLimits> = {
  facebook: { posts: 50, apiCalls: 200 },
  instagram: { posts: 25, apiCalls: 200 },
  linkedin: { posts: 20, apiCalls: 100 },
  twitter: { posts: 300, apiCalls: 500 },
  youtube: { posts: 6, apiCalls: 10000 }
};

export class AtomicQuotaFix {
  // FIXED: SELECT FOR UPDATE prevents race conditions
  async checkAndIncrementQuota(
    userId: string, 
    platform: string, 
    operation: 'post' | 'api_call'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    
    return await db.transaction(async (tx) => {
      const hourWindow = new Date();
      hourWindow.setMinutes(0, 0, 0);
      
      // CRITICAL FIX: Use SELECT FOR UPDATE to lock row during check
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
        .for('update') // PostgreSQL row-level locking
        .limit(1);

      const limit = PLATFORM_LIMITS[platform]?.[operation === 'post' ? 'posts' : 'apiCalls'] || 100;
      const currentCount = existingQuota[0]?.count || 0;

      if (currentCount >= limit) {
        const nextHour = new Date(hourWindow);
        nextHour.setHours(hourWindow.getHours() + 1);
        
        return {
          allowed: false,
          remaining: 0,
          resetTime: nextHour
        };
      }

      // FIXED: Use onConflictDoUpdate for atomic increment
      await tx
        .insert(quotaUsage)
        .values({
          userId,
          platform,
          operation,
          hourWindow,
          count: 1
        })
        .onConflictDoUpdate({
          target: [quotaUsage.userId, quotaUsage.platform, quotaUsage.operation, quotaUsage.hourWindow],
          set: {
            count: sql`${quotaUsage.count} + 1`,
            updatedAt: new Date()
          }
        });

      return {
        allowed: true,
        remaining: limit - (currentCount + 1),
        resetTime: new Date(hourWindow.getTime() + 60 * 60 * 1000)
      };
    });
  }

  // FIXED: Exponential backoff for API rate limiting
  async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxRetries - 1) throw error;
        
        // Only retry on quota/rate limit errors
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
          console.log(`⚠️ Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  // Middleware for automatic quota checking
  quotaMiddleware = (platform: string, operation: 'post' | 'api_call') => {
    return async (req: any, res: any, next: any) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const quotaResult = await this.checkAndIncrementQuota(userId, platform, operation);
        
        if (!quotaResult.allowed) {
          return res.status(429).json({
            error: 'Quota exceeded',
            platform,
            operation,
            resetTime: quotaResult.resetTime,
            retryAfter: Math.ceil((quotaResult.resetTime.getTime() - Date.now()) / 1000)
          });
        }

        // Add quota info to response headers
        res.setHeader('X-Quota-Remaining', quotaResult.remaining.toString());
        res.setHeader('X-Quota-Reset', quotaResult.resetTime.toISOString());

        next();
      } catch (error) {
        console.error('Quota middleware error:', error);
        // Allow request to proceed on quota system failure to prevent blocking
        next();
      }
    };
  };
}

// Define quota_usage table for schema
export const quotaUsage = pgTable("quota_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 50 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  operation: varchar("operation", { length: 50 }).notNull(),
  hourWindow: timestamp("hour_window").notNull(),
  count: integer("count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueConstraint: unique().on(table.userId, table.platform, table.operation, table.hourWindow),
  userPlatformIdx: index("idx_quota_user_platform").on(table.userId, table.platform),
  hourWindowIdx: index("idx_quota_hour_window").on(table.hourWindow),
}));

export const atomicQuotaFix = new AtomicQuotaFix();