/**
 * TOKEN VALIDATOR
 * Enhanced OAuth token validation and refresh system
 * Ensures platform connections remain valid for bulletproof publishing
 */

import { storage } from './storage';
import axios from 'axios';

interface TokenValidationResult {
  valid: boolean;
  needsRefresh: boolean;
  needsReconnection: boolean;
  error?: string;
  expiresAt?: Date;
}

interface TokenRefreshResult {
  success: boolean;
  newToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

export class TokenValidator {

  /**
   * Validate platform token with comprehensive checks
   */
  static async validatePlatformToken(connection: any): Promise<TokenValidationResult> {
    try {
      console.log(`🔍 TOKEN VALIDATOR: Checking ${connection.platform} token validity`);

      // Basic validation checks
      if (!connection.accessToken) {
        return {
          valid: false,
          needsRefresh: false,
          needsReconnection: true,
          error: 'No access token found'
        };
      }

      // Check for demo/test tokens
      if (connection.accessToken.includes('demo_') || 
          connection.accessToken.includes('mock_') ||
          connection.accessToken.includes('test_')) {
        return {
          valid: false,
          needsRefresh: false,
          needsReconnection: true,
          error: 'Demo/test token detected'
        };
      }

      // Check token expiry
      if (connection.expiresAt) {
        const now = new Date();
        const expiryDate = new Date(connection.expiresAt);
        const timeUntilExpiry = expiryDate.getTime() - now.getTime();
        
        // Token expired
        if (timeUntilExpiry <= 0) {
          return {
            valid: false,
            needsRefresh: true,
            needsReconnection: !connection.refreshToken,
            error: 'Token expired'
          };
        }
        
        // Token expires within 1 hour - preemptive refresh
        if (timeUntilExpiry < 60 * 60 * 1000) {
          return {
            valid: false,
            needsRefresh: true,
            needsReconnection: !connection.refreshToken,
            error: 'Token expires soon'
          };
        }
      }

      // Platform-specific token validation
      const platformValidation = await this.validateTokenWithPlatform(connection);
      
      if (!platformValidation.valid) {
        return {
          valid: false,
          needsRefresh: connection.refreshToken ? true : false,
          needsReconnection: !connection.refreshToken,
          error: platformValidation.error || 'Platform validation failed'
        };
      }

      console.log(`✅ TOKEN VALIDATOR: ${connection.platform} token is valid`);
      return {
        valid: true,
        needsRefresh: false,
        needsReconnection: false
      };

    } catch (error: any) {
      console.error(`TOKEN VALIDATOR ERROR for ${connection.platform}:`, error.message);
      return {
        valid: false,
        needsRefresh: false,
        needsReconnection: true,
        error: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Refresh platform token using refresh token
   */
  static async refreshPlatformToken(connection: any): Promise<TokenRefreshResult> {
    try {
      console.log(`🔄 TOKEN VALIDATOR: Refreshing ${connection.platform} token`);

      if (!connection.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available'
        };
      }

      // Platform-specific token refresh
      const refreshResult = await this.refreshTokenWithPlatform(connection);
      
      if (refreshResult.success) {
        console.log(`✅ TOKEN VALIDATOR: ${connection.platform} token refreshed successfully`);
      } else {
        console.log(`❌ TOKEN VALIDATOR: ${connection.platform} token refresh failed - ${refreshResult.error}`);
      }

      return refreshResult;

    } catch (error: any) {
      console.error(`TOKEN REFRESH ERROR for ${connection.platform}:`, error.message);
      return {
        success: false,
        error: `Refresh error: ${error.message}`
      };
    }
  }

  /**
   * Validate all user tokens
   */
  static async validateAllUserTokens(userId: number, connections: any[]): Promise<Record<string, TokenValidationResult>> {
    const results: Record<string, TokenValidationResult> = {};

    for (const connection of connections) {
      if (connection.isActive) {
        results[connection.platform] = await this.validatePlatformToken(connection);
      }
    }

    return results;
  }

  /**
   * Platform-specific token validation
   */
  private static async validateTokenWithPlatform(connection: any): Promise<{ valid: boolean; error?: string }> {
    try {
      switch (connection.platform.toLowerCase()) {
        case 'facebook':
          return await this.validateFacebookToken(connection.accessToken);
        case 'instagram':
          return await this.validateInstagramToken(connection.accessToken);
        case 'linkedin':
          return await this.validateLinkedInToken(connection.accessToken);
        case 'x':
          return await this.validateXToken(connection.accessToken);
        case 'youtube':
          return await this.validateYouTubeToken(connection.accessToken);
        default:
          return { valid: false, error: 'Unsupported platform' };
      }
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Platform-specific token refresh
   */
  private static async refreshTokenWithPlatform(connection: any): Promise<TokenRefreshResult> {
    try {
      switch (connection.platform.toLowerCase()) {
        case 'facebook':
          return await this.refreshFacebookToken(connection);
        case 'instagram':
          return await this.refreshInstagramToken(connection);
        case 'linkedin':
          return await this.refreshLinkedInToken(connection);
        case 'x':
          return await this.refreshXToken(connection);
        case 'youtube':
          return await this.refreshYouTubeToken(connection);
        default:
          return { success: false, error: 'Unsupported platform' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Facebook token validation
  private static async validateFacebookToken(accessToken: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await axios.get(`https://graph.facebook.com/me?access_token=${accessToken}`);
      return { valid: !!response.data.id };
    } catch (error: any) {
      return { valid: false, error: 'Facebook token invalid' };
    }
  }

  // Instagram token validation
  private static async validateInstagramToken(accessToken: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await axios.get(`https://graph.facebook.com/me?access_token=${accessToken}`);
      return { valid: !!response.data.id };
    } catch (error: any) {
      return { valid: false, error: 'Instagram token invalid' };
    }
  }

  // LinkedIn token validation
  private static async validateLinkedInToken(accessToken: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/people/~', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return { valid: !!response.data.id };
    } catch (error: any) {
      return { valid: false, error: 'LinkedIn token invalid' };
    }
  }

  // X (Twitter) token validation
  private static async validateXToken(accessToken: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await axios.get('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return { valid: !!response.data.data?.id };
    } catch (error: any) {
      return { valid: false, error: 'X token invalid' };
    }
  }

  // YouTube token validation
  private static async validateYouTubeToken(accessToken: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return { valid: !!response.data.items?.length };
    } catch (error: any) {
      return { valid: false, error: 'YouTube token invalid' };
    }
  }

  // Facebook token refresh
  private static async refreshFacebookToken(connection: any): Promise<TokenRefreshResult> {
    try {
      const response = await axios.post('https://graph.facebook.com/oauth/access_token', {
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET
      });

      return {
        success: true,
        newToken: response.data.access_token,
        refreshToken: response.data.refresh_token || connection.refreshToken,
        expiresAt: new Date(Date.now() + (response.data.expires_in * 1000))
      };
    } catch (error: any) {
      return { success: false, error: 'Facebook token refresh failed' };
    }
  }

  // Instagram token refresh (uses Facebook refresh)
  private static async refreshInstagramToken(connection: any): Promise<TokenRefreshResult> {
    return await this.refreshFacebookToken(connection);
  }

  // LinkedIn token refresh
  private static async refreshLinkedInToken(connection: any): Promise<TokenRefreshResult> {
    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      });

      return {
        success: true,
        newToken: response.data.access_token,
        refreshToken: response.data.refresh_token || connection.refreshToken,
        expiresAt: new Date(Date.now() + (response.data.expires_in * 1000))
      };
    } catch (error: any) {
      return { success: false, error: 'LinkedIn token refresh failed' };
    }
  }

  // X (Twitter) token refresh
  private static async refreshXToken(connection: any): Promise<TokenRefreshResult> {
    try {
      const response = await axios.post('https://api.twitter.com/2/oauth2/token', {
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: process.env.TWITTER_CLIENT_ID
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
        }
      });

      return {
        success: true,
        newToken: response.data.access_token,
        refreshToken: response.data.refresh_token || connection.refreshToken,
        expiresAt: new Date(Date.now() + (response.data.expires_in * 1000))
      };
    } catch (error: any) {
      return { success: false, error: 'X token refresh failed' };
    }
  }

  // YouTube token refresh
  private static async refreshYouTubeToken(connection: any): Promise<TokenRefreshResult> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET
      });

      return {
        success: true,
        newToken: response.data.access_token,
        refreshToken: response.data.refresh_token || connection.refreshToken,
        expiresAt: new Date(Date.now() + (response.data.expires_in * 1000))
      };
    } catch (error: any) {
      return { success: false, error: 'YouTube token refresh failed' };
    }
  }
}