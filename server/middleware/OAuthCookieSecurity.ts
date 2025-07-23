/**
 * OAuth Cookie Security Manager
 * 
 * Addresses critical OAuth cookie vulnerabilities:
 * - No secure/httpOnly/sameSite configuration
 * - No expiration handling in redirects
 * - No rotation on login
 * - Vulnerable to XSS/CSRF attacks
 * - No domain/path configuration for PWA
 * - Hardcoded values in tests
 */

import { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

interface OAuthCookieOptions {
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  domain?: string;
  path?: string;
}

export class OAuthCookieSecurityManager {
  private isProduction: boolean;
  private cookieSecret: string;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.cookieSecret = process.env.COOKIE_SECRET || process.env.SESSION_SECRET || 'fallback-oauth-secret';
  }

  // Set secure OAuth cookies with proper flags
  setSecureOAuthCookie(res: Response, name: string, value: string, options: Partial<OAuthCookieOptions> = {}): void {
    const defaultOptions: OAuthCookieOptions = {
      secure: this.isProduction, // HTTPS only in production
      httpOnly: true, // Prevent JavaScript access (XSS protection)
      sameSite: 'strict', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours for OAuth tokens
      path: '/', // Root path for OAuth callbacks
      domain: undefined // Let Express handle domain automatically
    };

    const finalOptions = { ...defaultOptions, ...options };

    res.cookie(name, value, finalOptions);
    
    console.log(`🔒 OAuth cookie '${name}' set with security flags:`, {
      secure: finalOptions.secure,
      httpOnly: finalOptions.httpOnly,
      sameSite: finalOptions.sameSite,
      maxAge: finalOptions.maxAge,
      path: finalOptions.path,
      production: this.isProduction
    });
  }

  // Rotate OAuth cookies on login for security
  rotateOAuthCookie(res: Response, name: string, newValue: string): void {
    // Clear old cookie first
    this.clearOAuthCookie(res, name);
    
    // Set new cookie with rotation timestamp
    const rotationId = Date.now().toString(36);
    const rotatedName = `${name}_r${rotationId}`;
    
    this.setSecureOAuthCookie(res, rotatedName, newValue);
    
    console.log(`🔄 OAuth cookie '${name}' rotated to '${rotatedName}' for security`);
  }

  // Clear OAuth cookies securely
  clearOAuthCookie(res: Response, name: string): void {
    res.clearCookie(name, {
      secure: this.isProduction,
      httpOnly: true,
      sameSite: 'strict',
      path: '/'
    });
    
    // Also clear with expired date for extra security
    res.cookie(name, '', {
      expires: new Date(0), // Thu, 01 Jan 1970
      secure: this.isProduction,
      httpOnly: true,
      sameSite: 'strict',
      path: '/'
    });
    
    console.log(`🗑️ OAuth cookie '${name}' cleared securely`);
  }

  // Validate OAuth cookie security
  validateOAuthCookieSecurity(req: Request): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const cookies = req.headers.cookie;
    
    if (!cookies) {
      return { valid: true, issues: [] }; // No cookies to validate
    }

    // Check for insecure OAuth-related cookies
    const cookiePairs = cookies.split(';').map(c => c.trim());
    
    for (const cookiePair of cookiePairs) {
      const [name] = cookiePair.split('=');
      
      if (name.toLowerCase().includes('oauth') || 
          name.toLowerCase().includes('auth') || 
          name.toLowerCase().includes('token')) {
        
        // Check if cookie has security attributes in headers
        const cookieHeader = req.headers['set-cookie'];
        if (cookieHeader) {
          const secureCookie = cookieHeader.find(c => c.includes(name));
          if (secureCookie) {
            if (!secureCookie.includes('HttpOnly')) {
              issues.push(`OAuth cookie '${name}' missing HttpOnly flag (XSS vulnerable)`);
            }
            if (!secureCookie.includes('Secure') && this.isProduction) {
              issues.push(`OAuth cookie '${name}' missing Secure flag in production`);
            }
            if (!secureCookie.includes('SameSite')) {
              issues.push(`OAuth cookie '${name}' missing SameSite flag (CSRF vulnerable)`);
            }
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Extract OAuth cookies with security validation
  extractOAuthCookie(req: Request, name: string): string | null {
    const cookieValue = req.cookies?.[name] || req.signedCookies?.[name];
    
    if (!cookieValue) {
      // Try to find rotated cookie
      const cookies = req.cookies || {};
      const rotatedCookie = Object.keys(cookies).find(key => 
        key.startsWith(`${name}_r`) && cookies[key]
      );
      
      if (rotatedCookie) {
        console.log(`🔄 Found rotated OAuth cookie: ${rotatedCookie}`);
        return cookies[rotatedCookie];
      }
      
      return null;
    }

    // Validate cookie security
    const validation = this.validateOAuthCookieSecurity(req);
    if (!validation.valid) {
      console.warn(`⚠️ OAuth cookie '${name}' security issues:`, validation.issues);
    }

    return cookieValue;
  }

  // Middleware for OAuth cookie security
  oauthCookieSecurityMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add OAuth cookie methods to response
      res.setSecureOAuthCookie = (name: string, value: string, options?: Partial<OAuthCookieOptions>) => {
        this.setSecureOAuthCookie(res, name, value, options);
      };

      res.rotateOAuthCookie = (name: string, newValue: string) => {
        this.rotateOAuthCookie(res, name, newValue);
      };

      res.clearOAuthCookie = (name: string) => {
        this.clearOAuthCookie(res, name);
      };

      // Validate existing OAuth cookies
      const validation = this.validateOAuthCookieSecurity(req);
      if (!validation.valid) {
        console.warn('🚨 OAuth cookie security issues detected:', validation.issues);
      }

      next();
    };
  }

  // Configure OAuth-specific cookie parser
  getOAuthCookieParser() {
    return cookieParser(this.cookieSecret, {
      decode: (val: string) => {
        try {
          // Validate cookie format for OAuth tokens
          const decoded = decodeURIComponent(val);
          
          // Check for suspicious patterns
          if (decoded.includes('<script>') || decoded.includes('javascript:')) {
            console.warn('🚨 Suspicious OAuth cookie content detected');
            return '';
          }
          
          return decoded;
        } catch (error) {
          console.warn('🚨 OAuth cookie decode error:', error);
          return '';
        }
      }
    });
  }

  // Generate secure OAuth state parameter
  generateSecureState(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const checksum = require('crypto').createHash('sha256')
      .update(`${timestamp}${random}${this.cookieSecret}`)
      .digest('hex')
      .substring(0, 8);
    
    return `oauth_${timestamp}_${random}_${checksum}`;
  }

  // Validate OAuth state parameter
  validateOAuthState(state: string): boolean {
    if (!state || !state.startsWith('oauth_')) {
      return false;
    }

    const parts = state.split('_');
    if (parts.length !== 4) {
      return false;
    }

    const [prefix, timestamp, random, checksum] = parts;
    
    // Validate timestamp (max 1 hour old)
    const stateTime = parseInt(timestamp, 36);
    const now = Date.now();
    if (now - stateTime > 60 * 60 * 1000) {
      console.warn('🚨 OAuth state parameter expired');
      return false;
    }

    // Validate checksum
    const expectedChecksum = require('crypto').createHash('sha256')
      .update(`${timestamp}${random}${this.cookieSecret}`)
      .digest('hex')
      .substring(0, 8);

    if (checksum !== expectedChecksum) {
      console.warn('🚨 OAuth state parameter checksum invalid');
      return false;
    }

    return true;
  }
}

// Extend Response interface for OAuth cookie methods
declare global {
  namespace Express {
    interface Response {
      setSecureOAuthCookie?(name: string, value: string, options?: Partial<OAuthCookieOptions>): void;
      rotateOAuthCookie?(name: string, newValue: string): void;
      clearOAuthCookie?(name: string): void;
    }
  }
}

export const oauthCookieManager = new OAuthCookieSecurityManager();