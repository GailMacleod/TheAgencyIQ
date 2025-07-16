/**
 * Authentication Routes with JWT and URL Parameter Support
 * Designed for Replit iframe compatibility
 */

import { Router } from 'express';
import { JWTAuthMiddleware } from '../middleware/jwt-auth';
import { storage } from '../storage';

const router = Router();

/**
 * Establish session with JWT token
 * POST /api/auth/establish-session
 */
router.post('/establish-session', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate user credentials (simplified for demo)
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const authResponse = JWTAuthMiddleware.generateAuthResponse(user.id, user.email);
    
    // Set authentication cookie
    JWTAuthMiddleware.setAuthCookie(res, authResponse.token);
    
    res.json({
      success: true,
      user: { id: user.id, email: user.email },
      ...authResponse
    });
  } catch (error) {
    console.error('Session establishment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Refresh JWT token
 * POST /api/auth/refresh-token
 */
router.post('/refresh-token', JWTAuthMiddleware.authenticate, JWTAuthMiddleware.refreshToken, (req, res) => {
  res.json({ success: true, message: 'Token refreshed successfully' });
});

/**
 * Validate JWT token
 * GET /api/auth/validate-token
 */
router.get('/validate-token', JWTAuthMiddleware.authenticate, (req, res) => {
  res.json({ 
    success: true, 
    valid: true,
    user: { id: (req as any).userId, email: (req as any).userEmail }
  });
});

/**
 * Logout and clear token
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  JWTAuthMiddleware.clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Get current user info (requires authentication)
 * GET /api/auth/user
 */
router.get('/user', JWTAuthMiddleware.authenticate, async (req: any, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        subscriptionActive: user.subscriptionActive,
        subscriptionPlan: user.subscriptionPlan,
        remainingPosts: user.remainingPosts,
        totalPosts: user.totalPosts,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user info'
    });
  }
});

/**
 * Get user status (with optional authentication)
 * GET /api/auth/user-status
 */
router.get('/user-status', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.json({
        authenticated: false,
        message: 'Not authenticated'
      });
    }

    const user = req.user;
    
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        subscriptionActive: user.subscriptionActive,
        subscriptionPlan: user.subscriptionPlan,
        remainingPosts: user.remainingPosts,
        totalPosts: user.totalPosts,
        hasActiveSubscription: user.subscriptionActive
      }
    });
  } catch (error) {
    console.error('Get user status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user status'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/auth/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'JWT Authentication',
    version: '1.0.0'
  });
});

export default router;