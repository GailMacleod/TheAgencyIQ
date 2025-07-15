/**
 * Direct Publisher Service
 * Posts to social media platforms using app-level credentials
 * Users don't need to set up their own OAuth - the app handles everything
 */

import crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import axios from 'axios';
import { PlatformPostManager } from './platform-post-manager';

export interface DirectPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export class DirectPublisher {

  /**
   * Enhanced publish with token refresh and connection reliability
   */
  static async publishWithReliability(platform: string, content: string, connection: any): Promise<DirectPublishResult> {
    try {
      // Step 1: Validate and refresh token if needed
      const tokenValidation = await this.validateAndRefreshToken(connection);
      if (!tokenValidation.valid) {
        return { success: false, error: `Token validation failed: ${tokenValidation.error}` };
      }

      // Step 2: Use refreshed connection if available
      const activeConnection = tokenValidation.connection || connection;

      // Step 3: Attempt publication with enhanced error handling
      let result;
      switch (platform) {
        case 'facebook':
          result = await this.publishToFacebook(content, activeConnection.accessToken);
          break;
        case 'instagram':
          result = await this.publishToInstagram(content, activeConnection.accessToken);
          break;
        case 'linkedin':
          result = await this.publishToLinkedIn(content, activeConnection.accessToken);
          break;
        case 'x':
          result = await this.publishToX(content, activeConnection.accessToken, activeConnection.tokenSecret);
          break;
        case 'youtube':
          result = await this.publishToYouTube(content, activeConnection.accessToken);
          break;
        default:
          return { success: false, error: `Unsupported platform: ${platform}` };
      }

      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Enhanced posts endpoint with real API integration and quota management
   */
  static async publishPostWithQuotaManagement(userId: number, content: string, platforms: string[]): Promise<{
    success: boolean;
    platformPostIds?: { [key: string]: string };
    quotaDeducted?: number;
    error?: string;
  }> {
    try {
      const publishedPlatforms: { [key: string]: string } = {};
      let quotaDeducted = 0;

      for (const platform of platforms) {
        const result = await this.publishToPlatform(platform, content);
        
        if (result.success && result.platformPostId) {
          publishedPlatforms[platform] = result.platformPostId;
          quotaDeducted++;
        }
      }

      if (Object.keys(publishedPlatforms).length > 0) {
        return {
          success: true,
          platformPostIds: publishedPlatforms,
          quotaDeducted
        };
      } else {
        return { success: false, error: 'Failed to publish to any platform' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Publish to specific platform with real API
   */
  static async publishToPlatform(platform: string, content: string): Promise<DirectPublishResult> {
    switch (platform) {
      case 'facebook':
        return await this.publishToFacebook(content, process.env.FACEBOOK_ACCESS_TOKEN || 'test_token');
      case 'instagram':
        return await this.publishToInstagram(content, process.env.INSTAGRAM_ACCESS_TOKEN || 'test_token');
      case 'linkedin':
        return await this.publishToLinkedIn(content, process.env.LINKEDIN_ACCESS_TOKEN || 'test_token');
      case 'x':
        return await this.publishToX(content, process.env.X_ACCESS_TOKEN || 'test_token', process.env.X_TOKEN_SECRET || 'test_secret');
      case 'youtube':
        return await this.publishToYouTube(content, process.env.YOUTUBE_ACCESS_TOKEN || 'test_token');
      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }
  }

  /**
   * Validate and refresh token with enhanced error handling
   */
  static async validateAndRefreshToken(connection: any): Promise<{valid: boolean, connection?: any, error?: string}> {
    try {
      // Check if token is expired
      if (connection.expiresAt && new Date() > new Date(connection.expiresAt)) {
        console.log(`Token expired for ${connection.platform}, attempting refresh`);
        
        // Try to refresh token
        const refreshResult = await this.refreshToken(connection);
        if (refreshResult.success) {
          console.log(`✅ Token refreshed successfully for ${connection.platform}`);
          return { valid: true, connection: { ...connection, ...refreshResult } };
        } else {
          return { valid: false, error: 'Token refresh failed' };
        }
      }

      // Token is still valid or no expiry set
      return { valid: true, connection };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Refresh token based on platform
   */
  static async refreshToken(connection: any): Promise<{success: boolean, accessToken?: string, refreshToken?: string, expiresAt?: Date}> {
    try {
      if (!connection.refreshToken) {
        return { success: false };
      }

      switch (connection.platform) {
        case 'facebook':
        case 'instagram':
          return await this.refreshFacebookToken(connection);
        case 'linkedin':
          return await this.refreshLinkedInToken(connection);
        case 'youtube':
          return await this.refreshYouTubeToken(connection);
        default:
          return { success: false };
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false };
    }
  }

  /**
   * Publish directly to Facebook using direct tokens or app page token
   */
  static async publishToFacebook(content: string, accessToken?: string): Promise<DirectPublishResult> {
    try {
      // Import database connection
      const { db } = await import('./db');
      const { platformConnections } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      // Get active Facebook connection from database
      const [connection] = await db
        .select()
        .from(platformConnections)
        .where(and(
          eq(platformConnections.platform, 'facebook'),
          eq(platformConnections.isActive, true)
        ))
        .limit(1);
      
      if (!connection) {
        return { success: false, error: 'No active Facebook connection found' };
      }
      
      // Use provided token or connection token
      const token = accessToken || connection.accessToken;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!token) {
        return { success: false, error: 'Facebook credentials not configured' };
      }

      // Check if this is a direct token (created by our system)
      if (token.includes('facebook_direct_token_')) {
        return { success: false, error: 'Direct tokens are not supported for real publishing' };
      }

      // REAL Facebook Graph API publishing
      
      if (!appSecret) {
        return { success: false, error: 'Facebook app secret missing' };
      }
      
      // Generate app secret proof for enhanced security
      const appsecretProof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');
      
      // Publish to Facebook user feed using Graph API
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/feed`,
        {
          message: content,
          access_token: token,
          appsecret_proof: appsecretProof
        }
      );
      
      if (response.data && response.data.id) {
        console.log(`✅ REAL Facebook post published with platform post ID: ${response.data.id}`);
        
        // Record successful publication with quota deduction
        const result = await PlatformPostManager.recordSuccessfulPublication(
          connection.userId,
          'facebook',
          content,
          response.data.id
        );
        
        return { 
          success: true, 
          platformPostId: response.data.id,
          quotaDeducted: result.quotaDeducted
        };
      } else {
        return { success: false, error: 'Facebook API returned no post ID' };
      }
      
    } catch (error: any) {
      // Record failed publication
      if (connection) {
        await PlatformPostManager.recordFailedPublication(
          connection.userId,
          'facebook',
          content,
          error.message
        );
      }
      return { success: false, error: `Facebook error: ${error.message}` };
    }
  }

  /**
   * Publish to LinkedIn using direct tokens or app credentials
   */
  static async publishToLinkedIn(content: string, accessToken?: string): Promise<DirectPublishResult> {
    try {
      // Use provided token or environment token
      const token = accessToken || process.env.LINKEDIN_TOKEN || process.env.LINKEDIN_ACCESS_TOKEN;
      
      if (!token) {
        return { success: false, error: 'LinkedIn access token not configured' };
      }

      // Check if this is a direct token (created by our system)
      if (token.includes('linkedin_direct_token_')) {
        return { success: false, error: 'Direct tokens are not supported for real publishing' };
      }

      // REAL LinkedIn Publishing using LinkedIn Marketing API
      
      // Get LinkedIn person ID first
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/people/~',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const personId = profileResponse.data.id;
      
      // Create LinkedIn share
      const shareResponse = await axios.post(
        'https://api.linkedin.com/v2/shares',
        {
          owner: `urn:li:person:${personId}`,
          text: {
            text: content
          },
          distribution: {
            linkedInDistributionTarget: {}
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (shareResponse.data && shareResponse.data.id) {
        console.log(`✅ REAL LinkedIn post published: ${shareResponse.data.id}`);
        
        // Record successful publication with quota deduction
        const result = await PlatformPostManager.recordSuccessfulPublication(
          connection.userId,
          'linkedin',
          content,
          shareResponse.data.id
        );
        
        return { 
          success: true, 
          platformPostId: shareResponse.data.id,
          quotaDeducted: result.quotaDeducted
        };
      } else {
        return { success: false, error: 'LinkedIn API returned no post ID' };
      }
      
    } catch (error: any) {
      // Record failed publication
      if (connection) {
        await PlatformPostManager.recordFailedPublication(
          connection.userId,
          'linkedin',
          content,
          error.message
        );
      }
      return { success: false, error: `LinkedIn error: ${error.message}` };
    }
  }

  /**
   * Publish to Instagram using direct tokens or app credentials
   */
  static async publishToInstagram(content: string, accessToken?: string): Promise<DirectPublishResult> {
    try {
      // Import database connection
      const { db } = await import('./db');
      const { platformConnections } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      // Get active Instagram connection from database
      const [connection] = await db
        .select()
        .from(platformConnections)
        .where(and(
          eq(platformConnections.platform, 'instagram'),
          eq(platformConnections.isActive, true)
        ))
        .limit(1);
      
      if (!connection) {
        return { success: false, error: 'No active Instagram connection found' };
      }
      
      // Use provided token or connection token
      const token = accessToken || connection.accessToken;
      
      if (!token) {
        return { success: false, error: 'Instagram credentials not configured' };
      }

      // Check if this is a direct token (created by our system)
      if (token.includes('instagram_direct_token_')) {
        return { success: false, error: 'Direct tokens are not supported for real publishing' };
      }

      // REAL Instagram Publishing using Instagram Graph API
      
      // Get Instagram account ID
      const accountResponse = await axios.get(
        `https://graph.instagram.com/me/accounts?access_token=${token}`
      );
      
      if (!accountResponse.data.data || accountResponse.data.data.length === 0) {
        return { success: false, error: 'No Instagram business account found' };
      }
      
      const instagramAccountId = accountResponse.data.data[0].id;
      
      // Create Instagram media object
      const mediaResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${instagramAccountId}/media`,
        {
          caption: content,
          image_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1080&h=1080&fit=crop',
          access_token: token
        }
      );
      
      if (!mediaResponse.data.id) {
        return { success: false, error: 'Failed to create Instagram media' };
      }
      
      // Publish the media
      const publishResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${instagramAccountId}/media_publish`,
        {
          creation_id: mediaResponse.data.id,
          access_token: token
        }
      );
      
      if (publishResponse.data && publishResponse.data.id) {
        console.log(`✅ REAL Instagram post published: ${publishResponse.data.id}`);
        
        // Record successful publication with quota deduction
        const result = await PlatformPostManager.recordSuccessfulPublication(
          connection.userId,
          'instagram', 
          content,
          publishResponse.data.id
        );
        
        return { 
          success: true, 
          platformPostId: publishResponse.data.id,
          quotaDeducted: result.quotaDeducted
        };
      } else {
        return { success: false, error: 'Instagram publish API returned no post ID' };
      }
      
    } catch (error: any) {
      // Record failed publication
      if (connection) {
        await PlatformPostManager.recordFailedPublication(
          connection.userId,
          'instagram',
          content,
          error.message
        );
      }
      return { success: false, error: `Instagram error: ${error.message}` };
    }
  }

  /**
   * Publish to X using OAuth 2.0 User Context from database or direct tokens
   */
  static async publishToTwitter(content: string, accessToken?: string): Promise<DirectPublishResult> {
    try {
      // Use provided token or get from database
      if (accessToken && accessToken.includes('x_direct_token_')) {
        return { success: false, error: 'Direct tokens are not supported for real publishing' };
      }
      
      // Import database connection
      const { db } = await import('./db');
      const { platformConnections } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      // Get active X connection from database
      const [connection] = await db
        .select()
        .from(platformConnections)
        .where(and(
          eq(platformConnections.platform, 'x'),
          eq(platformConnections.isActive, true)
        ))
        .orderBy(platformConnections.connectedAt)
        .limit(1);

      if (!connection) {
        return { success: false, error: 'No active X connection found. Please complete OAuth 2.0 authorization first.' };
      }

      // Check if this is a direct token
      if (connection.accessToken && connection.accessToken.includes('x_direct_token_')) {
        return { success: false, error: 'Direct tokens are not supported for real publishing' };
      }

      // REAL X Publishing using X API v2 with OAuth 1.0a
      
      // Set up OAuth 1.0a for X API
      const oauth = new OAuth({
        consumer: {
          key: process.env.X_CONSUMER_KEY || process.env.TWITTER_CONSUMER_KEY,
          secret: process.env.X_CONSUMER_SECRET || process.env.TWITTER_CONSUMER_SECRET
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
          return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        }
      });
      
      const requestData = {
        url: 'https://api.twitter.com/2/tweets',
        method: 'POST'
      };
      
      const token = {
        key: connection.accessToken,
        secret: connection.tokenSecret
      };
      
      // Create X tweet
      const tweetResponse = await axios.post(
        'https://api.twitter.com/2/tweets',
        {
          text: content.substring(0, 280) // X character limit
        },
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (tweetResponse.data && tweetResponse.data.data && tweetResponse.data.data.id) {
        console.log(`✅ REAL X post published with platform post ID: ${tweetResponse.data.data.id}`);
        
        // Record successful publication with quota deduction
        const result = await PlatformPostManager.recordSuccessfulPublication(
          connection.userId,
          'x',
          content,
          tweetResponse.data.data.id
        );
        
        return { 
          success: true, 
          platformPostId: tweetResponse.data.data.id,
          quotaDeducted: result.quotaDeducted
        };
      } else {
        return { success: false, error: 'X API returned no tweet ID' };
      }


      
    } catch (error: any) {
      // Record failed publication
      if (connection) {
        await PlatformPostManager.recordFailedPublication(
          connection.userId,
          'x',
          content,
          error.message
        );
      }
      return { success: false, error: `X error: ${error.message}` };
    }
  }

  /**
   * Publish to YouTube using OAuth 2.0 credentials or direct tokens
   */
  static async publishToYouTube(content: string, accessToken?: string): Promise<DirectPublishResult> {
    try {
      // Use provided token or get from database
      if (accessToken && accessToken.includes('youtube_direct_token_')) {
        return { success: false, error: 'Direct tokens are not supported for real publishing' };
      }
      
      // Import database connection
      const { db } = await import('./db');
      const { platformConnections } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      // Get active YouTube connection from database
      const [connection] = await db
        .select()
        .from(platformConnections)
        .where(and(
          eq(platformConnections.platform, 'youtube'),
          eq(platformConnections.isActive, true)
        ))
        .orderBy(platformConnections.connectedAt)
        .limit(1);

      if (!connection) {
        return { success: false, error: 'No active YouTube connection found. Please complete OAuth 2.0 authorization first.' };
      }

      // Check if this is a direct token
      if (connection.accessToken && connection.accessToken.includes('youtube_direct_token_')) {
        return { success: false, error: 'Direct tokens are not supported for real publishing' };
      }

      // REAL YouTube Publishing using YouTube Data API v3
      
      // Create YouTube community post
      const communityResponse = await axios.post(
        'https://www.googleapis.com/youtube/v3/activities',
        {
          snippet: {
            description: content
          },
          status: {
            privacyStatus: 'public'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            part: 'snippet,status'
          }
        }
      );
      
      if (communityResponse.data && communityResponse.data.id) {
        console.log(`✅ REAL YouTube post published: ${communityResponse.data.id}`);
        
        // Record successful publication with quota deduction
        const result = await PlatformPostManager.recordSuccessfulPublication(
          connection.userId,
          'youtube',
          content,
          communityResponse.data.id
        );
        
        return { 
          success: true, 
          platformPostId: communityResponse.data.id,
          quotaDeducted: result.quotaDeducted
        };
      } else {
        return { success: false, error: 'YouTube API returned no post ID' };
      }


      
    } catch (error: any) {
      // Record failed publication
      if (connection) {
        await PlatformPostManager.recordFailedPublication(
          connection.userId,
          'youtube',
          content,
          error.message
        );
      }
      return { success: false, error: `YouTube error: ${error.message}` };
    }
  }

  /**
   * Publish to any platform using direct credentials
   */
  static async publishToPlatform(platform: string, content: string, accessToken?: string): Promise<DirectPublishResult> {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return await this.publishToFacebook(content, accessToken);
      case 'linkedin':
        return await this.publishToLinkedIn(content, accessToken);
      case 'instagram':
        return await this.publishToInstagram(content, accessToken);
      case 'twitter':
      case 'x':
        return await this.publishToTwitter(content, accessToken);
      case 'youtube':
        return await this.publishToYouTube(content, accessToken);
      default:
        return { success: false, error: `Platform ${platform} not supported` };
    }
  }

  /**
   * Token refresh methods for enhanced connection reliability
   */
  static async refreshFacebookToken(connection: any): Promise<{success: boolean, accessToken?: string, refreshToken?: string, expiresAt?: Date}> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${connection.accessToken}`
      );
      
      if (response.data.access_token) {
        return {
          success: true,
          accessToken: response.data.access_token,
          expiresAt: new Date(Date.now() + (response.data.expires_in * 1000))
        };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Facebook token refresh error:', error);
      return { success: false };
    }
  }

  static async refreshLinkedInToken(connection: any): Promise<{success: boolean, accessToken?: string, refreshToken?: string, expiresAt?: Date}> {
    try {
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID || '',
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || ''
        })
      );
      
      if (response.data.access_token) {
        return {
          success: true,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt: new Date(Date.now() + (response.data.expires_in * 1000))
        };
      }
      
      return { success: false };
    } catch (error) {
      console.error('LinkedIn token refresh error:', error);
      return { success: false };
    }
  }

  static async refreshYouTubeToken(connection: any): Promise<{success: boolean, accessToken?: string, refreshToken?: string, expiresAt?: Date}> {
    try {
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
          client_id: process.env.YOUTUBE_CLIENT_ID,
          client_secret: process.env.YOUTUBE_CLIENT_SECRET
        }
      );
      
      if (response.data.access_token) {
        return {
          success: true,
          accessToken: response.data.access_token,
          expiresAt: new Date(Date.now() + (response.data.expires_in * 1000))
        };
      }
      
      return { success: false };
    } catch (error) {
      console.error('YouTube token refresh error:', error);
      return { success: false };
    }
  }
}