import type { Request, Response, NextFunction } from 'express';

interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
}

export class ProductionCookieManager {
  private static instance: ProductionCookieManager;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  static getInstance(): ProductionCookieManager {
    if (!ProductionCookieManager.instance) {
      ProductionCookieManager.instance = new ProductionCookieManager();
    }
    return ProductionCookieManager.instance;
  }

  // FIXED: Dynamic cookie extraction instead of hardcoded values
  extractSessionCookie(req: Request): string | null {
    // Priority 1: From request headers
    if (req.cookies?.['connect.sid']) {
      return req.cookies['connect.sid'];
    }
    
    // Priority 2: From session ID
    if (req.sessionID) {
      return req.sessionID;
    }

    // Priority 3: From environment (for scripts)
    if (process.env.SESSION_COOKIE) {
      return process.env.SESSION_COOKIE;
    }

    return null;
  }

  // FIXED: Secure cookie settings with production enforcement
  getSecureCookieOptions(): CookieOptions {
    return {
      httpOnly: true, // Prevents XSS attacks
      secure: this.isProduction, // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 72 * 60 * 60 * 1000, // 72 hours for PWA support
      path: '/'
    };
  }

  // FIXED: Cookie rotation with timestamps
  setSecureCookie(res: Response, name: string, value: string, options?: Partial<CookieOptions>): void {
    const secureOptions = {
      ...this.getSecureCookieOptions(),
      ...options
    };

    // Add rotation identifier for tracking
    const rotationId = `r${Date.now()}`;
    const cookieName = `${name}_${rotationId}`;

    res.cookie(cookieName, value, secureOptions);
    
    console.log(`🍪 Secure cookie set: ${cookieName} (secure: ${secureOptions.secure}, httpOnly: ${secureOptions.httpOnly})`);
  }

  // FIXED: Cookie validation with expiration checks
  validateCookie(req: Request, cookieName: string): { valid: boolean; expired: boolean; value?: string } {
    const cookie = req.cookies?.[cookieName];
    
    if (!cookie) {
      return { valid: false, expired: false };
    }

    // Check if cookie has expired (basic check)
    try {
      // If cookie is a JWT or has timestamp, validate expiration
      if (typeof cookie === 'string' && cookie.includes('.')) {
        // Handle signed cookies or JWT tokens
        const decoded = this.decodeCookieValue(cookie);
        if (decoded?.exp && decoded.exp < Date.now() / 1000) {
          return { valid: false, expired: true };
        }
      }

      return { valid: true, expired: false, value: cookie };
    } catch (error) {
      console.error('Cookie validation error:', error);
      return { valid: false, expired: true };
    }
  }

  // FIXED: Clear cookies with proper expiration
  clearCookie(res: Response, name: string): void {
    const expiredDate = new Date(0);
    
    res.setHeader('Set-Cookie', [
      `${name}=; Path=/; Expires=${expiredDate.toUTCString()}; HttpOnly; SameSite=Strict`,
      `connect.sid=; Path=/; Expires=${expiredDate.toUTCString()}; HttpOnly; SameSite=Strict`,
      `theagencyiq.session=; Path=/; Expires=${expiredDate.toUTCString()}; HttpOnly; SameSite=Strict`
    ]);

    console.log(`🗑️ Cookies cleared: ${name} and related session cookies`);
  }

  private decodeCookieValue(cookie: string): any {
    try {
      // Handle base64 encoded cookies
      if (cookie.startsWith('s:')) {
        // Express signed cookie format
        return JSON.parse(Buffer.from(cookie.slice(2), 'base64').toString());
      }
      
      // Handle JWT tokens
      if (cookie.includes('.')) {
        const parts = cookie.split('.');
        if (parts.length === 3) {
          return JSON.parse(Buffer.from(parts[1], 'base64').toString());
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  // Middleware for automatic cookie security validation
  securityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Log cookie security status
    const sessionCookie = this.extractSessionCookie(req);
    const cookieValid = sessionCookie ? this.validateCookie(req, 'connect.sid').valid : false;

    console.log({
      level: 'info',
      message: 'Cookie security check',
      method: req.method,
      path: req.path,
      cookieValid,
      cookieSource: sessionCookie ? 'request' : 'missing',
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']?.substring(0, 100)
    });

    next();
  };
}

export const productionCookieManager = ProductionCookieManager.getInstance();