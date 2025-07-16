/**
 * Rate Limiting Middleware
 * Implements comprehensive rate limiting for API endpoints
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = this.getKey(req);
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanup(now);
    
    const record = this.requests.get(key);
    
    if (!record) {
      this.requests.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return next();
    }
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + this.config.windowMs;
      return next();
    }
    
    if (record.count >= this.config.maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: this.config.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };

  private getKey(req: Request): string {
    // Use session ID if available, otherwise fall back to IP
    const sessionId = (req as any).session?.id;
    const ip = req.ip || req.connection.remoteAddress;
    return sessionId || ip || 'unknown';
  }

  private cleanup(now: number) {
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Pre-configured rate limiters
export const apiRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many API requests. Please try again in 15 minutes.'
}).middleware;

export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again in 15 minutes.'
}).middleware;

export const publishRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 posts per minute
  message: 'Publishing rate limit exceeded. Please wait before posting again.'
}).middleware;

export const signupRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 signups per hour per IP
  message: 'Too many signup attempts. Please try again in an hour.'
}).middleware;

export { RateLimiter };