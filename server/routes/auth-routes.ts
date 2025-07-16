import { Router } from 'express';
import { jwtSessionManager } from '../services/jwt-session-manager';
import { replitAuthManager } from '../services/replit-auth-manager';
import { quotaManager } from '../services/quota-manager';
import { storage } from '../storage';
import bcrypt from 'bcrypt';

const router = Router();

// Session creation endpoint
router.post('/session', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password (assuming you have password hashing)
    const isValidPassword = await bcrypt.compare(password, user.password || '');
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT session
    const token = await jwtSessionManager.createSession(user.id, user.email);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session validation endpoint
router.get('/session/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const sessionData = await jwtSessionManager.validateSession(token);
    
    if (!sessionData) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      valid: true,
      user: {
        id: sessionData.userId,
        email: sessionData.email
      }
    });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session refresh endpoint
router.post('/session/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const newToken = await jwtSessionManager.refreshSession(token);
    
    if (!newToken) {
      return res.status(401).json({ error: 'Unable to refresh token' });
    }

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Session refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      await jwtSessionManager.destroySession(token);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email verification
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const sent = await replitAuthManager.sendEmailVerification(email);
    
    res.json({
      success: sent,
      message: sent ? 'Verification code sent' : 'Failed to send verification code'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }

    const isValid = await replitAuthManager.verifyEmailCode(email, code);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Code verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth initiation
router.post('/oauth/initiate', async (req, res) => {
  try {
    const { platform, userId } = req.body;
    
    if (!platform || !userId) {
      return res.status(400).json({ error: 'Platform and userId required' });
    }

    const result = await replitAuthManager.initiateOAuthFlow(platform, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      authUrl: result.authUrl,
      state: result.state
    });
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth callback
router.get('/callback/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Code and state required' });
    }

    const result = await replitAuthManager.handleOAuthCallback(
      platform,
      code as string,
      state as string
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Redirect to frontend with success
    res.redirect(`/connect-platforms?platform=${platform}&status=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`/connect-platforms?status=error`);
  }
});

// Get user quotas
router.get('/quotas/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const quotas = await quotaManager.getAllUserQuotas(userId);
    
    res.json({
      success: true,
      quotas
    });
  } catch (error) {
    console.error('Quota retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check specific quota
router.get('/quotas/:userId/:platform', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { platform } = req.params;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const hasQuota = await quotaManager.checkQuota(userId, platform);
    const usage = await quotaManager.getQuotaUsage(userId, platform);
    
    res.json({
      success: true,
      hasQuota,
      usage
    });
  } catch (error) {
    console.error('Quota check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get platform tokens
router.get('/tokens/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const tokens = await replitAuthManager.getPlatformTokens(userId);
    
    // Don't return actual tokens, just platform availability
    const platforms = Object.keys(tokens).map(platform => ({
      platform,
      connected: true
    }));
    
    res.json({
      success: true,
      platforms
    });
  } catch (error) {
    console.error('Token retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = jwtSessionManager.getSessionStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;