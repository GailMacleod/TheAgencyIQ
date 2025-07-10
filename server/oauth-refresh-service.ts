import axios from 'axios';
import crypto from 'crypto';

interface RefreshResult {
  success: boolean;
  newAccessToken?: string;
  newRefreshToken?: string;
  expiresAt?: Date;
  error?: string;
  requiresReauth?: boolean;
}

export class OAuthRefreshService {
  
  static async validateAndRefreshConnection(platform: string, userId: number): Promise<RefreshResult> {
    try {
      const { storage } = await import('./storage');
      const connections = await storage.getPlatformConnectionsByUser(userId);
      const connection = connections.find(c => c.platform === platform);
      
      if (!connection) {
        return {
          success: false,
          error: `No ${platform} connection found`,
          requiresReauth: true
        };
      }

      // First validate current token
      const { OAuthStatusChecker } = await import('./oauth-status-checker');
      let validation;
      
      switch (platform) {
        case 'facebook':
          validation = await OAuthStatusChecker.validateFacebookToken(connection.accessToken);
          break;
        case 'instagram':
          validation = await OAuthStatusChecker.validateInstagramToken(connection.accessToken);
          break;
        case 'youtube':
          validation = await OAuthStatusChecker.validateYouTubeToken(connection.accessToken);
          break;
        case 'x':
          validation = await OAuthStatusChecker.validateXToken(connection.accessToken, connection.refreshToken);
          break;
        case 'linkedin':
          validation = await OAuthStatusChecker.validateLinkedInToken(connection.accessToken);
          break;
        default:
          return {
            success: false,
            error: `Unsupported platform: ${platform}`,
            requiresReauth: true
          };
      }

      // If token is valid, no refresh needed
      if (validation.isValid) {
        return {
          success: true,
          newAccessToken: connection.accessToken,
          newRefreshToken: connection.refreshToken
        };
      }

      // Token is invalid, attempt refresh
      console.log(`[OAUTH-REFRESH] Token validation failed for ${platform}, attempting refresh...`);
      
      switch (platform) {
        case 'facebook':
          return await this.refreshFacebookToken(connection, userId);
        case 'instagram':
          return await this.refreshInstagramToken(connection, userId);
        case 'youtube':
          return await this.refreshYouTubeToken(connection, userId);
        case 'x':
          return await this.refreshXToken(connection, userId);
        case 'linkedin':
          return await this.refreshLinkedInToken(connection, userId);
        default:
          return {
            success: false,
            error: `Refresh not implemented for ${platform}`,
            requiresReauth: true
          };
      }
      
    } catch (error: any) {
      console.error(`[OAUTH-REFRESH] Error for ${platform}:`, error);
      return {
        success: false,
        error: error.message,
        requiresReauth: true
      };
    }
  }

  private static async refreshFacebookToken(connection: any, userId: number): Promise<RefreshResult> {
    try {
      // Meta long-lived token refresh (valid for 60 days)
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            fb_exchange_token: connection.accessToken
          }
        }
      );

      const { access_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // Update database
      const { storage } = await import('./storage');
      await storage.updatePlatformConnection(connection.id, {
        accessToken: access_token,
        expiresAt: expiresAt
      });

      console.log(`[OAUTH-REFRESH] Facebook token refreshed successfully, expires: ${expiresAt.toISOString()}`);
      
      return {
        success: true,
        newAccessToken: access_token,
        expiresAt: expiresAt
      };
      
    } catch (error: any) {
      console.error('[OAUTH-REFRESH] Facebook refresh failed:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Facebook token refresh failed',
        requiresReauth: true
      };
    }
  }

  private static async refreshInstagramToken(connection: any, userId: number): Promise<RefreshResult> {
    try {
      // Instagram uses Facebook's token refresh mechanism
      const response = await axios.get(
        `https://graph.instagram.com/refresh_access_token`,
        {
          params: {
            grant_type: 'ig_refresh_token',
            access_token: connection.accessToken
          }
        }
      );

      const { access_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // Update database
      const { storage } = await import('./storage');
      await storage.updatePlatformConnection(connection.id, {
        accessToken: access_token,
        expiresAt: expiresAt
      });

      console.log(`[OAUTH-REFRESH] Instagram token refreshed successfully, expires: ${expiresAt.toISOString()}`);
      
      return {
        success: true,
        newAccessToken: access_token,
        expiresAt: expiresAt
      };
      
    } catch (error: any) {
      console.error('[OAUTH-REFRESH] Instagram refresh failed:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Instagram token refresh failed',
        requiresReauth: true
      };
    }
  }

  private static async refreshYouTubeToken(connection: any, userId: number): Promise<RefreshResult> {
    try {
      if (!connection.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available',
          requiresReauth: true
        };
      }

      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: process.env.YOUTUBE_CLIENT_ID,
          client_secret: process.env.YOUTUBE_CLIENT_SECRET,
          refresh_token: connection.refreshToken,
          grant_type: 'refresh_token'
        }
      );

      const { access_token, expires_in, refresh_token } = response.data;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // Update database
      const { storage } = await import('./storage');
      await storage.updatePlatformConnection(connection.id, {
        accessToken: access_token,
        refreshToken: refresh_token || connection.refreshToken, // Keep existing if not provided
        expiresAt: expiresAt
      });

      console.log(`[OAUTH-REFRESH] YouTube token refreshed successfully, expires: ${expiresAt.toISOString()}`);
      
      return {
        success: true,
        newAccessToken: access_token,
        newRefreshToken: refresh_token || connection.refreshToken,
        expiresAt: expiresAt
      };
      
    } catch (error: any) {
      console.error('[OAUTH-REFRESH] YouTube refresh failed:', error.response?.data || error.message);
      return {
        success: false,
        error: 'YouTube token refresh failed',
        requiresReauth: true
      };
    }
  }

  private static async refreshXToken(connection: any, userId: number): Promise<RefreshResult> {
    try {
      if (!process.env.X_CONSUMER_KEY || !process.env.X_CONSUMER_SECRET) {
        return {
          success: false,
          error: 'X API credentials not configured',
          requiresReauth: true
        };
      }

      if (!connection.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available for X',
          requiresReauth: true
        };
      }

      // X OAuth 2.0 token refresh
      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        {
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
          client_id: process.env.X_CONSUMER_KEY
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          auth: {
            username: process.env.X_CONSUMER_KEY,
            password: process.env.X_CONSUMER_SECRET
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // Update database
      const { storage } = await import('./storage');
      await storage.updatePlatformConnection(connection.id, {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt
      });

      console.log(`[OAUTH-REFRESH] X token refreshed successfully, expires: ${expiresAt.toISOString()}`);
      
      return {
        success: true,
        newAccessToken: access_token,
        newRefreshToken: refresh_token,
        expiresAt: expiresAt
      };
      
    } catch (error: any) {
      console.error('[OAUTH-REFRESH] X refresh failed:', error.response?.data || error.message);
      return {
        success: false,
        error: 'X token refresh failed',
        requiresReauth: true
      };
    }
  }

  private static async refreshLinkedInToken(connection: any, userId: number): Promise<RefreshResult> {
    try {
      if (!connection.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available for LinkedIn',
          requiresReauth: true
        };
      }

      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        {
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // Update database
      const { storage } = await import('./storage');
      await storage.updatePlatformConnection(connection.id, {
        accessToken: access_token,
        refreshToken: refresh_token || connection.refreshToken,
        expiresAt: expiresAt
      });

      console.log(`[OAUTH-REFRESH] LinkedIn token refreshed successfully, expires: ${expiresAt.toISOString()}`);
      
      return {
        success: true,
        newAccessToken: access_token,
        newRefreshToken: refresh_token || connection.refreshToken,
        expiresAt: expiresAt
      };
      
    } catch (error: any) {
      console.error('[OAUTH-REFRESH] LinkedIn refresh failed:', error.response?.data || error.message);
      return {
        success: false,
        error: 'LinkedIn token refresh failed',
        requiresReauth: true
      };
    }
  }
}