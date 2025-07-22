/**
 * Redis-based Video Caching Service for VEO 2.0 responses
 * Implements CDN-style caching with speed optimization
 */

import Redis from 'ioredis';

class VideoCache {
  constructor() {
    this.redis = null;
    this.fallbackCache = new Map(); // In-memory fallback
    this.initRedis();
  }

  async initRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 2000,
        enableOfflineQueue: false,
        maxRetriesPerRequest: null
      });

      // Suppress Redis connection error events
      this.redis.on('error', () => {
        // Silently handle Redis errors - fallback to memory cache
        this.redis = null;
      });

      await this.redis.connect();
      console.log('✅ Redis connected for VEO 2.0 video caching');
    } catch (error) {
      console.log('📦 Using in-memory cache (Redis unavailable)');
      this.redis = null;
    }
  }

  /**
   * Cache video generation response with CDN optimization
   * @param {string} promptHash - Hash of video prompt for caching key
   * @param {Object} videoData - VEO 2.0 response data
   * @param {number} ttl - Time to live in seconds (default 48 hours)
   */
  async cacheVideo(promptHash, videoData, ttl = 48 * 60 * 60) {
    const cacheKey = `veo2:video:${promptHash}`;
    const cacheData = {
      ...videoData,
      cachedAt: Date.now(),
      ttl: ttl
    };

    try {
      if (this.redis) {
        await this.redis.setex(cacheKey, ttl, JSON.stringify(cacheData));
        console.log(`📦 VEO 2.0 video cached with Redis: ${cacheKey}`);
      } else {
        // Fallback to memory cache
        this.fallbackCache.set(cacheKey, {
          data: cacheData,
          expiry: Date.now() + (ttl * 1000)
        });
        console.log(`📦 VEO 2.0 video cached in memory: ${cacheKey}`);
      }
    } catch (error) {
      console.error('❌ Video caching error:', error.message);
    }
  }

  /**
   * Retrieve cached video with CDN-style speed optimization
   * @param {string} promptHash - Hash of video prompt
   * @returns {Object|null} - Cached video data or null
   */
  async getCachedVideo(promptHash) {
    const cacheKey = `veo2:video:${promptHash}`;

    try {
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const videoData = JSON.parse(cached);
          console.log(`⚡ Redis cache hit for VEO 2.0 video: ${cacheKey}`);
          return videoData;
        }
      } else {
        // Check memory cache
        const cached = this.fallbackCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
          console.log(`⚡ Memory cache hit for VEO 2.0 video: ${cacheKey}`);
          return cached.data;
        } else if (cached) {
          // Expired - remove from memory
          this.fallbackCache.delete(cacheKey);
        }
      }

      console.log(`❌ Cache miss for VEO 2.0 video: ${cacheKey}`);
      return null;
    } catch (error) {
      console.error('❌ Video cache retrieval error:', error.message);
      return null;
    }
  }

  /**
   * Generate cache key hash from prompt and config
   * @param {string} prompt - Video generation prompt
   * @param {Object} config - Generation configuration
   * @returns {string} - Hash for caching
   */
  async generateCacheKey(prompt, config) {
    const crypto = await import('crypto');
    const cacheInput = `${prompt}-${JSON.stringify(config)}`;
    return crypto.createHash('md5').update(cacheInput).digest('hex');
  }

  /**
   * Clear expired cache entries (cleanup)
   */
  async clearExpiredCache() {
    if (!this.redis) {
      // Clean memory cache
      const now = Date.now();
      for (const [key, value] of this.fallbackCache.entries()) {
        if (value.expiry <= now) {
          this.fallbackCache.delete(key);
        }
      }
      console.log('🧹 Memory cache cleanup completed');
      return;
    }

    try {
      const keys = await this.redis.keys('veo2:video:*');
      const pipeline = this.redis.pipeline();
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          pipeline.del(key);
        }
      }
      
      await pipeline.exec();
      console.log(`🧹 Redis cache cleanup: ${keys.length} keys processed`);
    } catch (error) {
      console.error('❌ Cache cleanup error:', error.message);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      if (this.redis) {
        const keys = await this.redis.keys('veo2:video:*');
        const memory = await this.redis.memory('usage');
        return {
          type: 'Redis',
          totalKeys: keys.length,
          memoryUsage: memory,
          connected: true
        };
      } else {
        return {
          type: 'Memory',
          totalKeys: this.fallbackCache.size,
          memoryUsage: 'N/A',
          connected: false
        };
      }
    } catch (error) {
      return {
        type: 'Error',
        error: error.message,
        connected: false
      };
    }
  }
}

// Export singleton instance
export default new VideoCache();