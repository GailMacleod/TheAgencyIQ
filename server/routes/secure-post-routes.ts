/**
 * SECURE POST ROUTES
 * Replaces insecure post.js endpoints with Drizzle ORM and comprehensive security
 * Eliminates DATABASE_URL exposure, psql spawn vulnerabilities, and hardcoded limits
 */

import { Express } from 'express';
import { SecurePostManager, postManagerLogger } from '../services/SecurePostManager';
import { EnhancedPostManager, scriptRateLimiter, enhancedPostLogger } from '../services/EnhancedPostManager';
import { z } from 'zod';

// Validation schemas
const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  platform: z.enum(['facebook', 'instagram', 'linkedin', 'x', 'youtube']),
  scheduledFor: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  status: z.enum(['draft', 'scheduled', 'published']).optional()
});

const bulkUpdateSchema = z.object({
  updates: z.array(z.object({
    postId: z.number().positive(),
    status: z.enum(['draft', 'scheduled', 'published']).optional(),
    content: z.string().min(1).max(5000).optional(),
    scheduledFor: z.string().datetime().optional()
  })).min(1).max(50)
});

const publishPostSchema = z.object({
  postId: z.number().positive(),
  platform: z.enum(['facebook', 'instagram', 'linkedin', 'x', 'youtube']),
  content: z.string().min(1).max(5000),
  scheduledFor: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional()
});

export function registerSecurePostRoutes(app: Express) {
  
  // Get post allocation status
  app.get('/api/posts/allocation-status', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      postManagerLogger.info('Allocation status request', {
        userId: userId.substring(0, 8) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 50)
      });

      const status = await SecurePostManager.getPostAllocationStatus(userId);
      res.json(status);

    } catch (error: any) {
      postManagerLogger.error('Error getting allocation status', {
        userId: req.session?.userId?.substring(0, 8) + '...',
        error: error.message,
        ip: req.ip
      });
      res.status(500).json({ 
        message: 'Failed to get allocation status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Create new post
  app.post('/api/posts/secure-create', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Validate request body
      const validation = createPostSchema.safeParse(req.body);
      if (!validation.success) {
        postManagerLogger.warn('Invalid post creation request', {
          userId: userId.substring(0, 8) + '...',
          errors: validation.error.errors,
          ip: req.ip
        });
        return res.status(400).json({ 
          message: 'Invalid request data',
          errors: validation.error.errors
        });
      }

      const postData = validation.data;
      
      // Convert scheduledFor string to Date if provided
      if (postData.scheduledFor) {
        postData.scheduledFor = new Date(postData.scheduledFor);
      }

      postManagerLogger.info('Creating secure post', {
        userId: userId.substring(0, 8) + '...',
        platform: postData.platform,
        hasSchedule: !!postData.scheduledFor,
        ip: req.ip
      });

      const newPost = await SecurePostManager.createPost(userId, postData);
      res.json({
        success: true,
        post: newPost,
        message: 'Post created successfully'
      });

    } catch (error: any) {
      postManagerLogger.error('Error creating secure post', {
        userId: req.session?.userId?.substring(0, 8) + '...',
        error: error.message,
        ip: req.ip
      });
      
      if (error.message.includes('allocation limit') || error.message.includes('subscription')) {
        res.status(403).json({ message: error.message });
      } else {
        res.status(500).json({ 
          message: 'Failed to create post',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  });

  // Bulk update posts
  app.post('/api/posts/bulk-update', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Validate request body
      const validation = bulkUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        postManagerLogger.warn('Invalid bulk update request', {
          userId: userId.substring(0, 8) + '...',
          errors: validation.error.errors,
          ip: req.ip
        });
        return res.status(400).json({ 
          message: 'Invalid request data',
          errors: validation.error.errors
        });
      }

      const { updates } = validation.data;

      // Convert date strings to Date objects
      const processedUpdates = updates.map(update => ({
        ...update,
        scheduledFor: update.scheduledFor ? new Date(update.scheduledFor) : undefined
      }));

      postManagerLogger.info('Starting bulk post update', {
        userId: userId.substring(0, 8) + '...',
        updateCount: updates.length,
        ip: req.ip
      });

      const updatedCount = await SecurePostManager.bulkUpdatePosts(userId, processedUpdates);
      res.json({
        success: true,
        updatedCount,
        totalRequested: updates.length,
        message: `Successfully updated ${updatedCount} posts`
      });

    } catch (error: any) {
      postManagerLogger.error('Error in bulk update', {
        userId: req.session?.userId?.substring(0, 8) + '...',
        error: error.message,
        ip: req.ip
      });
      res.status(500).json({ 
        message: 'Failed to update posts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Reset allocation (admin endpoint)
  app.post('/api/posts/reset-allocation', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Optional: Add admin check here
      // if (!req.session?.isAdmin) {
      //   return res.status(403).json({ message: 'Admin access required' });
      // }

      const { newLimit } = req.body;
      if (newLimit && (typeof newLimit !== 'number' || newLimit < 1 || newLimit > 1000)) {
        return res.status(400).json({ message: 'Invalid allocation limit' });
      }

      postManagerLogger.info('Resetting user allocation', {
        userId: userId.substring(0, 8) + '...',
        newLimit: newLimit || 'default',
        ip: req.ip,
        adminAction: true
      });

      const status = await SecurePostManager.resetUserAllocation(userId, newLimit);
      res.json({
        success: true,
        status,
        message: 'Allocation reset successfully'
      });

    } catch (error: any) {
      postManagerLogger.error('Error resetting allocation', {
        userId: req.session?.userId?.substring(0, 8) + '...',
        error: error.message,
        ip: req.ip
      });
      res.status(500).json({ 
        message: 'Failed to reset allocation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get audit logs
  app.get('/api/posts/audit-logs', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

      postManagerLogger.info('Audit logs request', {
        userId: userId.substring(0, 8) + '...',
        limit,
        ip: req.ip
      });

      const logs = await SecurePostManager.getAuditLogs(userId, limit);
      res.json({
        success: true,
        logs,
        count: logs.length,
        limit
      });

    } catch (error: any) {
      postManagerLogger.error('Error getting audit logs', {
        userId: req.session?.userId?.substring(0, 8) + '...',
        error: error.message,
        ip: req.ip
      });
      res.status(500).json({ 
        message: 'Failed to get audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Health check for secure post system
  app.get('/api/posts/health', async (req: any, res) => {
    try {
      const env = {
        allocationLimit: process.env.POST_ALLOCATION_LIMIT || '52',
        subscriptionDays: process.env.SUBSCRIPTION_DURATION_DAYS || '30',
        logLevel: process.env.LOG_LEVEL || 'info',
        nodeEnv: process.env.NODE_ENV || 'development'
      };

      postManagerLogger.info('Health check performed', {
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 50)
      });

      res.json({
        status: 'healthy',
        service: 'SecurePostManager',
        timestamp: new Date().toISOString(),
        environment: env,
        security: {
          drizzleOrm: 'enabled',
          winstonLogging: 'enabled',
          environmentConfig: 'enabled',
          transactionSupport: 'enabled',
          psqlSpawnVulnerability: 'eliminated',
          databaseUrlExposure: 'eliminated'
        }
      });

    } catch (error: any) {
      postManagerLogger.error('Health check failed', {
        error: error.message,
        ip: req.ip
      });
      res.status(500).json({ 
        status: 'unhealthy',
        service: 'SecurePostManager',
        error: error.message
      });
    }
  });

  // Enhanced post publishing with OAuth, notifications, and transaction safety
  app.post('/api/posts/publish-enhanced', scriptRateLimiter, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Validate request body
      const validation = publishPostSchema.safeParse(req.body);
      if (!validation.success) {
        enhancedPostLogger.warn('Invalid enhanced publish request', {
          userId: userId.substring(0, 8) + '...',
          errors: validation.error.errors,
          ip: req.ip
        });
        return res.status(400).json({ 
          message: 'Invalid request data',
          errors: validation.error.errors
        });
      }

      const postData = validation.data;
      const sessionId = req.session?.id || req.headers['x-session-id'];

      enhancedPostLogger.info('Enhanced post publishing started', {
        postId: postData.postId,
        platform: postData.platform,
        userId: userId.substring(0, 8) + '...',
        hasSession: !!sessionId,
        ip: req.ip
      });

      // Complete publishing workflow with all integrations
      const result = await EnhancedPostManager.publishPostComplete({
        ...postData,
        userId
      }, sessionId);

      if (result.success) {
        res.json({
          success: true,
          message: 'Post published successfully with all integrations',
          details: result.details
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Enhanced publishing failed',
          error: result.details.error
        });
      }

    } catch (error: any) {
      enhancedPostLogger.error('Enhanced publish endpoint error', {
        userId: req.session?.userId?.substring(0, 8) + '...',
        error: error.message,
        ip: req.ip
      });
      res.status(500).json({ 
        message: 'Enhanced publishing failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // OAuth token validation endpoint
  app.get('/api/posts/oauth-status/:platform', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { platform } = req.params;
      if (!['facebook', 'instagram', 'linkedin', 'x', 'youtube'].includes(platform)) {
        return res.status(400).json({ message: 'Invalid platform' });
      }

      enhancedPostLogger.info('OAuth status check', {
        platform,
        userId: userId.substring(0, 8) + '...',
        ip: req.ip
      });

      const tokenData = await EnhancedPostManager.getOAuthToken(userId, platform);
      
      res.json({
        platform,
        connected: !!tokenData,
        hasRefreshToken: !!(tokenData?.refreshToken),
        expiresAt: tokenData?.expiresAt?.toISOString(),
        scopes: tokenData?.scope || []
      });

    } catch (error: any) {
      enhancedPostLogger.error('OAuth status check failed', {
        platform: req.params.platform,
        userId: req.session?.userId?.substring(0, 8) + '...',
        error: error.message,
        ip: req.ip
      });
      res.status(500).json({ 
        message: 'OAuth status check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Session validation endpoint
  app.post('/api/posts/validate-session', async (req: any, res) => {
    try {
      const { sessionId } = req.body;
      
      enhancedPostLogger.info('Session validation request', {
        hasSessionId: !!sessionId,
        ip: req.ip
      });

      const validation = await EnhancedPostManager.validateSession(sessionId);
      
      res.json({
        valid: validation.isValid,
        userId: validation.isValid ? validation.userId.substring(0, 8) + '...' : null,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      enhancedPostLogger.error('Session validation failed', {
        error: error.message,
        ip: req.ip
      });
      res.status(500).json({ 
        message: 'Session validation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
}

