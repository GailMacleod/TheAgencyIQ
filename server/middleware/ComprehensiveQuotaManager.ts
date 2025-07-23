import rateLimit from 'express-rate-limit';
import { db } from '../db';
import { sql, eq, and } from 'drizzle-orm';
import { users, postSchedule, quotaUsage, rateLimitStore } from '@shared/schema';
import sgMail from '@sendgrid/mail';
import type { Request, Response, NextFunction } from 'express';

// PostgreSQL-backed rate limit store implementing express-rate-limit Store interface
class PostgreSQLStore {
  name = 'postgresql-store';

  async increment(key: string): Promise<{ totalHits: number; timeWhenNextReset: Date }> {
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0); // Round to hour
    
    try {
      const result = await db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(rateLimits)
          .where(and(
            eq(rateLimits.key, key),
            eq(rateLimits.windowStart, windowStart)
          ))
          .for('update')
          .limit(1);

        const currentCount = existing[0]?.count || 0;
        const newCount = currentCount + 1;

        await tx
          .insert(rateLimits)
          .values({
            key,
            windowStart,
            count: newCount
          })
          .onConflictDoUpdate({
            target: [rateLimits.key, rateLimits.windowStart],
            set: {
              count: sql`${rateLimits.count} + 1`,
              updatedAt: new Date()
            }
          });

        return newCount;
      });

      const nextReset = new Date(windowStart);
      nextReset.setHours(windowStart.getHours() + 1);

      return {
        totalHits: result,
        timeWhenNextReset: nextReset
      };
    } catch (error) {
      console.error('PostgreSQL rate limit store error:', error);
      // Fallback to allow request on store failure
      return {
        totalHits: 1,
        timeWhenNextReset: new Date(Date.now() + 60 * 60 * 1000)
      };
    }
  }

  async decrement(key: string): Promise<void> {
    // Optional: implement if needed for rate limit decrements
  }

  async resetKey(key: string): Promise<void> {
    try {
      await db.delete(rateLimits).where(eq(rateLimits.key, key));
    } catch (error) {
      console.error('PostgreSQL rate limit reset error:', error);
    }
  }
}

export class ComprehensiveQuotaManager {
  // FIXED: Create unique store instances to prevent reuse errors
  private createStore(prefix: string) {
    return new PostgreSQLStore();
  }

  // FIXED: Express rate limiting with proper IPv6 support and unique stores
  getAPIRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      store: this.createStore('api'),
      message: {
        error: 'Too many API requests',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/api/health';
      }
    });
  }

  getSocialPostingRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // posts per hour
      store: this.createStore('social'),
      message: {
        error: 'Too many posts per hour',
        retryAfter: '1 hour'
      },
      keyGenerator: (req: any, defaultKeyGenerator) => {
        // FIXED: Use defaultKeyGenerator for proper IPv6 support
        const userId = req.session?.userId;
        if (userId) {
          return `social_user_${userId}`;
        }
        return `social_ip_${defaultKeyGenerator(req)}`;
      }
    });
  }

  getVEORateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 6, // VEO videos per hour
      store: this.createStore('veo'),
      message: {
        error: 'VEO quota exceeded - 6 videos per hour limit',
        retryAfter: '1 hour'
      },
      keyGenerator: (req: any, defaultKeyGenerator) => {
        // FIXED: Use defaultKeyGenerator for proper IPv6 support
        const userId = req.session?.userId;
        if (userId) {
          return `veo_user_${userId}`;
        }
        return `veo_ip_${defaultKeyGenerator(req)}`;
      }
    });
  }

  // FIXED: Atomic quota checking with Drizzle transactions
  async enforceAutoPosting(userId: string, platform: string): Promise<{ allowed: boolean; remaining: number }> {
    return await db.transaction(async (tx) => {
      // SELECT FOR UPDATE to prevent race conditions
      const user = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update')
        .limit(1);

      if (!user[0]) {
        throw new Error('User not found');
      }

      const currentRemaining = user[0].remainingPosts || 0;

      if (currentRemaining <= 0) {
        // Send low quota alert
        await this.sendQuotaAlert(user[0], 'exhausted');
        
        return {
          allowed: false,
          remaining: 0
        };
      }

      // Send alert when quota is low (< 5 posts)
      if (currentRemaining <= 5) {
        await this.sendQuotaAlert(user[0], 'low');
      }

      // Atomic decrement with quota check
      await tx
        .update(users)
        .set({
          remainingPosts: sql`${users.remainingPosts} - 1`,
          totalPosts: sql`${users.totalPosts} + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Log the quota usage
      await tx
        .insert(quotaUsage)
        .values({
          userId,
          platform,
          operation: 'post',
          hourWindow: new Date(),
          count: 1
        });

      return {
        allowed: true,
        remaining: currentRemaining - 1
      };
    });
  }

  // FIXED: Exponential backoff with retry logic
  async withBackoffRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxRetries - 1) throw error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable) throw error;

        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`⚠️ Retrying operation in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private isRetryableError(error: any): boolean {
    const retryablePatterns = [
      '429', // Rate limit
      'ECONNRESET',
      'ETIMEDOUT',
      'quota',
      'rate limit',
      'timeout'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  // SendGrid quota alerts
  private async sendQuotaAlert(user: any, alertType: 'low' | 'exhausted'): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('📧 SendGrid not configured - quota alert logged only');
      return;
    }

    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const subject = alertType === 'low' 
        ? 'TheAgencyIQ - Low Post Quota Warning'
        : 'TheAgencyIQ - Post Quota Exhausted';

      const message = alertType === 'low'
        ? `You have ${user.remainingPosts} posts remaining in your current plan.`
        : 'Your post quota has been exhausted. Please upgrade your plan to continue posting.';

      const msg = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.ai',
        subject,
        html: `
          <h2>${subject}</h2>
          <p>Hello ${user.firstName || 'there'},</p>
          <p>${message}</p>
          <p>Current Plan: ${user.subscriptionPlan || 'Unknown'}</p>
          <p>Total Posts: ${user.totalPosts || 0}</p>
          <p>Remaining: ${user.remainingPosts || 0}</p>
          <br>
          <p>Best regards,<br>TheAgencyIQ Team</p>
        `
      };

      await sgMail.send(msg);
      console.log(`📧 Quota alert sent to ${user.email}: ${alertType}`);
      
    } catch (error) {
      console.error('SendGrid quota alert error:', error);
    }
  }

  // Middleware for quota enforcement
  quotaEnforcementMiddleware = (platform: string) => {
    return async (req: any, res: any, next: any) => {
      try {
        const userId = req.session?.userId?.toString();
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const quotaResult = await this.enforceAutoPosting(userId, platform);
        
        if (!quotaResult.allowed) {
          return res.status(429).json({
            error: 'Post quota exhausted',
            remaining: quotaResult.remaining,
            platform,
            upgradeRequired: true
          });
        }

        // Add quota info to response
        res.setHeader('X-Quota-Remaining', quotaResult.remaining.toString());
        next();

      } catch (error) {
        console.error('Quota enforcement error:', error);
        // Log error but allow request to prevent blocking
        next();
      }
    };
  };

  // Sync subscribers.json with Drizzle
  async syncSubscribersWithDrizzle(): Promise<void> {
    try {
      console.log('🔄 Syncing subscribers.json with Drizzle...');
      
      // Read subscribers.json if it exists
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const subscribersPath = path.join(process.cwd(), 'data', 'subscribers.json');
      
      try {
        const subscribersData = await fs.readFile(subscribersPath, 'utf-8');
        const subscribers = JSON.parse(subscribersData);
        
        for (const subscriber of subscribers) {
          await db
            .insert(users)
            .values({
              id: subscriber.userId || subscriber.id,
              email: subscriber.email,
              firstName: subscriber.firstName,
              lastName: subscriber.lastName,
              subscriptionPlan: subscriber.plan,
              remainingPosts: subscriber.remainingPosts,
              totalPosts: subscriber.totalPosts,
              subscriptionActive: subscriber.active
            })
            .onConflictDoUpdate({
              target: users.id,
              set: {
                remainingPosts: subscriber.remainingPosts,
                totalPosts: subscriber.totalPosts,
                subscriptionActive: subscriber.active,
                updatedAt: new Date()
              }
            });
        }
        
        console.log(`✅ Synced ${subscribers.length} subscribers to Drizzle`);
        
      } catch (fileError) {
        console.log('📝 No subscribers.json found - using Drizzle only');
      }
      
    } catch (error) {
      console.error('Subscriber sync error:', error);
    }
  }
}

export const comprehensiveQuotaManager = new ComprehensiveQuotaManager();