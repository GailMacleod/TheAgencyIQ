import { logError, logInfo } from '../monitoring';
import { db } from '../storage';
import { platformConnections } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class OAuthRefreshService {
  /**
   * Validate and refresh OAuth token before publishing
   */
  static async validateAndRefreshConnection(userId: number, platform: string): Promise<{
    isValid: boolean;
    error?: string;
    refreshed?: boolean;
  }> {
    try {
      const connection = await db.query.platformConnections.findFirst({
        where: eq(platformConnections.userId, userId),
      });

      if (!connection) {
        return { isValid: false, error: 'No platform connection found' };
      }

      const platformData = connection.platforms as any;
      const tokenData = platformData[platform];

      if (!tokenData) {
        return { isValid: false, error: `No ${platform} connection found` };
      }

      // Check if token is expired
      const isExpired = await this.isTokenExpired(tokenData, platform);
      
      if (isExpired) {
        const refreshResult = await this.refreshToken(userId, platform, tokenData);
        return refreshResult;
      }

      return { isValid: true };
    } catch (error) {
      logError(error as Error, { userId, platform });
      return { isValid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Check if token is expired
   */
  private static async isTokenExpired(tokenData: any, platform: string): Promise<boolean> {
    switch (platform) {
      case 'facebook':
      case 'instagram':
        // Meta tokens expire after 60 days
        const metaExpiry = new Date(tokenData.tokenExpiry || 0);
        return Date.now() > metaExpiry.getTime();
      
      case 'linkedin':
        // LinkedIn tokens expire after 60 days
        const linkedinExpiry = new Date(tokenData.tokenExpiry || 0);
        return Date.now() > linkedinExpiry.getTime();
      
      case 'youtube':
        // YouTube refresh tokens don't expire
        return false;
      
      case 'x':
        // X OAuth 2.0 tokens expire after 2 hours
        const xExpiry = new Date(tokenData.tokenExpiry || 0);
        return Date.now() > xExpiry.getTime();
      
      default:
        return true;
    }
  }

  /**
   * Refresh expired token
   */
  private static async refreshToken(userId: number, platform: string, tokenData: any): Promise<{
    isValid: boolean;
    error?: string;
    refreshed?: boolean;
  }> {
    try {
      switch (platform) {
        case 'facebook':
        case 'instagram':
          return await this.refreshMetaToken(userId, platform, tokenData);
        
        case 'linkedin':
          return await this.refreshLinkedInToken(userId, tokenData);
        
        case 'youtube':
          return await this.refreshYouTubeToken(userId, tokenData);
        
        case 'x':
          return await this.refreshXToken(userId, tokenData);
        
        default:
          return { isValid: false, error: 'Platform not supported' };
      }
    } catch (error) {
      logError(error as Error, { userId, platform });
      return { isValid: false, error: 'Token refresh failed' };
    }
  }

  /**
   * Refresh Meta (Facebook/Instagram) token
   */
  private static async refreshMetaToken(userId: number, platform: string, tokenData: any): Promise<{
    isValid: boolean;
    error?: string;
    refreshed?: boolean;
  }> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_CLIENT_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&fb_exchange_token=${tokenData.accessToken}`
      );

      const data = await response.json();

      if (data.access_token) {
        // Update token in database
        await this.updateTokenInDatabase(userId, platform, {
          accessToken: data.access_token,
          tokenExpiry: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000), // 50 days
        });

        logInfo(`${platform} token refreshed successfully`, { userId });
        return { isValid: true, refreshed: true };
      }

      return { isValid: false, error: 'Failed to refresh Meta token' };
    } catch (error) {
      logError(error as Error, { userId, platform });
      return { isValid: false, error: 'Meta token refresh failed' };
    }
  }

  /**
   * Refresh LinkedIn token
   */
  private static async refreshLinkedInToken(userId: number, tokenData: any): Promise<{
    isValid: boolean;
    error?: string;
    refreshed?: boolean;
  }> {
    try {
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      });

      const data = await response.json();

      if (data.access_token) {
        await this.updateTokenInDatabase(userId, 'linkedin', {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
        });

        logInfo('LinkedIn token refreshed successfully', { userId });
        return { isValid: true, refreshed: true };
      }

      return { isValid: false, error: 'Failed to refresh LinkedIn token' };
    } catch (error) {
      logError(error as Error, { userId });
      return { isValid: false, error: 'LinkedIn token refresh failed' };
    }
  }

  /**
   * Refresh YouTube token
   */
  private static async refreshYouTubeToken(userId: number, tokenData: any): Promise<{
    isValid: boolean;
    error?: string;
    refreshed?: boolean;
  }> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refreshToken,
          client_id: process.env.YOUTUBE_CLIENT_ID!,
          client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        }),
      });

      const data = await response.json();

      if (data.access_token) {
        await this.updateTokenInDatabase(userId, 'youtube', {
          accessToken: data.access_token,
          tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
        });

        logInfo('YouTube token refreshed successfully', { userId });
        return { isValid: true, refreshed: true };
      }

      return { isValid: false, error: 'Failed to refresh YouTube token' };
    } catch (error) {
      logError(error as Error, { userId });
      return { isValid: false, error: 'YouTube token refresh failed' };
    }
  }

  /**
   * Refresh X token
   */
  private static async refreshXToken(userId: number, tokenData: any): Promise<{
    isValid: boolean;
    error?: string;
    refreshed?: boolean;
  }> {
    try {
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.X_CONSUMER_KEY}:${process.env.X_CONSUMER_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refreshToken,
        }),
      });

      const data = await response.json();

      if (data.access_token) {
        await this.updateTokenInDatabase(userId, 'x', {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
        });

        logInfo('X token refreshed successfully', { userId });
        return { isValid: true, refreshed: true };
      }

      return { isValid: false, error: 'Failed to refresh X token' };
    } catch (error) {
      logError(error as Error, { userId });
      return { isValid: false, error: 'X token refresh failed' };
    }
  }

  /**
   * Update token in database
   */
  private static async updateTokenInDatabase(userId: number, platform: string, tokenData: any): Promise<void> {
    const connection = await db.query.platformConnections.findFirst({
      where: eq(platformConnections.userId, userId),
    });

    if (connection) {
      const platforms = connection.platforms as any;
      platforms[platform] = {
        ...platforms[platform],
        ...tokenData,
      };

      await db.update(platformConnections)
        .set({ platforms })
        .where(eq(platformConnections.userId, userId));
    }
  }
}