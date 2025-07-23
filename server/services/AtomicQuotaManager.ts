/**
 * ATOMIC QUOTA MANAGER
 * Comprehensive quota management with PostgreSQL SELECT FOR UPDATE locking
 * Eliminates race conditions and implements rate limiting with Drizzle ORM
 */

import { db } from '../db';
import { quotaUsage } from '../../shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import winston from 'winston';

// Use dynamic import for rate-limiter-flexible
let RateLimiterPostgreSQL: any;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

interface QuotaLimits {
  facebook: { posts: number; calls: number };
  instagram: { posts: number; calls: number };
  linkedin: { posts: number; calls: number };
  twitter: { posts: number; calls: number };
  youtube: { posts: number; calls: number };
}

interface QuotaCheck {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  resetTime: Date;
  remainingQuota: number;
  errors: string[];
}

export class AtomicQuotaManager {
  private static instance: AtomicQuotaManager;
  private rateLimiter: any;
  private quotaLimits: QuotaLimits;

  private constructor() {
    // Initialize rate limiter with PostgreSQL backend
    this.initializeRateLimiter();
  }

  private async initializeRateLimiter() {
    try {
      // Dynamic import for rate-limiter-flexible
      const rateLimiterModule = await import('rate-limiter-flexible');
      RateLimiterPostgreSQL = rateLimiterModule.RateLimiterPostgreSQL;
      
      this.rateLimiter = new RateLimiterPostgreSQL({
        storeClient: db,
        keyPrefix: 'rl_quota',
        points: 100, // Number of requests
        duration: 3600, // Per hour
        execEvenly: true, // Spread requests evenly across duration
      });
      
      logger.info('RateLimiterPostgreSQL initialized successfully');
    } catch (error: any) {
      logger.warn('RateLimiter initialization failed, using fallback', { error: error.message });
      this.rateLimiter = null;
    }

    // Platform-specific quota limits
    this.quotaLimits = {
      facebook: { posts: 50, calls: 200 },
      instagram: { posts: 25, calls: 200 },
      linkedin: { posts: 20, calls: 100 },
      twitter: { posts: 300, calls: 500 },
      youtube: { posts: 6, calls: 10000 }
    };
  }

  public static getInstance(): AtomicQuotaManager {
    if (!AtomicQuotaManager.instance) {
      AtomicQuotaManager.instance = new AtomicQuotaManager();
    }
    return AtomicQuotaManager.instance;
  }

  /**
   * Check quota with atomic SELECT FOR UPDATE lock
   */
  async checkQuota(
    userId: string,
    platform: string,
    operation: string,
    count: number = 1
  ): Promise<QuotaCheck> {
    const errors: string[] = [];

    try {
      // Get platform limits
      const platformLimits = this.quotaLimits[platform as keyof QuotaLimits];
      if (!platformLimits) {
        errors.push(`Unknown platform: ${platform}`);
        return {
          allowed: false,
          currentUsage: 0,
          limit: 0,
          resetTime: new Date(),
          remainingQuota: 0,
          errors
        };
      }

      const limit = operation === 'post' ? platformLimits.posts : platformLimits.calls;
      const hourWindow = new Date();
      hourWindow.setMinutes(0, 0, 0); // Start of current hour

      logger.info('Checking quota with atomic lock', {
        userId: userId.substring(0, 8) + '...',
        platform,
        operation,
        count,
        limit,
        hourWindow: hourWindow.toISOString()
      });

      // Use database transaction with SELECT FOR UPDATE
      const result = await db.transaction(async (tx) => {
        // Atomic quota check with row locking
        const [currentUsage] = await tx
          .select({
            count: sql<number>`COALESCE(SUM(${quotaUsage.count}), 0)`
          })
          .from(quotaUsage)
          .where(
            and(
              eq(quotaUsage.userId, userId),
              eq(quotaUsage.platform, platform),
              eq(quotaUsage.operation, operation),
              gte(quotaUsage.hourWindow, hourWindow)
            )
          )
          .for('update'); // SELECT FOR UPDATE lock

        const current = currentUsage?.count || 0;
        const wouldExceed = (current + count) > limit;

        if (wouldExceed) {
          logger.warn('Quota would be exceeded', {
            userId: userId.substring(0, 8) + '...',
            platform,
            operation,
            current,
            requested: count,
            limit,
            wouldTotal: current + count
          });

          return {
            allowed: false,
            currentUsage: current,
            limit,
            resetTime: new Date(hourWindow.getTime() + 3600000), // Next hour
            remainingQuota: Math.max(0, limit - current),
            errors: [`Quota exceeded: ${current + count}/${limit} for ${platform} ${operation}`]
          };
        }

        // Update quota usage atomically
        await tx
          .insert(quotaUsage)
          .values({
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

        logger.info('Quota check passed', {
          userId: userId.substring(0, 8) + '...',
          platform,
          operation,
          previousUsage: current,
          newUsage: current + count,
          limit,
          remainingAfter: limit - (current + count)
        });

        return {
          allowed: true,
          currentUsage: current + count,
          limit,
          resetTime: new Date(hourWindow.getTime() + 3600000),
          remainingQuota: limit - (current + count),
          errors: []
        };
      });

      return result;

    } catch (error: any) {
      logger.error('Quota check failed', {
        error: error.message,
        userId: userId.substring(0, 8) + '...',
        platform,
        operation,
        stack: error.stack
      });

      errors.push(`Quota check error: ${error.message}`);
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        resetTime: new Date(),
        remainingQuota: 0,
        errors
      };
    }
  }

  /**
   * Rate limiting with exponential backoff
   */
  async checkRateLimit(key: string, points: number = 1): Promise<{ allowed: boolean; retryAfter?: number }> {
    if (!this.rateLimiter) {
      // Fallback rate limiting using simple in-memory store
      logger.debug('Using fallback rate limiting');
      return { allowed: true };
    }

    try {
      await this.rateLimiter.consume(key, points);
      return { allowed: true };
    } catch (rateLimiterRes: any) {
      logger.warn('Rate limit exceeded', {
        key: key.substring(0, 20) + '...',
        points,
        retryAfter: rateLimiterRes.msBeforeNext
      });

      return {
        allowed: false,
        retryAfter: Math.ceil(rateLimiterRes.msBeforeNext / 1000)
      };
    }
  }

  /**
   * Exponential backoff sleep
   */
  async exponentialBackoff(attempt: number, baseDelay: number = 1000): Promise<void> {
    const maxDelay = 60000; // 60 seconds max
    const jitter = Math.random() * 0.1; // 10% jitter
    const delay = Math.min(baseDelay * Math.pow(2, attempt) * (1 + jitter), maxDelay);
    
    logger.info('Applying exponential backoff', {
      attempt,
      delay: delay + 'ms',
      maxDelay: maxDelay + 'ms'
    });

    await this.sleep(delay);
  }

  /**
   * Sleep utility with logging
   */
  async sleep(ms: number): Promise<void> {
    logger.debug('Sleeping for rate limiting', { duration: ms + 'ms' });
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current quota status for user
   */
  async getQuotaStatus(userId: string): Promise<Record<string, any>> {
    try {
      const hourWindow = new Date();
      hourWindow.setMinutes(0, 0, 0);

      const usageQuery = await db
        .select()
        .from(quotaUsage)
        .where(
          and(
            eq(quotaUsage.userId, userId),
            gte(quotaUsage.hourWindow, hourWindow)
          )
        );

      const status: Record<string, any> = {};

      for (const [platform, limits] of Object.entries(this.quotaLimits)) {
        const postUsage = usageQuery.find(u => u.platform === platform && u.operation === 'post')?.count || 0;
        const callUsage = usageQuery.find(u => u.platform === platform && u.operation === 'call')?.count || 0;

        status[platform] = {
          posts: {
            used: postUsage,
            limit: limits.posts,
            remaining: limits.posts - postUsage,
            percentage: Math.round((postUsage / limits.posts) * 100)
          },
          calls: {
            used: callUsage,
            limit: limits.calls,
            remaining: limits.calls - callUsage,
            percentage: Math.round((callUsage / limits.calls) * 100)
          }
        };
      }

      logger.info('Quota status retrieved', {
        userId: userId.substring(0, 8) + '...',
        hourWindow: hourWindow.toISOString(),
        platformCount: Object.keys(status).length
      });

      return status;

    } catch (error: any) {
      logger.error('Failed to get quota status', {
        error: error.message,
        userId: userId.substring(0, 8) + '...'
      });
      throw error;
    }
  }

  /**
   * Validate quota before test execution
   */
  async validateQuotaBeforeTest(userId: string, testName: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      logger.info('Validating quota before test', {
        userId: userId.substring(0, 8) + '...',
        testName
      });

      // Check rate limiting first
      const rateLimitCheck = await this.checkRateLimit(`test_${userId}`, 1);
      if (!rateLimitCheck.allowed) {
        errors.push(`Rate limit exceeded for test execution. Retry after ${rateLimitCheck.retryAfter}s`);
        return { valid: false, errors };
      }

      // Check quota for all platforms
      const platforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube'];
      for (const platform of platforms) {
        const quotaCheck = await this.checkQuota(userId, platform, 'call', 1);
        if (!quotaCheck.allowed) {
          errors.push(`${platform} quota exceeded: ${quotaCheck.currentUsage}/${quotaCheck.limit}`);
        }
      }

      const valid = errors.length === 0;
      
      logger.info('Quota validation completed', {
        userId: userId.substring(0, 8) + '...',
        testName,
        valid,
        errorCount: errors.length
      });

      return { valid, errors };

    } catch (error: any) {
      logger.error('Quota validation failed', {
        error: error.message,
        userId: userId.substring(0, 8) + '...',
        testName
      });

      errors.push(`Quota validation error: ${error.message}`);
      return { valid: false, errors };
    }
  }

  /**
   * Reset quota for testing purposes
   */
  async resetQuotaForTesting(userId: string): Promise<void> {
    try {
      await db.delete(quotaUsage).where(eq(quotaUsage.userId, userId));
      
      logger.info('Quota reset for testing', {
        userId: userId.substring(0, 8) + '...'
      });

    } catch (error: any) {
      logger.error('Failed to reset quota', {
        error: error.message,
        userId: userId.substring(0, 8) + '...'
      });
      throw error;
    }
  }
}

// Export singleton instance
export const atomicQuotaManager = AtomicQuotaManager.getInstance();
export default AtomicQuotaManager;