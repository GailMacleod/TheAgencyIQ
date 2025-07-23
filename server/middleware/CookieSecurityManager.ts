/**
 * COOKIE SECURITY MANAGER
 * Handles secure cookie management with proper validation, expiration checks, and dynamic generation
 * Eliminates hardcoded cookies and implements real browser/env cookie handling
 */

import { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export interface SecureCookieOptions {
  name: string;
  value: string;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
}

export class CookieSecurityManager {
  
  /**
   * Generate secure cookie with proper flags and expiration
   */
  static generateSecureCookie(name: string, value: string, options: Partial<SecureCookieOptions> = {}): SecureCookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      name,
      value,
      maxAge: options.maxAge || (7 * 24 * 60 * 60 * 1000), // 7 days default
      httpOnly: options.httpOnly !== false, // Default true
      secure: options.secure !== false && isProduction, // Secure in production
      sameSite: options.sameSite || 'strict',
      domain: options.domain,
      path: options.path || '/'
    };
  }

  /**
   * Validate cookie expiration and security flags
   */
  static validateCookie(cookieString: string): { valid: boolean; expired: boolean; secure: boolean; errors: string[] } {
    const errors: string[] = [];
    let valid = true;
    let expired = false;
    let secure = false;

    try {
      // Parse cookie attributes
      const parts = cookieString.split(';').map(part => part.trim());
      const [nameValue] = parts;
      
      if (!nameValue || !nameValue.includes('=')) {
        errors.push('Invalid cookie format - missing name=value');
        valid = false;
      }

      // Check for security flags
      const hasHttpOnly = parts.some(part => part.toLowerCase() === 'httponly');
      const hasSecure = parts.some(part => part.toLowerCase() === 'secure');
      const hasSameSite = parts.some(part => part.toLowerCase().startsWith('samesite='));
      
      if (!hasHttpOnly) {
        errors.push('Missing HttpOnly flag - vulnerable to XSS');
        valid = false;
      }
      
      if (process.env.NODE_ENV === 'production' && !hasSecure) {
        errors.push('Missing Secure flag in production - vulnerable to MITM');
        valid = false;
      }
      
      if (!hasSameSite) {
        errors.push('Missing SameSite flag - vulnerable to CSRF');
        valid = false;
      }

      secure = hasHttpOnly && hasSecure && hasSameSite;

      // Check expiration
      const expiresMatch = parts.find(part => part.toLowerCase().startsWith('expires='));
      const maxAgeMatch = parts.find(part => part.toLowerCase().startsWith('max-age='));
      
      if (expiresMatch) {
        const expiresDate = new Date(expiresMatch.split('=')[1]);
        if (expiresDate < new Date()) {
          expired = true;
          valid = false;
          errors.push('Cookie expired');
        }
      } else if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch.split('=')[1]);
        if (maxAge <= 0) {
          expired = true;
          valid = false;
          errors.push('Cookie max-age expired');
        }
      }

      logger.info('Cookie validation completed', {
        valid,
        expired,
        secure,
        hasHttpOnly,
        hasSecure,
        hasSameSite,
        errors: errors.length
      });

      return { valid, expired, secure, errors };

    } catch (error: any) {
      errors.push(`Cookie parsing error: ${error.message}`);
      logger.error('Cookie validation failed', {
        error: error.message,
        cookieString: cookieString.substring(0, 50) + '...'
      });
      return { valid: false, expired: false, secure: false, errors };
    }
  }

  /**
   * Extract cookie from various sources (browser headers, environment, session)
   */
  static extractDynamicCookie(req: Request): { cookie: string | null; source: string; valid: boolean } {
    let cookie: string | null = null;
    let source = 'none';
    let valid = false;

    try {
      // Priority 1: Real browser cookie from headers
      if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        const sessionCookie = cookies.find(c => 
          c.trim().startsWith('theagencyiq.session=') || 
          c.trim().startsWith('aiq_backup_session=')
        );
        
        if (sessionCookie) {
          cookie = sessionCookie.trim();
          source = 'browser_headers';
          
          // Validate real browser cookie
          const validation = this.validateCookie(req.headers.cookie);
          valid = validation.valid && !validation.expired;
          
          logger.info('Cookie extracted from browser headers', {
            source,
            valid,
            cookieLength: cookie.length,
            hasSecureFlags: validation.secure
          });
        }
      }

      // Priority 2: Environment variable for testing
      if (!cookie && process.env.TEST_SESSION_COOKIE) {
        cookie = process.env.TEST_SESSION_COOKIE;
        source = 'environment';
        
        // Validate environment cookie
        const validation = this.validateCookie(cookie);
        valid = validation.valid && !validation.expired;
        
        logger.info('Cookie extracted from environment', {
          source,
          valid,
          cookieLength: cookie.length
        });
      }

      // Priority 3: Session-based cookie generation
      if (!cookie && req.session?.id) {
        const sessionId = req.session.id;
        const secureCookie = this.generateSecureCookie('theagencyiq.session', sessionId);
        
        cookie = `${secureCookie.name}=${secureCookie.value}; HttpOnly; Secure; SameSite=${secureCookie.sameSite}; Max-Age=${secureCookie.maxAge}; Path=${secureCookie.path}`;
        source = 'session_generated';
        valid = true;
        
        logger.info('Cookie generated from session', {
          source,
          valid,
          sessionId: sessionId.substring(0, 16) + '...'
        });
      }

      return { cookie, source, valid };

    } catch (error: any) {
      logger.error('Dynamic cookie extraction failed', {
        error: error.message,
        hasHeaders: !!req.headers.cookie,
        hasEnvCookie: !!process.env.TEST_SESSION_COOKIE,
        hasSession: !!req.session?.id
      });
      return { cookie: null, source: 'error', valid: false };
    }
  }

  /**
   * Middleware to ensure secure cookie handling
   */
  static securityMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Extract and validate cookie
      const { cookie, source, valid } = CookieSecurityManager.extractDynamicCookie(req);
      
      // Add cookie validation info to request
      (req as any).cookieValidation = {
        hasCookie: !!cookie,
        source,
        valid,
        cookie: cookie?.substring(0, 50) + '...' // Truncated for logging
      };

      // Log cookie security status
      logger.info('Cookie security check', {
        method: req.method,
        path: req.path,
        cookieSource: source,
        cookieValid: valid,
        userAgent: req.get('User-Agent')?.substring(0, 50)
      });

      next();
    };
  }

  /**
   * Set secure cookie on response
   */
  static setSecureCookie(res: Response, options: SecureCookieOptions): void {
    const cookieString = `${options.name}=${options.value}; HttpOnly; ${options.secure ? 'Secure; ' : ''}SameSite=${options.sameSite}; Max-Age=${options.maxAge}; Path=${options.path || '/'}`;
    
    res.setHeader('Set-Cookie', cookieString);
    
    logger.info('Secure cookie set', {
      name: options.name,
      secure: options.secure,
      httpOnly: options.httpOnly,
      sameSite: options.sameSite,
      maxAge: options.maxAge
    });
  }

  /**
   * Clear cookie securely
   */
  static clearCookie(res: Response, name: string, options: Partial<SecureCookieOptions> = {}): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieString = `${name}=; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${options.path || '/'}`;
    
    res.setHeader('Set-Cookie', cookieString);
    
    logger.info('Cookie cleared securely', {
      name,
      secure: isProduction,
      path: options.path || '/'
    });
  }
}

/**
 * Enhanced cookie parser middleware with security validation
 */
export function enhancedCookieParser() {
  return [
    cookieParser(), // Parse cookies first
    CookieSecurityManager.securityMiddleware() // Then validate security
  ];
}

export default CookieSecurityManager;