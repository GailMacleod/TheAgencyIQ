/**
 * Quota Management Routes
 * API endpoints for quota tracking and management
 */

import { Router } from 'express';
import { QuotaManager } from '../services/quota-manager';
import { SessionIframeFix } from '../session-iframe-fix';

const router = Router();

/**
 * Get quota status for all platforms
 * GET /api/quota/status
 */
router.get('/status', SessionIframeFix.authGuard, async (req, res) => {
  try {
    const quotaStatus = await QuotaManager.getQuotaStatus();
    
    res.json({
      success: true,
      quotas: quotaStatus
    });
  } catch (error) {
    console.error('Get quota status error:', error);
    res.status(500).json({
      error: 'Failed to get quota status',
      message: 'Unable to retrieve quota information'
    });
  }
});

/**
 * Get quota summary for dashboard
 * GET /api/quota/summary
 */
router.get('/summary', SessionIframeFix.authGuard, async (req, res) => {
  try {
    const quotaSummary = await QuotaManager.getQuotaSummary();
    
    res.json({
      success: true,
      summary: quotaSummary
    });
  } catch (error) {
    console.error('Get quota summary error:', error);
    res.status(500).json({
      error: 'Failed to get quota summary',
      message: 'Unable to retrieve quota summary'
    });
  }
});

/**
 * Check quota for specific platform
 * GET /api/quota/check/:platform
 */
router.get('/check/:platform', SessionIframeFix.authGuard, async (req, res) => {
  try {
    const platform = req.params.platform;
    const hasQuota = await QuotaManager.checkQuota(platform);
    const remaining = await QuotaManager.getRemainingQuota(platform);
    
    res.json({
      success: true,
      platform,
      hasQuota,
      remaining
    });
  } catch (error) {
    console.error('Check quota error:', error);
    res.status(500).json({
      error: 'Failed to check quota',
      message: 'Unable to check platform quota'
    });
  }
});

/**
 * Reset quota for specific platform (admin only)
 * POST /api/quota/reset/:platform
 */
router.post('/reset/:platform', SessionIframeFix.authGuard, async (req, res) => {
  try {
    const platform = req.params.platform;
    await QuotaManager.resetQuota(platform);
    
    res.json({
      success: true,
      message: `Quota reset for ${platform}`
    });
  } catch (error) {
    console.error('Reset quota error:', error);
    res.status(500).json({
      error: 'Failed to reset quota',
      message: 'Unable to reset platform quota'
    });
  }
});

/**
 * Get remaining quota for specific platform
 * GET /api/quota/remaining/:platform
 */
router.get('/remaining/:platform', SessionIframeFix.authGuard, async (req, res) => {
  try {
    const platform = req.params.platform;
    const remaining = await QuotaManager.getRemainingQuota(platform);
    const isAtLimit = await QuotaManager.isAtQuotaLimit(platform);
    
    res.json({
      success: true,
      platform,
      remaining,
      isAtLimit
    });
  } catch (error) {
    console.error('Get remaining quota error:', error);
    res.status(500).json({
      error: 'Failed to get remaining quota',
      message: 'Unable to get remaining quota'
    });
  }
});

export default router;