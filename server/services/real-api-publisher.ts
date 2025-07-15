/**
 * REAL API PUBLISHER SERVICE
 * Handles actual API publishing to all 5 platforms with proper post ID tracking
 * No simulations - uses authentic platform APIs with quota management
 */

import axios from 'axios';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { platformPostManager } from './platform-post-manager';
import { storage } from '../storage';

export interface RealApiPublishResult {
  success: boolean;
  platformPostId?: string;
  platform: string;
  error?: string;
  quotaDeducted: boolean;
  apiResponse?: any;
}

export class RealApiPublisher {
  
  /**
   * Publish to all platforms with real APIs and quota management
   */
  static async publishToAllPlatforms(userId: number, postId: number, content: string, platforms: string[]): Promise<{
    success: boolean;
    results: RealApiPublishResult[];
    totalQuotaDeducted: number;
    errors: string[];
  }> {
    const results: RealApiPublishResult[] = [];
    const errors: string[] = [];
    let totalQuotaDeducted = 0;
    
    console.log(`🚀 Publishing to ${platforms.length} platforms with real APIs`);
    
    for (const platform of platforms) {
      try {
        const result = await this.publishToPlatform(userId, postId, content, platform);
        results.push(result);
        
        if (result.success && result.quotaDeducted) {
          totalQuotaDeducted++;
        }
        
        if (!result.success) {
          errors.push(`${platform}: ${result.error}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${platform}: ${errorMsg}`);
        results.push({
          success: false,
          platform,
          error: errorMsg,
          quotaDeducted: false
        });
      }
    }
    
    const overallSuccess = results.some(r => r.success);
    
    return {
      success: overallSuccess,
      results,
      totalQuotaDeducted,
      errors
    };
  }

  /**
   * Publish to individual platform with real API
   */
  private static async publishToPlatform(userId: number, postId: number, content: string, platform: string): Promise<RealApiPublishResult> {
    console.log(`📤 Publishing to ${platform} with real API`);
    
    try {
      // Get platform connection
      const connections = await storage.getPlatformConnectionsByUser(userId);
      const connection = connections.find(conn => conn.platform === platform);
      
      if (!connection) {
        return {
          success: false,
          platform,
          error: `No ${platform} connection found`,
          quotaDeducted: false
        };
      }
      
      // Validate and refresh token if needed
      const tokenValidation = await this.validateAndRefreshToken(connection);
      if (!tokenValidation.valid) {
        return {
          success: false,
          platform,
          error: `Token validation failed: ${tokenValidation.error}`,
          quotaDeducted: false
        };
      }
      
      // Use refreshed connection
      const activeConnection = tokenValidation.connection || connection;
      
      // Platform-specific publishing with real APIs
      let platformResult;
      switch (platform) {
        case 'facebook':
          platformResult = await this.publishToFacebook(content, activeConnection);
          break;
        case 'instagram':
          platformResult = await this.publishToInstagram(content, activeConnection);
          break;
        case 'linkedin':
          platformResult = await this.publishToLinkedIn(content, activeConnection);
          break;
        case 'x':
          platformResult = await this.publishToX(content, activeConnection);
          break;
        case 'youtube':
          platformResult = await this.publishToYouTube(content, activeConnection);
          break;
        default:
          return {
            success: false,
            platform,
            error: `Unsupported platform: ${platform}`,
            quotaDeducted: false
          };
      }
      
      // Handle quota deduction only on successful publish
      if (platformResult.success && platformResult.platformPostId) {
        // Record platform post ID and deduct quota
        const quotaResult = await platformPostManager.recordPlatformPost(
          userId,
          postId,
          platform,
          platformResult.platformPostId
        );
        
        return {
          success: true,
          platform,
          platformPostId: platformResult.platformPostId,
          quotaDeducted: quotaResult.quotaDeducted,
          apiResponse: platformResult.apiResponse
        };
      } else {
        return {
          success: false,
          platform,
          error: platformResult.error,
          quotaDeducted: false
        };
      }
      
    } catch (error) {
      console.error(`❌ Platform publishing error for ${platform}:`, error);
      return {
        success: false,
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
        quotaDeducted: false
      };
    }
  }

  /**
   * Publish to Facebook with real Graph API
   */
  private static async publishToFacebook(content: string, connection: any): Promise<{
    success: boolean;
    platformPostId?: string;
    error?: string;
    apiResponse?: any;
  }> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/feed`,
        {
          message: content,
          access_token: connection.accessToken
        }
      );
      
      if (response.data && response.data.id) {
        console.log(`✅ Facebook post published: ${response.data.id}`);
        return {
          success: true,
          platformPostId: response.data.id,
          apiResponse: response.data
        };
      } else {
        return {
          success: false,
          error: 'Facebook API returned no post ID'
        };
      }
      
    } catch (error: any) {
      console.error('Facebook API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Publish to Instagram with real Graph API
   */
  private static async publishToInstagram(content: string, connection: any): Promise<{
    success: boolean;
    platformPostId?: string;
    error?: string;
    apiResponse?: any;
  }> {
    try {
      // Get Instagram account ID
      const accountResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${connection.accessToken}`
      );
      
      const instagramAccount = accountResponse.data.data.find((account: any) => 
        account.instagram_business_account
      );
      
      if (!instagramAccount) {
        return {
          success: false,
          error: 'No Instagram business account found'
        };
      }
      
      const instagramAccountId = instagramAccount.instagram_business_account.id;
      
      // Create Instagram media
      const mediaResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${instagramAccountId}/media`,
        {
          caption: content,
          image_url: 'https://via.placeholder.com/400x400/3250fa/ffffff?text=TheAgencyIQ',
          access_token: connection.accessToken
        }
      );
      
      // Publish the media
      const publishResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${instagramAccountId}/media_publish`,
        {
          creation_id: mediaResponse.data.id,
          access_token: connection.accessToken
        }
      );
      
      if (publishResponse.data && publishResponse.data.id) {
        console.log(`✅ Instagram post published: ${publishResponse.data.id}`);
        return {
          success: true,
          platformPostId: publishResponse.data.id,
          apiResponse: publishResponse.data
        };
      } else {
        return {
          success: false,
          error: 'Instagram API returned no post ID'
        };
      }
      
    } catch (error: any) {
      console.error('Instagram API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Publish to LinkedIn with real Marketing API
   */
  private static async publishToLinkedIn(content: string, connection: any): Promise<{
    success: boolean;
    platformPostId?: string;
    error?: string;
    apiResponse?: any;
  }> {
    try {
      // Get LinkedIn person ID
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/people/~',
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
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
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (shareResponse.data && shareResponse.data.id) {
        console.log(`✅ LinkedIn post published: ${shareResponse.data.id}`);
        return {
          success: true,
          platformPostId: shareResponse.data.id,
          apiResponse: shareResponse.data
        };
      } else {
        return {
          success: false,
          error: 'LinkedIn API returned no post ID'
        };
      }
      
    } catch (error: any) {
      console.error('LinkedIn API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Publish to X with real API v2
   */
  private static async publishToX(content: string, connection: any): Promise<{
    success: boolean;
    platformPostId?: string;
    error?: string;
    apiResponse?: any;
  }> {
    try {
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
        console.log(`✅ X post published: ${tweetResponse.data.data.id}`);
        return {
          success: true,
          platformPostId: tweetResponse.data.data.id,
          apiResponse: tweetResponse.data
        };
      } else {
        return {
          success: false,
          error: 'X API returned no tweet ID'
        };
      }
      
    } catch (error: any) {
      console.error('X API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  /**
   * Publish to YouTube with real Data API v3
   */
  private static async publishToYouTube(content: string, connection: any): Promise<{
    success: boolean;
    platformPostId?: string;
    error?: string;
    apiResponse?: any;
  }> {
    try {
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
        console.log(`✅ YouTube post published: ${communityResponse.data.id}`);
        return {
          success: true,
          platformPostId: communityResponse.data.id,
          apiResponse: communityResponse.data
        };
      } else {
        return {
          success: false,
          error: 'YouTube API returned no post ID'
        };
      }
      
    } catch (error: any) {
      console.error('YouTube API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Validate and refresh token if needed
   */
  private static async validateAndRefreshToken(connection: any): Promise<{
    valid: boolean;
    connection?: any;
    error?: string;
  }> {
    try {
      if (!connection.accessToken) {
        return { valid: false, error: 'No access token found' };
      }
      
      // Check token expiry
      if (connection.expiresAt && new Date() > new Date(connection.expiresAt)) {
        console.log(`Token expired for ${connection.platform}, attempting refresh`);
        
        // Platform-specific token refresh
        const refreshResult = await this.refreshTokenForPlatform(connection);
        if (refreshResult.success) {
          // Update connection in database
          await storage.updatePlatformConnection(connection.id, {
            accessToken: refreshResult.accessToken,
            refreshToken: refreshResult.refreshToken,
            expiresAt: refreshResult.expiresAt
          });
          
          return { valid: true, connection: { ...connection, ...refreshResult } };
        } else {
          return { valid: false, error: refreshResult.error };
        }
      }
      
      return { valid: true, connection };
      
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Platform-specific token refresh
   */
  private static async refreshTokenForPlatform(connection: any): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      switch (connection.platform) {
        case 'facebook':
        case 'instagram':
          return await this.refreshFacebookToken(connection);
        case 'linkedin':
          return await this.refreshLinkedInToken(connection);
        case 'youtube':
          return await this.refreshYouTubeToken(connection);
        case 'x':
          return await this.refreshXToken(connection);
        default:
          return { success: false, error: `Token refresh not supported for ${connection.platform}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  /**
   * Refresh Facebook token
   */
  private static async refreshFacebookToken(connection: any): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      const response = await fetch(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${connection.accessToken}`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          accessToken: data.access_token,
          refreshToken: connection.refreshToken,
          expiresAt: new Date(Date.now() + (data.expires_in * 1000))
        };
      }
      
      return { success: false, error: 'Facebook token refresh failed' };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Facebook token refresh error'
      };
    }
  }

  /**
   * Refresh LinkedIn token
   */
  private static async refreshLinkedInToken(connection: any): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      if (!connection.refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }
      
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || connection.refreshToken,
          expiresAt: new Date(Date.now() + (data.expires_in * 1000))
        };
      }
      
      return { success: false, error: 'LinkedIn token refresh failed' };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LinkedIn token refresh error'
      };
    }
  }

  /**
   * Refresh YouTube token
   */
  private static async refreshYouTubeToken(connection: any): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      if (!connection.refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
          client_id: process.env.YOUTUBE_CLIENT_ID,
          client_secret: process.env.YOUTUBE_CLIENT_SECRET
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || connection.refreshToken,
          expiresAt: new Date(Date.now() + (data.expires_in * 1000))
        };
      }
      
      return { success: false, error: 'YouTube token refresh failed' };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'YouTube token refresh error'
      };
    }
  }

  /**
   * Refresh X token
   */
  private static async refreshXToken(connection: any): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      if (!connection.refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }
      
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || connection.refreshToken,
          expiresAt: new Date(Date.now() + (data.expires_in * 1000))
        };
      }
      
      return { success: false, error: 'X token refresh failed' };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'X token refresh error'
      };
    }
  }
}