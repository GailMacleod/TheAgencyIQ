/**
 * TEST COOKIE MANAGER
 * Manages dynamic test cookies with proper security validation for testing
 * Eliminates hardcoded cookies and provides real browser/env cookie integration
 */

import axios, { AxiosRequestConfig } from 'axios';
import CookieSecurityManager from '../middleware/CookieSecurityManager';

export interface TestCookieConfig {
  baseUrl: string;
  userId?: string;
  sessionTimeout?: number;
  secureFlags?: boolean;
}

export class TestCookieManager {
  private baseUrl: string;
  private cookies: Map<string, string> = new Map();
  private secureFlags: boolean;

  constructor(config: TestCookieConfig) {
    this.baseUrl = config.baseUrl;
    this.secureFlags = config.secureFlags ?? true;
  }

  /**
   * Establish session and get real cookie from server
   */
  async establishTestSession(userId?: string): Promise<{ cookie: string; sessionId: string; valid: boolean }> {
    try {
      console.log('🔑 Establishing test session with server...');
      
      // Make request to establish session endpoint
      const response = await axios.post(`${this.baseUrl}/api/establish-session`, {
        userId: userId || 'test-user',
        source: 'test-automation'
      }, {
        timeout: 10000,
        validateStatus: () => true // Accept all status codes
      });

      // Extract cookie from response headers
      const setCookieHeaders = response.headers['set-cookie'];
      if (!setCookieHeaders || setCookieHeaders.length === 0) {
        throw new Error('No Set-Cookie header in response');
      }

      // Find session cookie
      const sessionCookie = setCookieHeaders.find(cookie => 
        cookie.includes('theagencyiq.session=') || 
        cookie.includes('aiq_backup_session=')
      );

      if (!sessionCookie) {
        throw new Error('Session cookie not found in response');
      }

      // Validate cookie security
      const validation = CookieSecurityManager.validateCookie(sessionCookie);
      
      // Extract session ID
      const sessionId = this.extractSessionId(sessionCookie);
      
      // Store for future requests
      this.cookies.set('session', sessionCookie);
      
      console.log('✅ Test session established', {
        cookieLength: sessionCookie.length,
        sessionId: sessionId.substring(0, 16) + '...',
        valid: validation.valid,
        secure: validation.secure,
        expired: validation.expired
      });

      return {
        cookie: sessionCookie,
        sessionId,
        valid: validation.valid && !validation.expired
      };

    } catch (error: any) {
      console.error('❌ Failed to establish test session:', error.message);
      
      // Fallback to environment cookie if available
      if (process.env.TEST_SESSION_COOKIE) {
        console.log('🔄 Using fallback environment cookie...');
        const envCookie = process.env.TEST_SESSION_COOKIE;
        const validation = CookieSecurityManager.validateCookie(envCookie);
        const sessionId = this.extractSessionId(envCookie);
        
        return {
          cookie: envCookie,
          sessionId,
          valid: validation.valid && !validation.expired
        };
      }
      
      throw new Error(`Session establishment failed: ${error.message}`);
    }
  }

  /**
   * Extract session ID from cookie string
   */
  private extractSessionId(cookieString: string): string {
    try {
      // Try theagencyiq.session first
      let match = cookieString.match(/theagencyiq\.session=([^;]+)/);
      if (match) {
        // Decode URL-encoded session
        const encoded = match[1];
        const decoded = decodeURIComponent(encoded);
        // Extract session ID from signed cookie format s:sessionId.signature
        const sessionMatch = decoded.match(/^s:([^.]+)\./);
        return sessionMatch ? sessionMatch[1] : encoded;
      }

      // Try backup session
      match = cookieString.match(/aiq_backup_session=([^;]+)/);
      if (match) {
        return match[1];
      }

      throw new Error('Session ID not found in cookie');
    } catch (error: any) {
      console.warn('⚠️ Could not extract session ID:', error.message);
      return 'unknown-session';
    }
  }

  /**
   * Get authentication headers with valid cookie
   */
  async getAuthHeaders(): Promise<{ Cookie: string; 'X-Session-Source': string }> {
    try {
      // Check if we have a stored cookie
      let storedCookie = this.cookies.get('session');
      
      // If no stored cookie or expired, establish new session
      if (!storedCookie) {
        const session = await this.establishTestSession();
        storedCookie = session.cookie;
      }
      
      // Validate stored cookie
      const validation = CookieSecurityManager.validateCookie(storedCookie);
      if (!validation.valid || validation.expired) {
        console.log('🔄 Cookie expired, establishing new session...');
        const session = await this.establishTestSession();
        storedCookie = session.cookie;
      }

      return {
        Cookie: storedCookie,
        'X-Session-Source': 'test-automation'
      };

    } catch (error: any) {
      console.error('❌ Failed to get auth headers:', error.message);
      throw error;
    }
  }

  /**
   * Make authenticated request with proper cookie handling
   */
  async makeAuthenticatedRequest(path: string, options: AxiosRequestConfig = {}): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      
      const config: AxiosRequestConfig = {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        },
        timeout: options.timeout || 15000,
        validateStatus: () => true // Accept all status codes for testing
      };

      const response = await axios({
        url: `${this.baseUrl}${path}`,
        ...config
      });

      // Log request details
      console.log(`📡 ${config.method?.toUpperCase() || 'GET'} ${path}`, {
        status: response.status,
        cookieUsed: headers.Cookie.substring(0, 50) + '...',
        responseSize: JSON.stringify(response.data).length
      });

      return response;

    } catch (error: any) {
      console.error(`❌ Request failed ${path}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate current cookie status
   */
  validateCurrentCookie(): { valid: boolean; expired: boolean; secure: boolean; errors: string[] } {
    const cookie = this.cookies.get('session');
    if (!cookie) {
      return { valid: false, expired: false, secure: false, errors: ['No cookie available'] };
    }
    
    return CookieSecurityManager.validateCookie(cookie);
  }

  /**
   * Clear all stored cookies
   */
  clearCookies(): void {
    this.cookies.clear();
    console.log('🗑️ All test cookies cleared');
  }
}

export default TestCookieManager;