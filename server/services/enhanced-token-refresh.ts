/**
 * Enhanced Token Refresh Service
 * Implements platform-specific token refresh with proper error handling
 */

import axios from 'axios';
import { storage } from '../storage';

export class EnhancedTokenRefresh {
  
  /**
   * Auto-refresh token for a specific platform
   */
  static async autoRefreshToken(userId: number, platform: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await storage.getPlatformConnection(userId, platform);
      
      if (!connection || !connection.refreshToken) {
        return { 
          success: false, 
          error: 'No refresh token available' 
        };
      }

      let refreshResult;
      
      switch (platform) {
        case 'facebook':
        case 'instagram':
          refreshResult = await this.refreshFacebookToken(connection.refreshToken);
          break;
        case 'linkedin':
          refreshResult = await this.refreshLinkedInToken(connection.refreshToken);
          break;
        case 'youtube':
          refreshResult = await this.refreshYouTubeToken(connection.refreshToken);
          break;
        case 'x':
        case 'twitter':
          // Twitter OAuth 1.0a doesn't use refresh tokens
          return { success: false, error: 'Twitter OAuth 1.0a does not support token refresh' };
        default:
          return { success: false, error: `Unsupported platform: ${platform}` };
      }

      if (refreshResult.success) {
        // Update database with new tokens
        await storage.updatePlatformConnectionToken(
          userId.toString(), 
          platform, 
          refreshResult.accessToken,
          refreshResult.refreshToken || connection.refreshToken,
          refreshResult.expiresAt
        );
        
        console.log(`✅ Token refreshed successfully for ${platform} (User ${userId})`);
        return { success: true };
      } else {
        console.error(`❌ Token refresh failed for ${platform}:`, refreshResult.error);
        return { success: false, error: refreshResult.error };
      }

    } catch (error) {
      console.error(`❌ Token refresh error for ${platform}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh Facebook/Instagram token
   */
  private static async refreshFacebookToken(refreshToken: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; expiresAt?: Date; error?: string }> {
    try {
      const response = await axios.post('https://graph.facebook.com/v18.0/oauth/access_token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET
      });

      const { access_token, refresh_token, expires_in } = response.data;
      
      return {
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (expires_in * 1000))
      };

    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Refresh LinkedIn token
   */
  private static async refreshLinkedInToken(refreshToken: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; expiresAt?: Date; error?: string }> {
    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, refresh_token, expires_in } = response.data;
      
      return {
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (expires_in * 1000))
      };

    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error_description || error.message
      };
    }
  }

  /**
   * Refresh YouTube (Google) token
   */
  private static async refreshYouTubeToken(refreshToken: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; expiresAt?: Date; error?: string }> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET
      });

      const { access_token, refresh_token, expires_in } = response.data;
      
      return {
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (expires_in * 1000))
      };

    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error_description || error.message
      };
    }
  }

  /**
   * Check if token needs refresh (expires within 5 minutes)
   */
  static needsRefresh(expiresAt: Date): boolean {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    return expiresAt <= fiveMinutesFromNow;
  }
}

export default EnhancedTokenRefresh;