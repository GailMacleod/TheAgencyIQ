/**
 * OAuth Routes with Security and PKCE Implementation
 * Handles OAuth initiation, callbacks, and token management
 */

import { Router } from 'express';
import { oauthTokenManager } from '../services/oauth-token-manager';
import { oauthSecurityMiddleware } from '../middleware/oauth-security-middleware';
// For now, we'll create a simple auth guard inline
const authGuard = (req: any, res: any, next: any) => {
  if (req.session && req.session.userId) {
    req.user = { userId: req.session.userId };
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }
};

const router = Router();

/**
 * Initiate OAuth flow for a platform
 * GET /api/oauth/initiate/:platform
 */
router.get('/initiate/:platform', 
  ...oauthSecurityMiddleware.getMiddlewareStack(),
  authGuard,
  async (req: any, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user?.userId || req.session?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User session required'
        });
      }

      const result = await oauthTokenManager.initiateOAuth(platform, userId);
      
      // Redirect to OAuth provider
      res.redirect(result.authUrl);
    } catch (error) {
      console.error(`OAuth initiation failed for ${req.params.platform}:`, error);
      res.status(500).json({
        error: 'OAuth initiation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Handle OAuth callback from platform
 * GET /api/oauth/callback/:platform
 */
router.get('/callback/:platform',
  ...oauthSecurityMiddleware.getCallbackMiddlewareStack(),
  authGuard,
  async (req: any, res) => {
    try {
      const { platform } = req.params;
      const { code, state, error } = req.query;
      const userId = req.user?.userId || req.session?.userId;

      if (!userId) {
        return res.redirect('/connect-platforms?error=unauthorized');
      }

      // Handle OAuth error from provider
      if (error) {
        console.error(`OAuth error from ${platform}:`, error);
        return res.redirect(`/connect-platforms?error=${error}&platform=${platform}`);
      }

      if (!code || !state) {
        return res.redirect('/connect-platforms?error=missing_params');
      }

      const result = await oauthTokenManager.handleCallback(
        platform,
        code as string,
        state as string,
        userId
      );

      if (result.success) {
        // Successful OAuth connection
        res.redirect(`/connect-platforms?success=true&platform=${platform}`);
      } else {
        // OAuth callback failed
        res.redirect(`/connect-platforms?error=callback_failed&platform=${platform}&message=${encodeURIComponent(result.error || 'Unknown error')}`);
      }
    } catch (error) {
      console.error(`OAuth callback failed for ${req.params.platform}:`, error);
      res.redirect('/connect-platforms?error=server_error');
    }
  }
);

/**
 * Refresh OAuth token for a platform
 * POST /api/oauth/refresh/:platform
 */
router.post('/refresh/:platform',
  ...oauthSecurityMiddleware.getMiddlewareStack(),
  authGuard,
  async (req: any, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user?.userId || req.session?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User session required'
        });
      }

      const result = await oauthTokenManager.refreshToken(userId, platform);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Token refreshed successfully'
        });
      } else {
        res.status(400).json({
          error: 'Token refresh failed',
          message: result.error || 'Unknown error'
        });
      }
    } catch (error) {
      console.error(`Token refresh failed for ${req.params.platform}:`, error);
      res.status(500).json({
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Check OAuth connection status for a platform
 * GET /api/oauth/status/:platform
 */
router.get('/status/:platform',
  authGuard,
  async (req: any, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user?.userId || req.session?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User session required'
        });
      }

      const hasValidConnection = await oauthTokenManager.hasValidConnection(userId, platform);
      
      res.json({
        platform,
        connected: hasValidConnection,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Status check failed for ${req.params.platform}:`, error);
      res.status(500).json({
        error: 'Status check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Get OAuth connection status for all platforms
 * GET /api/oauth/status
 */
router.get('/status',
  authGuard,
  async (req: any, res) => {
    try {
      const userId = req.user?.userId || req.session?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User session required'
        });
      }

      const connectionStatus = await oauthTokenManager.getConnectionStatus(userId);
      
      res.json({
        userId,
        platforms: connectionStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Status check failed:', error);
      res.status(500).json({
        error: 'Status check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Revoke OAuth connection for a platform
 * DELETE /api/oauth/revoke/:platform
 */
router.delete('/revoke/:platform',
  ...oauthSecurityMiddleware.getMiddlewareStack(),
  authGuard,
  async (req: any, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user?.userId || req.session?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User session required'
        });
      }

      const success = await oauthTokenManager.revokeConnection(userId, platform);
      
      if (success) {
        res.json({
          success: true,
          message: `${platform} connection revoked successfully`
        });
      } else {
        res.status(500).json({
          error: 'Revocation failed',
          message: 'Failed to revoke connection'
        });
      }
    } catch (error) {
      console.error(`Connection revocation failed for ${req.params.platform}:`, error);
      res.status(500).json({
        error: 'Revocation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Get OAuth configuration for a platform (public info only)
 * GET /api/oauth/config/:platform
 */
router.get('/config/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const config = oauthTokenManager.getPlatformConfig(platform);
    
    if (!config) {
      return res.status(404).json({
        error: 'Platform not found',
        message: `OAuth not configured for platform: ${platform}`
      });
    }

    // Return only public configuration
    res.json({
      platform,
      authUrl: config.authUrl,
      scope: config.scope,
      usePKCE: config.usePKCE,
      configured: !!config.clientId
    });
  } catch (error) {
    console.error(`Config retrieval failed for ${req.params.platform}:`, error);
    res.status(500).json({
      error: 'Config retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;