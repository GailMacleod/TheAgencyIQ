/**
 * Authentication Token Refresh Routes
 * Handles session token refresh for enhanced security
 */

import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { storage } from '../storage';

const router = Router();

/**
 * POST /api/refresh-token
 * Refresh session token for authenticated users
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Validate refresh token format
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid refresh token format'
      });
    }
    
    // Get current session data
    const currentSession = req.session;
    
    // Check if session exists and is valid
    if (!currentSession || !currentSession.userId) {
      return res.status(401).json({
        success: false,
        error: 'No valid session found'
      });
    }
    
    // Get user data to validate session
    const user = await storage.getUserById(currentSession.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Generate new session ID
    const crypto = await import('crypto');
    const newSessionId = crypto.randomBytes(16).toString('hex');
    
    // Update session with new ID
    currentSession.sessionId = newSessionId;
    currentSession.refreshedAt = new Date();
    
    // Calculate new expiry time (24 hours from now)
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    
    // Save session
    await new Promise<void>((resolve, reject) => {
      currentSession.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Set new cookie with enhanced security
    res.cookie('theagencyiq.session', `s:${newSessionId}`, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
      signed: true
    });
    
    console.log(`✅ Session token refreshed for user ${user.email} (ID: ${user.id})`);
    
    res.json({
      success: true,
      sessionId: newSessionId,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan || 'free'
      }
    });
    
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh'
    });
  }
});

/**
 * GET /api/token-status
 * Check current token status and expiry
 */
router.get('/token-status', authGuard, async (req, res) => {
  try {
    const session = req.session;
    const user = req.user;
    
    if (!session || !user) {
      return res.status(401).json({
        valid: false,
        error: 'No valid session found'
      });
    }
    
    // Calculate time until expiry
    const expiryTime = session.cookie.expires?.getTime() || 0;
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    
    res.json({
      valid: true,
      sessionId: session.id,
      userId: user.id,
      expiresAt: expiryTime,
      timeUntilExpiry,
      refreshedAt: session.refreshedAt || null,
      needsRefresh: timeUntilExpiry < (5 * 60 * 1000) // Less than 5 minutes
    });
    
  } catch (error) {
    console.error('❌ Token status error:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error'
    });
  }
});

export default router;