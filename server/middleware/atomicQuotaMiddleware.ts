import { Request, Response, NextFunction } from 'express';
import { AtomicQuotaManager } from './AtomicQuotaManager';

interface QuotaRequest extends Request {
  quotaCheck?: {
    allowed: boolean;
    remaining: number;
    message: string;
  };
}

export function atomicQuotaMiddleware(platform: string, operation: string = 'post') {
  return async (req: QuotaRequest, res: Response, next: NextFunction) => {
    try {
      // Get user ID from session or request
      const userId = req.session?.userId || req.body?.userId || req.params?.userId;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required for quota enforcement',
          code: 'QUOTA_AUTH_REQUIRED'
        });
      }

      // Get user plan (default to professional)
      const userPlan = req.session?.userPlan || 'professional';

      // Enforce quota with atomic operations
      const quotaResult = await AtomicQuotaManager.enforceQuota(
        userId,
        platform,
        operation,
        userPlan
      );

      // Store quota result in request for later use
      req.quotaCheck = quotaResult;

      if (!quotaResult.allowed) {
        return res.status(429).json({
          error: quotaResult.message,
          remaining: quotaResult.remaining,
          code: 'QUOTA_EXCEEDED',
          retryAfter: 3600 // 1 hour in seconds
        });
      }

      // Quota allowed, continue to next middleware
      console.log(`✅ Quota check passed: ${quotaResult.message}`);
      next();

    } catch (error) {
      console.error('Quota middleware error:', error);
      
      // On quota system failure, allow request but log error
      // This prevents quota system issues from breaking the entire app
      console.log('⚠️ Quota check failed, allowing request to proceed');
      next();
    }
  };
}

// Specific quota middleware for different operations
export const videoQuotaMiddleware = atomicQuotaMiddleware('veo', 'video');
export const facebookQuotaMiddleware = atomicQuotaMiddleware('facebook', 'post');
export const instagramQuotaMiddleware = atomicQuotaMiddleware('instagram', 'post');
export const linkedinQuotaMiddleware = atomicQuotaMiddleware('linkedin', 'post');
export const twitterQuotaMiddleware = atomicQuotaMiddleware('twitter', 'post');
export const youtubeQuotaMiddleware = atomicQuotaMiddleware('youtube', 'post');

// Generic posting quota middleware that checks all platforms
export const generalPostingQuotaMiddleware = (req: QuotaRequest, res: Response, next: NextFunction) => {
  const platform = req.body?.platform || req.params?.platform || 'general';
  return atomicQuotaMiddleware(platform, 'post')(req, res, next);
};