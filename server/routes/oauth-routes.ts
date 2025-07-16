/**
 * Secure OAuth Routes with Token Refresh and CSRF Protection
 * Addresses the "leaky, no refresh, Replit nightmare" issues
 */

import { Router } from 'express';
import { enhancedOAuthManager } from '../services/enhanced-oauth-manager';
import { OAuthSecurityMiddleware } from '../middleware/oauth-security-middleware';
import { requireAuth } from '../middleware/authGuard';

const router = Router();

/**
 * Initiate OAuth flow with CSRF protection
 * GET /api/oauth/initiate/:platform
 */
router.get('/initiate/:platform', 
  requireAuth,
  OAuthSecurityMiddleware.csrfProtection,
  OAuthSecurityMiddleware.rateLimiter,
  OAuthSecurityMiddleware.securityHeaders,
  OAuthSecurityMiddleware.auditLogger,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const supportedPlatforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube'];
      if (!supportedPlatforms.includes(platform)) {
        return res.status(400).json({ 
          error: 'Unsupported platform',
          supportedPlatforms 
        });
      }

      console.log(`🔐 Initiating OAuth flow for ${platform} - User ${userId}`);

      const result = await enhancedOAuthManager.initiateOAuthFlow(platform, userId);

      if (!result.success) {
        console.error(`❌ OAuth initiation failed for ${platform}:`, result.error);
        return res.status(400).json({
          error: result.error,
          code: 'OAUTH_INITIATION_FAILED'
        });
      }

      // Return auth URL for client redirect
      res.json({
        success: true,
        authUrl: result.authUrl,
        state: result.state,
        platform
      });

    } catch (error) {
      console.error('❌ OAuth initiation error:', error);
      res.status(500).json({ 
        error: 'OAuth initiation failed',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * Handle OAuth callback with state validation
 * GET /api/oauth/callback/:platform
 */
router.get('/callback/:platform',
  OAuthSecurityMiddleware.validateOAuthState,
  OAuthSecurityMiddleware.rateLimiter,
  OAuthSecurityMiddleware.securityHeaders,
  OAuthSecurityMiddleware.auditLogger,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const { code, state, error } = req.query;

      console.log(`🔐 OAuth callback received for ${platform}`);

      if (error) {
        console.error(`❌ OAuth error from ${platform}:`, error);
        return res.redirect(`/connect-platforms?error=${encodeURIComponent(error as string)}&platform=${platform}`);
      }

      if (!code || !state) {
        console.error(`❌ Missing OAuth parameters for ${platform}`);
        return res.redirect(`/connect-platforms?error=missing_parameters&platform=${platform}`);
      }

      const result = await enhancedOAuthManager.handleOAuthCallback(
        platform,
        code as string,
        state as string,
        error as string
      );

      if (!result.success) {
        console.error(`❌ OAuth callback failed for ${platform}:`, result.error);
        const errorParam = result.requiresReauth ? 'reauth_required' : 'callback_failed';
        return res.redirect(`/connect-platforms?error=${errorParam}&platform=${platform}&details=${encodeURIComponent(result.error || '')}`);
      }

      console.log(`✅ OAuth callback successful for ${platform} - User ${result.userId}`);
      
      // Redirect to success page
      res.redirect(`/connect-platforms?success=true&platform=${platform}`);

    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      res.redirect(`/connect-platforms?error=internal_error&platform=${req.params.platform}`);
    }
  }
);

/**
 * Refresh OAuth token
 * POST /api/oauth/refresh/:platform
 */
router.post('/refresh/:platform',
  requireAuth,
  OAuthSecurityMiddleware.rateLimiter,
  OAuthSecurityMiddleware.securityHeaders,
  OAuthSecurityMiddleware.auditLogger,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`🔄 Token refresh requested for ${platform} - User ${userId}`);

      const result = await enhancedOAuthManager.refreshAccessToken(userId, platform);

      if (!result.success) {
        console.error(`❌ Token refresh failed for ${platform}:`, result.error);
        return res.status(400).json({
          error: result.error,
          requiresReauth: result.requiresReauth,
          code: 'TOKEN_REFRESH_FAILED'
        });
      }

      console.log(`✅ Token refreshed successfully for ${platform} - User ${userId}`);

      res.json({
        success: true,
        platform,
        expiresAt: result.expiresAt,
        message: 'Token refreshed successfully'
      });

    } catch (error) {
      console.error('❌ Token refresh error:', error);
      res.status(500).json({ 
        error: 'Token refresh failed',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * Get valid access token (with automatic refresh)
 * GET /api/oauth/token/:platform
 */
router.get('/token/:platform',
  requireAuth,
  OAuthSecurityMiddleware.rateLimiter,
  OAuthSecurityMiddleware.securityHeaders,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = await enhancedOAuthManager.getValidAccessToken(userId, platform);

      if (!token) {
        return res.status(404).json({
          error: 'No valid token available',
          requiresReauth: true,
          code: 'TOKEN_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        platform,
        hasToken: true,
        // Note: Never send actual token in response for security
        message: 'Valid token available'
      });

    } catch (error) {
      console.error('❌ Token retrieval error:', error);
      res.status(500).json({ 
        error: 'Token retrieval failed',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * Validate token status
 * GET /api/oauth/validate/:platform
 */
router.get('/validate/:platform',
  requireAuth,
  OAuthSecurityMiddleware.rateLimiter,
  OAuthSecurityMiddleware.securityHeaders,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validation = await enhancedOAuthManager.validateToken(userId, platform);

      res.json({
        success: true,
        platform,
        isValid: validation.isValid,
        needsRefresh: validation.needsRefresh,
        error: validation.error
      });

    } catch (error) {
      console.error('❌ Token validation error:', error);
      res.status(500).json({ 
        error: 'Token validation failed',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * Revoke OAuth connection
 * DELETE /api/oauth/revoke/:platform
 */
router.delete('/revoke/:platform',
  requireAuth,
  OAuthSecurityMiddleware.rateLimiter,
  OAuthSecurityMiddleware.securityHeaders,
  OAuthSecurityMiddleware.auditLogger,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Delete tokens from secure storage
      const { db } = await import('../db');
      const { sql } = await import('drizzle-orm');
      
      await db.execute(sql`
        DELETE FROM platform_tokens
        WHERE user_id = ${userId} AND platform = ${platform}
      `);

      console.log(`🗑️ OAuth connection revoked for ${platform} - User ${userId}`);

      res.json({
        success: true,
        platform,
        message: 'OAuth connection revoked successfully'
      });

    } catch (error) {
      console.error('❌ OAuth revocation error:', error);
      res.status(500).json({ 
        error: 'OAuth revocation failed',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Apply error handler
router.use(OAuthSecurityMiddleware.errorHandler);

export default router;