/**
 * OAuth Security Middleware
 * Implements CSRF protection, rate limiting, and security headers
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import crypto from 'crypto';

interface OAuthSecurityConfig {
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  csrfProtection: boolean;
  securityHeaders: boolean;
  auditLogging: boolean;
}

class OAuthSecurityMiddleware {
  private static instance: OAuthSecurityMiddleware;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private config: OAuthSecurityConfig;

  constructor() {
    this.config = {
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10 // 10 OAuth requests per window
      },
      csrfProtection: true,
      securityHeaders: true,
      auditLogging: true
    };

    // Clean up expired rate limit entries every hour
    setInterval(() => this.cleanupRateLimitEntries(), 60 * 60 * 1000);
  }

  public static getInstance(): OAuthSecurityMiddleware {
    if (!OAuthSecurityMiddleware.instance) {
      OAuthSecurityMiddleware.instance = new OAuthSecurityMiddleware();
    }
    return OAuthSecurityMiddleware.instance;
  }

  /**
   * Rate limiting middleware
   */
  rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const entry = this.requestCounts.get(clientIP);
    
    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      this.requestCounts.set(clientIP, {
        count: 1,
        resetTime: now + this.config.rateLimit.windowMs
      });
      next();
      return;
    }

    if (entry.count >= this.config.rateLimit.maxRequests) {
      // Rate limit exceeded
      const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many OAuth requests. Try again in ${resetInSeconds} seconds.`,
        retryAfter: resetInSeconds
      });
      
      this.logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', {
        clientIP,
        requestCount: entry.count,
        resetTime: entry.resetTime
      });
      
      return;
    }

    // Increment count
    entry.count++;
    this.requestCounts.set(clientIP, entry);
    next();
  };

  /**
   * CSRF protection middleware
   */
  csrfProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!this.config.csrfProtection) {
      next();
      return;
    }

    const method = req.method.toUpperCase();
    
    // Skip CSRF for GET requests (OAuth initiation)
    if (method === 'GET') {
      next();
      return;
    }

    // Check for CSRF token in callback requests
    if (req.path.includes('/callback')) {
      const { state } = req.query;
      
      if (!state) {
        res.status(400).json({
          error: 'Missing state parameter',
          message: 'CSRF protection requires state parameter'
        });
        
        this.logSecurityEvent(req, 'CSRF_MISSING_STATE', {
          path: req.path,
          query: req.query
        });
        
        return;
      }
    }

    // Validate origin for POST requests
    const origin = req.get('Origin') || req.get('Referer');
    const allowedOrigins = [
      process.env.BASE_URL,
      process.env.FRONTEND_URL,
      'https://localhost:3000',
      'http://localhost:3000'
    ].filter(Boolean);

    if (origin && !allowedOrigins.some(allowed => allowed && origin.startsWith(allowed))) {
      res.status(403).json({
        error: 'Invalid origin',
        message: 'Request origin not allowed'
      });
      
      this.logSecurityEvent(req, 'CSRF_INVALID_ORIGIN', {
        origin,
        allowedOrigins
      });
      
      return;
    }

    next();
  };

  /**
   * Security headers middleware
   */
  securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!this.config.securityHeaders) {
      next();
      return;
    }

    // Set security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://graph.facebook.com https://api.instagram.com https://www.linkedin.com https://api.twitter.com https://oauth2.googleapis.com",
      "frame-ancestors 'none'"
    ].join('; '));

    // Strict Transport Security (for HTTPS)
    if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  };

  /**
   * Request logging middleware
   */
  auditLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!this.config.auditLogging) {
      next();
      return;
    }

    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      const logData = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        clientIP: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.session?.id,
        userId: req.session?.userId
      };

      // Log OAuth-specific events
      if (req.path.includes('/oauth/')) {
        console.log(`🔐 OAuth Request: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        
        // Log errors
        if (res.statusCode >= 400) {
          console.error(`❌ OAuth Error: ${req.method} ${req.path} - ${res.statusCode}`, logData);
        }
      }

      return originalSend.call(this, body);
    };

    next();
  };

  /**
   * State validation middleware
   */
  stateValidationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.includes('/callback')) {
      next();
      return;
    }

    const { state, code } = req.query;
    const platform = req.params.platform;

    if (!state || !code || !platform) {
      res.status(400).json({
        error: 'Invalid callback parameters',
        message: 'Missing required parameters: state, code, or platform'
      });
      
      this.logSecurityEvent(req, 'INVALID_CALLBACK_PARAMS', {
        state: !!state,
        code: !!code,
        platform
      });
      
      return;
    }

    try {
      // Validate state exists and is not expired
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User session required'
        });
        return;
      }

      const storedState = await storage.getOAuthState(userId, platform);
      if (!storedState) {
        res.status(400).json({
          error: 'Invalid state',
          message: 'State parameter not found or expired'
        });
        
        this.logSecurityEvent(req, 'STATE_NOT_FOUND', {
          userId,
          platform,
          providedState: state
        });
        
        return;
      }

      // Validate state matches
      if (storedState.state !== state) {
        res.status(400).json({
          error: 'Invalid state',
          message: 'State parameter mismatch'
        });
        
        this.logSecurityEvent(req, 'STATE_MISMATCH', {
          userId,
          platform,
          providedState: state,
          storedState: storedState.state
        });
        
        return;
      }

      // State is valid, proceed
      next();
    } catch (error) {
      console.error('State validation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'State validation failed'
      });
    }
  };

  /**
   * Cleanup expired rate limit entries
   */
  private cleanupRateLimitEntries(): void {
    const now = Date.now();
    const entries = Array.from(this.requestCounts.entries());
    for (const [ip, entry] of entries) {
      if (now > entry.resetTime) {
        this.requestCounts.delete(ip);
      }
    }
  }

  /**
   * Log security events
   */
  private logSecurityEvent(req: Request, eventType: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      clientIP: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      path: req.path,
      method: req.method,
      sessionId: req.session?.id,
      userId: req.session?.userId,
      details
    };

    console.warn(`🚨 OAuth Security Event: ${eventType}`, logEntry);
    
    // In production, you might want to send this to a security monitoring service
    // await securityLogger.log(logEntry);
  }

  /**
   * Get combined middleware stack
   */
  getMiddlewareStack() {
    return [
      this.securityHeadersMiddleware,
      this.rateLimitMiddleware,
      this.csrfProtectionMiddleware,
      this.auditLoggingMiddleware
    ];
  }

  /**
   * Get callback-specific middleware stack
   */
  getCallbackMiddlewareStack() {
    return [
      this.securityHeadersMiddleware,
      this.rateLimitMiddleware,
      this.stateValidationMiddleware,
      this.auditLoggingMiddleware
    ];
  }
}

export const oauthSecurityMiddleware = OAuthSecurityMiddleware.getInstance();