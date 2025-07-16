/**
 * OAuth Security Middleware
 * Provides CSRF protection, rate limiting, and security headers for OAuth flows
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { enhancedOAuthManager } from '../services/enhanced-oauth-manager';

interface OAuthRequest extends Request {
  oauthState?: string;
  csrfToken?: string;
}

export class OAuthSecurityMiddleware {
  /**
   * CSRF Protection for OAuth initiation
   */
  static csrfProtection = (req: OAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Generate CSRF token
      const csrfToken = crypto.randomBytes(32).toString('hex');
      
      // Store in session
      req.session.csrfToken = csrfToken;
      req.csrfToken = csrfToken;
      
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      next();
    } catch (error) {
      console.error('❌ CSRF protection middleware error:', error);
      res.status(500).json({ error: 'Security initialization failed' });
    }
  };

  /**
   * Validate CSRF token on OAuth callback
   */
  static validateCSRF = (req: OAuthRequest, res: Response, next: NextFunction) => {
    try {
      const stateParam = req.query.state as string;
      const storedToken = req.session.csrfToken;
      
      if (!stateParam || !storedToken) {
        console.error('❌ Missing CSRF token in OAuth callback');
        return res.status(400).json({ 
          error: 'Missing security token',
          code: 'CSRF_MISSING'
        });
      }

      // The state parameter contains our CSRF validation
      // This will be validated by the enhanced OAuth manager
      req.oauthState = stateParam;
      
      next();
    } catch (error) {
      console.error('❌ CSRF validation middleware error:', error);
      res.status(500).json({ error: 'Security validation failed' });
    }
  };

  /**
   * Rate limiting for OAuth endpoints
   */
  static rateLimiter = (() => {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    
    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || 'unknown';
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const maxAttempts = 10; // 10 attempts per window
      
      const clientAttempts = attempts.get(clientId);
      
      if (!clientAttempts || now > clientAttempts.resetTime) {
        attempts.set(clientId, { count: 1, resetTime: now + windowMs });
        return next();
      }
      
      if (clientAttempts.count >= maxAttempts) {
        console.warn(`⚠️ Rate limit exceeded for ${clientId}`);
        return res.status(429).json({
          error: 'Too many OAuth requests',
          retryAfter: Math.ceil((clientAttempts.resetTime - now) / 1000)
        });
      }
      
      clientAttempts.count++;
      next();
    };
  })();

  /**
   * Validate OAuth state parameter
   */
  static validateOAuthState = async (req: OAuthRequest, res: Response, next: NextFunction) => {
    try {
      const { state, error } = req.query;
      
      if (error) {
        console.error(`❌ OAuth error received: ${error}`);
        return res.status(400).json({
          error: 'OAuth authorization failed',
          details: error,
          code: 'OAUTH_ERROR'
        });
      }
      
      if (!state) {
        console.error('❌ Missing OAuth state parameter');
        return res.status(400).json({
          error: 'Missing OAuth state parameter',
          code: 'STATE_MISSING'
        });
      }
      
      // Store state for OAuth manager validation
      req.oauthState = state as string;
      
      next();
    } catch (error) {
      console.error('❌ OAuth state validation error:', error);
      res.status(500).json({ error: 'OAuth validation failed' });
    }
  };

  /**
   * Security headers for OAuth responses
   */
  static securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.twitter.com https://graph.facebook.com https://www.linkedin.com https://oauth2.googleapis.com; " +
      "frame-ancestors 'none'"
    );
    
    // HSTS for HTTPS
    if (req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
  };

  /**
   * Audit logging for OAuth events
   */
  static auditLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log OAuth request
    console.log(`🔐 OAuth Request: ${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      platform: req.params.platform,
      timestamp: new Date().toISOString()
    });
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(body: any) {
      const duration = Date.now() - startTime;
      
      console.log(`🔐 OAuth Response: ${res.statusCode}`, {
        duration: `${duration}ms`,
        success: res.statusCode < 400,
        platform: req.params.platform,
        timestamp: new Date().toISOString()
      });
      
      return originalJson.call(this, body);
    };
    
    next();
  };

  /**
   * Handle OAuth errors with proper logging
   */
  static errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('❌ OAuth Security Error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // Don't expose internal errors
    if (error.message.includes('database') || error.message.includes('secret')) {
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
    
    res.status(500).json({
      error: error.message,
      code: 'OAUTH_ERROR'
    });
  };

  /**
   * Clean up expired OAuth states periodically
   */
  static startCleanupTask() {
    setInterval(async () => {
      try {
        await enhancedOAuthManager.cleanupExpiredStates();
      } catch (error) {
        console.error('❌ OAuth cleanup task error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

// Start cleanup task when module is loaded
OAuthSecurityMiddleware.startCleanupTask();