/**
 * Token Refresh Service
 * Handles automatic token refresh for session management
 */

import { apiClient } from './api-client';
import { sessionManager } from './session-manager';

export interface TokenRefreshResponse {
  success: boolean;
  newToken?: string;
  expiresAt?: number;
  error?: string;
}

class TokenRefreshService {
  private refreshPromise: Promise<TokenRefreshResponse> | null = null;
  private isRefreshing = false;
  private refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
  private refreshInterval: NodeJS.Timeout | null = null;

  /**
   * Check if token needs refresh
   */
  private needsRefresh(): boolean {
    const expiresAt = sessionStorage.getItem('sessionExpiresAt');
    if (!expiresAt) return false;
    
    const expiryTime = parseInt(expiresAt);
    const currentTime = Date.now();
    
    return (expiryTime - currentTime) < this.refreshThreshold;
  }

  /**
   * Refresh session token
   */
  async refreshToken(): Promise<TokenRefreshResponse> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    console.log('🔄 Refreshing session token...');

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<TokenRefreshResponse> {
    try {
      const response = await apiClient.post('/api/refresh-token', {
        refreshToken: sessionStorage.getItem('refreshToken')
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update session storage with new token
        if (data.sessionId) {
          sessionStorage.setItem('sessionId', data.sessionId);
          sessionStorage.setItem('sessionExpiresAt', data.expiresAt?.toString() || '');
          
          // Update session cookie
          const sessionCookie = `theagencyiq.session=s%3A${data.sessionId}`;
          sessionStorage.setItem('sessionCookie', sessionCookie);
          
          console.log('✅ Session token refreshed successfully');
          return {
            success: true,
            newToken: data.sessionId,
            expiresAt: data.expiresAt
          };
        }
      }

      throw new Error(`Token refresh failed: ${response.status}`);
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      // Clear invalid session data
      sessionStorage.removeItem('sessionId');
      sessionStorage.removeItem('sessionCookie');
      sessionStorage.removeItem('sessionExpiresAt');
      sessionStorage.removeItem('refreshToken');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start automatic token refresh
   */
  startAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Check every minute for token refresh needs
    this.refreshInterval = setInterval(() => {
      if (this.needsRefresh() && !this.isRefreshing) {
        this.refreshToken().catch(console.error);
      }
    }, 60 * 1000);
    
    console.log('🔄 Auto token refresh started');
  }

  /**
   * Stop automatic token refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('⏹️ Auto token refresh stopped');
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const expiresAt = sessionStorage.getItem('sessionExpiresAt');
    if (!expiresAt) return true;
    
    return Date.now() > parseInt(expiresAt);
  }

  /**
   * Get token expiry time
   */
  getTokenExpiryTime(): number | null {
    const expiresAt = sessionStorage.getItem('sessionExpiresAt');
    return expiresAt ? parseInt(expiresAt) : null;
  }

  /**
   * Manual token refresh trigger
   */
  async forceRefresh(): Promise<TokenRefreshResponse> {
    this.isRefreshing = false; // Reset state
    this.refreshPromise = null;
    return this.refreshToken();
  }
}

export const tokenRefreshService = new TokenRefreshService();