import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

// Configure logger for cookie security
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/cookie-security.log',
      maxsize: 5242880, // 5MB
      maxFiles: 3
    }),
    new winston.transports.Console()
  ]
});

interface CookieValidationResult {
  valid: boolean;
  errors: string[];
  secure: boolean;
  httpOnly: boolean;
  sameSite: boolean;
  expired: boolean;
}

interface SecureCookieOptions {
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  expires?: Date;
  domain?: string;
  path?: string;
}

export class CookieSecurityManager {
  private isProduction: boolean;
  private cookieSecret: string;

  constructor(cookieSecret?: string) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.cookieSecret = cookieSecret || process.env.COOKIE_SECRET || 'fallback-cookie-secret';
  }

  // Enhanced cookie parser with security validation
  getEnhancedCookieParser() {
    return cookieParser(this.cookieSecret, {
      decode: (value: string) => {
        try {
          // Enhanced decoding with security validation
          const decoded = decodeURIComponent(value);
          
          // Log cookie access for security monitoring
          logger.info('Cookie accessed', {
            length: decoded.length,
            hasSpecialChars: /[<>'"&]/.test(decoded),
            timestamp: new Date().toISOString()
          });
          
          return decoded;
        } catch (error) {
          logger.error('Cookie decode error', { 
            error: (error as Error).message,
            value: value.substring(0, 50) + '...'
          });
          return value;
        }
      }
    });
  }

  // Validate cookie security properties
  validateCookieSecurity(cookieString: string): CookieValidationResult {
    const result: CookieValidationResult = {
      valid: true,
      errors: [],
      secure: false,
      httpOnly: false,
      sameSite: false,
      expired: false
    };

    if (!cookieString) {
      result.valid = false;
      result.errors.push('No cookie string provided');
      return result;
    }

    // Check for security flags
    const lowerCookie = cookieString.toLowerCase();
    
    result.secure = lowerCookie.includes('secure');
    result.httpOnly = lowerCookie.includes('httponly');
    result.sameSite = lowerCookie.includes('samesite');

    // Validate production requirements
    if (this.isProduction) {
      if (!result.secure) {
        result.valid = false;
        result.errors.push('Missing Secure flag in production');
      }
    }

    if (!result.httpOnly) {
      result.valid = false;
      result.errors.push('Missing HttpOnly flag');
    }

    if (!result.sameSite) {
      result.valid = false;
      result.errors.push('Missing SameSite flag');
    }

    // Check for expiration
    const expiresMatch = cookieString.match(/expires=([^;]+)/i);
    const maxAgeMatch = cookieString.match(/max-age=(\d+)/i);
    
    if (expiresMatch) {
      const expiresDate = new Date(expiresMatch[1]);
      result.expired = expiresDate < new Date();
    } else if (maxAgeMatch) {
      const maxAge = parseInt(maxAgeMatch[1]);
      result.expired = maxAge <= 0;
    }

    if (result.expired) {
      result.valid = false;
      result.errors.push('Cookie is expired');
    }

    logger.info('Cookie validation completed', {
      valid: result.valid,
      errors: result.errors.length,
      secure: result.secure,
      httpOnly: result.httpOnly,
      sameSite: result.sameSite,
      expired: result.expired
    });

    return result;
  }

  // Set secure cookie with proper rotation
  setSecureCookie(
    res: Response,
    name: string,
    value: string,
    options: SecureCookieOptions = {}
  ): void {
    const defaultOptions: SecureCookieOptions = {
      secure: this.isProduction,
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
      path: '/'
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Build cookie string manually for complete control
    let cookieString = `${name}=${value}`;
    
    if (finalOptions.path) cookieString += `; Path=${finalOptions.path}`;
    if (finalOptions.domain) cookieString += `; Domain=${finalOptions.domain}`;
    if (finalOptions.maxAge) cookieString += `; Max-Age=${Math.floor(finalOptions.maxAge / 1000)}`;
    if (finalOptions.expires) cookieString += `; Expires=${finalOptions.expires.toUTCString()}`;
    if (finalOptions.httpOnly) cookieString += '; HttpOnly';
    if (finalOptions.secure) cookieString += '; Secure';
    if (finalOptions.sameSite) cookieString += `; SameSite=${finalOptions.sameSite}`;

    res.setHeader('Set-Cookie', cookieString);

    logger.info('Secure cookie set', {
      name,
      valueLength: value.length,
      options: finalOptions,
      cookieString: cookieString.substring(0, 100) + '...'
    });
  }

  // Rotate session cookie for security
  rotateCookie(
    req: Request,
    res: Response,
    cookieName: string,
    newValue: string,
    options: SecureCookieOptions = {}
  ): void {
    // Clear old cookie first
    this.clearCookie(res, cookieName);
    
    // Set new cookie with rotation timestamp
    const rotatedValue = `${newValue}_r${Date.now()}`;
    this.setSecureCookie(res, cookieName, rotatedValue, options);

    logger.info('Cookie rotated', {
      cookieName,
      rotationTimestamp: Date.now(),
      newValueLength: rotatedValue.length
    });
  }

  // Clear cookie securely
  clearCookie(res: Response, name: string, options: SecureCookieOptions = {}): void {
    const clearOptions = {
      path: options.path || '/',
      domain: options.domain,
      secure: this.isProduction,
      httpOnly: true,
      sameSite: 'strict' as const
    };

    // Set expired date to clear cookie
    let cookieString = `${name}=; Path=${clearOptions.path}`;
    if (clearOptions.domain) cookieString += `; Domain=${clearOptions.domain}`;
    cookieString += '; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    if (clearOptions.httpOnly) cookieString += '; HttpOnly';
    if (clearOptions.secure) cookieString += '; Secure';
    if (clearOptions.sameSite) cookieString += `; SameSite=${clearOptions.sameSite}`;

    res.setHeader('Set-Cookie', cookieString);

    logger.info('Cookie cleared', {
      name,
      cookieString: cookieString
    });
  }

  // Extract and validate cookies from request
  extractDynamicCookie(req: Request): { cookie: string | null, source: string, valid: boolean } {
    let cookie: string | null = null;
    let source = 'none';
    let valid = false;

    // Priority 1: Browser headers
    if (req.headers.cookie) {
      cookie = req.headers.cookie;
      source = 'browser_headers';
      
      const validation = this.validateCookieSecurity(cookie);
      valid = validation.valid;
      
      logger.info('Cookie extracted from browser headers', {
        source,
        valid,
        cookieLength: cookie.length,
        hasSecureFlags: validation.secure && validation.httpOnly && validation.sameSite
      });
    }
    // Priority 2: Environment variables  
    else if (process.env.SESSION_COOKIE || process.env.TEST_SESSION_COOKIE) {
      cookie = process.env.SESSION_COOKIE || process.env.TEST_SESSION_COOKIE || null;
      source = 'environment';
      valid = true; // Assume env cookies are valid for testing
      
      logger.info('Cookie extracted from environment', {
        source,
        valid,
        cookieLength: cookie?.length || 0
      });
    }
    // Priority 3: Session generation fallback
    else {
      source = 'session_generated';
      valid = false;
      
      logger.info('No cookie available, session will be generated', {
        source,
        valid
      });
    }

    return { cookie, source, valid };
  }

  // Middleware for cookie security validation
  cookieSecurityMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip cookie processing for static files to prevent MIME type interference
      if (req.path.startsWith('/dist/') || req.path.startsWith('/assets/') || req.path === '/favicon.ico') {
        return next();
      }
      
      const { cookie, source, valid } = this.extractDynamicCookie(req);
      
      // Add comprehensive security headers for cookie handling
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // Log cookie security check
      logger.info('Cookie security check', {
        method: req.method,
        path: req.path,
        cookieSource: source,
        cookieValid: valid,
        userAgent: req.headers['user-agent']?.substring(0, 50)
      });

      next();
    };
  }
}

// Export enhanced cookie parser function
export function enhancedCookieParser(secret?: string) {
  const manager = new CookieSecurityManager(secret);
  return manager.getEnhancedCookieParser();
}

// Export singleton instance
export const cookieSecurityManager = new CookieSecurityManager();