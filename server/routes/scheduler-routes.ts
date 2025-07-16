/**
 * Auto-Post Scheduler Routes
 * API endpoints for scheduling and managing auto-posts
 */

import { Router } from 'express';
import { AutoPostScheduler } from '../services/auto-post-scheduler';
import { QuotaManager } from '../services/quota-manager';
import { SessionIframeFix } from '../session-iframe-fix';

const router = Router();

/**
 * Schedule a new post
 * POST /api/scheduler/schedule
 */
router.post('/schedule', SessionIframeFix.authGuard, async (req, res) => {
  try {
    const { content, platforms, scheduledTime, maxRetries = 3 } = req.body;
    
    if (!content || !platforms || !scheduledTime) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'content, platforms, and scheduledTime are required'
      });
    }
    
    // Validate platforms
    const validPlatforms = ['Facebook', 'Instagram', 'LinkedIn', 'X', 'YouTube'];
    const invalidPlatforms = platforms.filter((p: string) => !validPlatforms.includes(p));
    
    if (invalidPlatforms.length > 0) {
      return res.status(400).json({
        error: 'Invalid platforms',
        message: `Invalid platforms: ${invalidPlatforms.join(', ')}`
      });
    }
    
    // Check quota for all platforms
    const quotaChecks = await Promise.all(
      platforms.map(async (platform: string) => {
        const hasQuota = await QuotaManager.checkQuota(platform);
        return { platform, hasQuota };
      })
    );
    
    const unavailablePlatforms = quotaChecks
      .filter(check => !check.hasQuota)
      .map(check => check.platform);
    
    if (unavailablePlatforms.length > 0) {
      return res.status(400).json({
        error: 'Quota exhausted',
        message: `No quota available for: ${unavailablePlatforms.join(', ')}`
      });
    }
    
    // Schedule the post
    const postId = await AutoPostScheduler.schedulePost(
      content,
      platforms,
      new Date(scheduledTime),
      maxRetries
    );
    
    res.json({
      success: true,
      postId,
      message: 'Post scheduled successfully'
    });
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({
      error: 'Failed to schedule post',
      message: 'Unable to schedule post'
    });
  }
});

/**
 * Get scheduler status
 * GET /api/scheduler/status
 */
router.get('/status', SessionIframeFix.authGuard, async (req, res) => {
  try {
    const stats = AutoPostScheduler.getStats();
    const scheduledPosts = AutoPostScheduler.getScheduledPosts();
    
    res.json({
      success: true,
      stats,
      scheduledPosts
    });
  } catch (error) {
    console.error('Get scheduler status error:', error);
    res.status(500).json({
      error: 'Failed to get scheduler status',
      message: 'Unable to retrieve scheduler status'
    });
  }
});

/**
 * Get specific post status
 * GET /api/scheduler/post/:postId
 */
router.get('/post/:postId', SessionIframeFix.authGuard, async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = AutoPostScheduler.getPostStatus(postId);
    
    if (!post) {
      return res.status(404).json({
        error: 'Post not found',
        message: 'Scheduled post not found'
      });
    }
    
    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Get post status error:', error);
    res.status(500).json({
      error: 'Failed to get post status',
      message: 'Unable to retrieve post status'
    });
  }
});

/**
 * Cancel scheduled post
 * DELETE /api/scheduler/post/:postId
 */
router.delete('/post/:postId', SessionIframeFix.authGuard, async (req, res) => {
  try {
    const postId = req.params.postId;
    const cancelled = AutoPostScheduler.cancelPost(postId);
    
    if (!cancelled) {
      return res.status(404).json({
        error: 'Post not found or cannot be cancelled',
        message: 'Post not found or already completed'
      });
    }
    
    res.json({
      success: true,
      message: 'Post cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel post error:', error);
    res.status(500).json({
      error: 'Failed to cancel post',
      message: 'Unable to cancel post'
    });
  }
});

/**
 * Start scheduler
 * POST /api/scheduler/start
 */
router.post('/start', SessionIframeFix.authGuard, async (req, res) => {
  try {
    AutoPostScheduler.start();
    
    res.json({
      success: true,
      message: 'Scheduler started successfully'
    });
  } catch (error) {
    console.error('Start scheduler error:', error);
    res.status(500).json({
      error: 'Failed to start scheduler',
      message: 'Unable to start scheduler'
    });
  }
});

/**
 * Stop scheduler
 * POST /api/scheduler/stop
 */
router.post('/stop', SessionIframeFix.authGuard, async (req, res) => {
  try {
    AutoPostScheduler.stop();
    
    res.json({
      success: true,
      message: 'Scheduler stopped successfully'
    });
  } catch (error) {
    console.error('Stop scheduler error:', error);
    res.status(500).json({
      error: 'Failed to stop scheduler',
      message: 'Unable to stop scheduler'
    });
  }
});

export default router;