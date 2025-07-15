/**
 * ENHANCED CONNECTION RELIABILITY SERVICE
 * Provides token refresh and alternate authentication methods
 * Improves UI connection reliability with fallback mechanisms
 */

import { storage } from '../storage';
import { OAuthRefreshService } from './OAuthRefreshService';
import axios from 'axios';

export interface ConnectionStatus {
  platform: string;
  isConnected: boolean;
  tokenValid: boolean;
  needsRefresh: boolean;
  lastChecked: Date;
  error?: string;
}

export interface RefreshResult {
  success: boolean;
  newToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

export interface AlternateAuthResult {
  success: boolean;
  method: string;
  accessToken?: string;
  error?: string;
}

export class EnhancedConnectionReliabilityService {
  
  /**
   * Validate and refresh connection with multiple fallback methods
   */
  static async validateAndRefreshConnection(
    userId: number, 
    platform: string
  ): Promise<ConnectionStatus> {
    
    console.log(`🔍 Validating connection for user ${userId} on ${platform}`);
    
    try {
      // Step 1: Check current connection status
      const connection = await storage.getPlatformConnection(userId, platform);
      if (!connection) {
        return {
          platform,
          isConnected: false,
          tokenValid: false,
          needsRefresh: false,
          lastChecked: new Date(),
          error: 'No connection found'
        };
      }

      // Step 2: Validate current token
      const tokenValidation = await OAuthRefreshService.validateToken(
        connection.accessToken, 
        platform, 
        connection.expiresAt
      );

      if (tokenValidation.isValid) {
        // Token is valid, update connection status
        await storage.updatePlatformConnection(userId, platform, {
          lastValidated: new Date(),
          isActive: true
        });

        return {
          platform,
          isConnected: true,
          tokenValid: true,
          needsRefresh: false,
          lastChecked: new Date()
        };
      }

      // Step 3: Attempt token refresh
      if (tokenValidation.needsRefresh) {
        console.log(`🔄 Attempting token refresh for ${platform}`);
        
        const refreshResult = await this.attemptTokenRefresh(userId, platform, connection);
        
        if (refreshResult.success) {
          return {
            platform,
            isConnected: true,
            tokenValid: true,
            needsRefresh: false,
            lastChecked: new Date()
          };
        }

        // Step 4: Try alternate authentication methods
        console.log(`🔄 Attempting alternate authentication for ${platform}`);
        
        const alternateResult = await this.tryAlternateAuthentication(userId, platform);
        
        if (alternateResult.success) {
          return {
            platform,
            isConnected: true,
            tokenValid: true,
            needsRefresh: false,
            lastChecked: new Date()
          };
        }
      }

      // Step 5: Mark connection as needing re-authentication
      await storage.updatePlatformConnection(userId, platform, {
        isActive: false,
        lastValidated: new Date(),
        errorLog: 'Token expired, refresh failed, alternate auth failed'
      });

      return {
        platform,
        isConnected: false,
        tokenValid: false,
        needsRefresh: true,
        lastChecked: new Date(),
        error: 'Token expired and refresh failed'
      };

    } catch (error) {
      console.error(`❌ Connection validation error for ${platform}:`, error);
      
      return {
        platform,
        isConnected: false,
        tokenValid: false,
        needsRefresh: true,
        lastChecked: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Attempt to refresh OAuth token using refresh token
   */
  static async attemptTokenRefresh(
    userId: number, 
    platform: string, 
    connection: any
  ): Promise<RefreshResult> {
    
    try {
      if (!connection.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available'
        };
      }

      const refreshResult = await OAuthRefreshService.validateAndRefreshConnection(
        userId.toString(), 
        platform
      );

      if (refreshResult.success && refreshResult.accessToken) {
        // Update connection with new token
        await storage.updatePlatformConnection(userId, platform, {
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken,
          expiresAt: refreshResult.expiresAt,
          lastValidated: new Date(),
          isActive: true
        });

        console.log(`✅ Token refresh successful for ${platform}`);
        
        return {
          success: true,
          newToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken,
          expiresAt: refreshResult.expiresAt
        };
      }

      return {
        success: false,
        error: 'Token refresh failed'
      };

    } catch (error) {
      console.error(`❌ Token refresh error for ${platform}:`, error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Try alternate authentication methods (app-level credentials, etc.)
   */
  static async tryAlternateAuthentication(
    userId: number, 
    platform: string
  ): Promise<AlternateAuthResult> {
    
    try {
      switch (platform) {
        case 'facebook':
          return await this.tryFacebookAppToken(userId);
        case 'instagram':
          return await this.tryInstagramAppToken(userId);
        case 'linkedin':
          return await this.tryLinkedInAppToken(userId);
        case 'x':
          return await this.tryXAppToken(userId);
        case 'youtube':
          return await this.tryYouTubeAppToken(userId);
        default:
          return {
            success: false,
            method: 'unknown',
            error: `No alternate auth method for ${platform}`
          };
      }

    } catch (error) {
      console.error(`❌ Alternate auth error for ${platform}:`, error);
      
      return {
        success: false,
        method: 'error',
        error: error.message
      };
    }
  }

  /**
   * Try Facebook app-level token
   */
  static async tryFacebookAppToken(userId: number): Promise<AlternateAuthResult> {
    try {
      // Use Facebook app access token as fallback
      const appToken = process.env.FACEBOOK_APP_TOKEN;
      if (!appToken) {
        return {
          success: false,
          method: 'app_token',
          error: 'No Facebook app token configured'
        };
      }

      // Validate app token
      const validation = await axios.get(
        `https://graph.facebook.com/me?access_token=${appToken}`
      );

      if (validation.status === 200) {
        // Update connection with app token
        await storage.updatePlatformConnection(userId, 'facebook', {
          accessToken: appToken,
          tokenType: 'app_token',
          lastValidated: new Date(),
          isActive: true
        });

        return {
          success: true,
          method: 'app_token',
          accessToken: appToken
        };
      }

      return {
        success: false,
        method: 'app_token',
        error: 'App token validation failed'
      };

    } catch (error) {
      return {
        success: false,
        method: 'app_token',
        error: error.message
      };
    }
  }

  /**
   * Try Instagram app-level token
   */
  static async tryInstagramAppToken(userId: number): Promise<AlternateAuthResult> {
    try {
      // Instagram uses Facebook Graph API, so use Facebook app token
      return await this.tryFacebookAppToken(userId);

    } catch (error) {
      return {
        success: false,
        method: 'app_token',
        error: error.message
      };
    }
  }

  /**
   * Try LinkedIn app-level token
   */
  static async tryLinkedInAppToken(userId: number): Promise<AlternateAuthResult> {
    try {
      // LinkedIn doesn't support app-level tokens for posting
      // Would need to implement client credentials flow for specific use cases
      return {
        success: false,
        method: 'app_token',
        error: 'LinkedIn app tokens not supported for posting'
      };

    } catch (error) {
      return {
        success: false,
        method: 'app_token',
        error: error.message
      };
    }
  }

  /**
   * Try X app-level token
   */
  static async tryXAppToken(userId: number): Promise<AlternateAuthResult> {
    try {
      // X API v2 requires OAuth 2.0 user context for posting
      // App-only tokens cannot create tweets
      return {
        success: false,
        method: 'app_token',
        error: 'X app tokens cannot post tweets'
      };

    } catch (error) {
      return {
        success: false,
        method: 'app_token',
        error: error.message
      };
    }
  }

  /**
   * Try YouTube app-level token
   */
  static async tryYouTubeAppToken(userId: number): Promise<AlternateAuthResult> {
    try {
      // YouTube requires user authorization for posting
      // Service accounts could be used for specific organizational use cases
      return {
        success: false,
        method: 'app_token',
        error: 'YouTube requires user authorization for posting'
      };

    } catch (error) {
      return {
        success: false,
        method: 'app_token',
        error: error.message
      };
    }
  }

  /**
   * Batch validate all connections for a user
   */
  static async validateAllConnections(userId: number): Promise<ConnectionStatus[]> {
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    const results: ConnectionStatus[] = [];

    for (const platform of platforms) {
      const status = await this.validateAndRefreshConnection(userId, platform);
      results.push(status);
    }

    return results;
  }

  /**
   * Get connection reliability score for UI display
   */
  static async getConnectionReliabilityScore(userId: number): Promise<{
    score: number;
    totalConnections: number;
    activeConnections: number;
    needsAttention: string[];
  }> {
    
    const statuses = await this.validateAllConnections(userId);
    
    const totalConnections = statuses.length;
    const activeConnections = statuses.filter(s => s.isConnected && s.tokenValid).length;
    const needsAttention = statuses
      .filter(s => !s.isConnected || !s.tokenValid)
      .map(s => s.platform);

    const score = Math.round((activeConnections / totalConnections) * 100);

    return {
      score,
      totalConnections,
      activeConnections,
      needsAttention
    };
  }
}