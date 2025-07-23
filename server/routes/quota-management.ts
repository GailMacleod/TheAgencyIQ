import { Express, Request, Response } from 'express';
import { AtomicQuotaManager } from '../middleware/AtomicQuotaManager';
import { cleanupRateLimitStore } from '../middleware/PostgreSQLRateLimit';

interface QuotaRequest extends Request {
  session: any;
  quotaCheck?: {
    allowed: boolean;
    remaining: number;
    message: string;
  };
}

export function registerQuotaManagementRoutes(app: Express) {
  
  // Get quota status for authenticated user
  app.get('/api/quota-status', async (req: QuotaRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'QUOTA_AUTH_REQUIRED'
        });
      }

      const userPlan = req.session?.userPlan || 'professional';
      const quotaStatus = await AtomicQuotaManager.getQuotaStatus(userId, userPlan);

      res.json({
        success: true,
        quota: quotaStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Quota status error:', error);
      res.status(500).json({
        error: 'Failed to get quota status',
        code: 'QUOTA_STATUS_ERROR'
      });
    }
  });

  // Manual quota cleanup endpoint (admin use)
  app.post('/api/admin/quota-cleanup', async (req: QuotaRequest, res: Response) => {
    try {
      // Add admin authorization check here if needed
      await AtomicQuotaManager.cleanupOldQuotaRecords();
      await cleanupRateLimitStore();

      res.json({
        success: true,
        message: 'Quota cleanup completed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Quota cleanup error:', error);
      res.status(500).json({
        error: 'Failed to cleanup quota records',
        code: 'QUOTA_CLEANUP_ERROR'
      });
    }
  });

  // Check specific platform quota without consuming it
  app.get('/api/quota-check/:platform/:operation', async (req: QuotaRequest, res: Response) => {
    try {
      const { platform, operation } = req.params;
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'QUOTA_AUTH_REQUIRED'
        });
      }

      const userPlan = req.session?.userPlan || 'professional';
      
      // Get current quota without consuming it
      const quotaStatus = await AtomicQuotaManager.getQuotaStatus(userId, userPlan);
      const platformStatus = quotaStatus.platforms[platform];

      if (!platformStatus) {
        return res.status(400).json({
          error: `Invalid platform: ${platform}`,
          code: 'INVALID_PLATFORM'
        });
      }

      const operationStatus = platformStatus[operation];
      
      if (!operationStatus) {
        return res.status(400).json({
          error: `Invalid operation: ${operation}`,
          code: 'INVALID_OPERATION'
        });
      }

      res.json({
        success: true,
        platform,
        operation,
        quota: operationStatus,
        allowed: operationStatus.remaining > 0,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Quota check error:', error);
      res.status(500).json({
        error: 'Failed to check quota',
        code: 'QUOTA_CHECK_ERROR'
      });
    }
  });

  console.log('✅ Quota management routes registered');
}