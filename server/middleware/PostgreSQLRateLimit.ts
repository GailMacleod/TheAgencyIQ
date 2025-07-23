import rateLimit from 'express-rate-limit';
import { db } from '../db';
import { rateLimitStore } from '@shared/schema';
import { sql, eq, and, lte } from 'drizzle-orm';

// Custom PostgreSQL store for express-rate-limit
class PostgreSQLStore {
  windowMs: number;

  constructor(windowMs: number = 15 * 60 * 1000) {
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; timeToExpire?: number }> {
    try {
      const now = new Date();
      const windowStart = new Date(Math.floor(now.getTime() / this.windowMs) * this.windowMs);

      const result = await db.transaction(async (tx) => {
        // Check existing record
        const existing = await tx
          .select()
          .from(rateLimitStore)
          .where(
            and(
              eq(rateLimitStore.key, key),
              eq(rateLimitStore.windowStart, windowStart)
            )
          )
          .for('update');

        if (existing.length > 0) {
          // Update existing record
          const newHits = existing[0].hits + 1;
          await tx
            .update(rateLimitStore)
            .set({ 
              hits: newHits,
              updatedAt: new Date()
            })
            .where(eq(rateLimitStore.id, existing[0].id));

          return { totalHits: newHits };
        } else {
          // Create new record
          await tx.insert(rateLimitStore).values({
            key,
            hits: 1,
            windowStart,
            windowMs: this.windowMs
          });

          return { totalHits: 1 };
        }
      });

      const timeToExpire = Math.max(0, windowStart.getTime() + this.windowMs - now.getTime());
      return { ...result, timeToExpire };

    } catch (error) {
      console.error('PostgreSQL rate limit store error:', error);
      // Return safe fallback
      return { totalHits: 1 };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const now = new Date();
      const windowStart = new Date(Math.floor(now.getTime() / this.windowMs) * this.windowMs);

      await db
        .update(rateLimitStore)
        .set({ 
          hits: sql`GREATEST(${rateLimitStore.hits} - 1, 0)`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(rateLimitStore.key, key),
            eq(rateLimitStore.windowStart, windowStart)
          )
        );

    } catch (error) {
      console.error('PostgreSQL rate limit decrement error:', error);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await db
        .delete(rateLimitStore)
        .where(eq(rateLimitStore.key, key));

    } catch (error) {
      console.error('PostgreSQL rate limit reset error:', error);
    }
  }

  async resetAll(): Promise<void> {
    try {
      await db.delete(rateLimitStore);
    } catch (error) {
      console.error('PostgreSQL rate limit reset all error:', error);
    }
  }
}

// Helper function to create rate limiters with PostgreSQL store
function createPostgreSQLRateLimit(
  windowMs: number,
  maxRequests: number,
  message: string,
  skipPaths: string[] = []
) {
  const store = new PostgreSQLStore(windowMs);

  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    store,
    // Simple key generator to avoid IPv6 issues
    keyGenerator: (req) => {
      const userId = req.session?.userId || 'anonymous';
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      return `${userId}:${ip}`;
    },
    skip: (req) => {
      // Skip rate limiting for specified paths
      return skipPaths.some(path => req.path.startsWith(path)) ||
             req.path === '/health' ||
             req.path === '/api/health' ||
             req.path.startsWith('/dist/') ||
             req.path.startsWith('/assets/');
    },
    onLimitReached: (req, res, options) => {
      console.log(`⚠️ Rate limit reached for ${req.ip}: ${req.path}`);
    }
  });
}

// Pre-configured rate limiters
export const apiRateLimit = createPostgreSQLRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many API requests, please try again later'
);

export const authRateLimit = createPostgreSQLRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 auth attempts per window
  'Too many authentication attempts, please try again later',
  ['/api/auth/', '/auth/']
);

export const videoRateLimit = createPostgreSQLRateLimit(
  60 * 60 * 1000, // 1 hour
  6, // 6 video generations per hour
  'Video generation limit reached, please try again later'
);

export const postingRateLimit = createPostgreSQLRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // 50 posts per window
  'Posting limit reached, please slow down'
);

// Cleanup function for old rate limit records
export async function cleanupRateLimitStore(): Promise<void> {
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24); // Remove records older than 24 hours

    const result = await db
      .delete(rateLimitStore)
      .where(lte(rateLimitStore.windowStart, cutoff));

    console.log(`✅ Cleaned up old rate limit records older than 24 hours`);
    
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
  }
}

// Auto-cleanup scheduler (run every hour)
setInterval(cleanupRateLimitStore, 60 * 60 * 1000);