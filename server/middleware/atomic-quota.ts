/**
 * Atomic Quota Middleware - Bulletproof Race Condition Prevention
 * Uses Drizzle transactions for atomic quota operations
 */

import { AtomicQuotaManager } from '../services/AtomicQuotaManager.js';

/**
 * Middleware for atomic quota checking and decrementing
 * Prevents race conditions in multi-process environments
 */
export const atomicQuotaMiddleware = (platform: string, operation: string = 'call') => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        console.log('❌ No user ID in session for quota check');
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NO_SESSION'
        });
      }

      console.log(`🔒 Atomic quota check: User ${userId}, ${platform}, ${operation}`);

      // Atomic quota operation with transaction
      const result = await AtomicQuotaManager.atomicQuotaOperation(userId, platform, operation);

      if (!result.success) {
        console.log(`❌ Quota exceeded: ${result.reason}`);
        return res.status(429).json({
          error: 'Quota exceeded',
          reason: result.reason,
          code: 'QUOTA_EXCEEDED',
          retryAfter: 3600 // 1 hour
        });
      }

      console.log(`✅ Quota approved: ${result.remaining} remaining`);
      
      // Attach quota info to request for downstream use
      req.quotaInfo = {
        remaining: result.remaining,
        platform,
        operation
      };

      next();

    } catch (error: any) {
      console.error('❌ Atomic quota middleware error:', error);
      
      // Fail safe - allow operation if quota system fails
      console.log('⚠️ Quota system failed, allowing operation (fail-safe mode)');
      next();
    }
  };
};

/**
 * Read-only quota status middleware (no decrement)
 */
export const quotaStatusMiddleware = async (req: any, res: any, next: any) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      req.quotaStatus = { error: 'No authenticated user' };
      return next();
    }

    // Get comprehensive quota status without decrementing
    const status = await AtomicQuotaManager.getComprehensiveQuotaStatus(userId);
    req.quotaStatus = status;

    next();

  } catch (error: any) {
    console.error('❌ Quota status middleware error:', error);
    req.quotaStatus = { error: 'Failed to retrieve quota status' };
    next();
  }
};

/**
 * Quota validation without decrement (for checks)
 */
export const validateQuotaMiddleware = (platform: string, operation: string = 'call') => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NO_SESSION'
        });
      }

      // Check quota without decrementing
      const quotaStatus = await AtomicQuotaManager.checkQuotaStatus(userId, platform, operation);

      if (!quotaStatus.withinQuota) {
        return res.status(429).json({
          error: 'Quota would be exceeded',
          currentUsage: quotaStatus.currentUsage,
          limit: quotaStatus.limit,
          remaining: quotaStatus.remaining,
          code: 'QUOTA_CHECK_FAILED',
          retryAfter: 3600
        });
      }

      // Attach quota status for downstream use
      req.quotaPreCheck = quotaStatus;
      next();

    } catch (error: any) {
      console.error('❌ Quota validation middleware error:', error);
      // Fail safe - allow operation if quota check fails
      next();
    }
  };
};