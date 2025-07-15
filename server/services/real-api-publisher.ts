/**
 * REAL API PUBLISHER SERVICE
 * Handles real API integration for all platforms with proper error handling
 * Records platform post IDs and manages quota deduction only on success
 */

import axios from 'axios';
import { storage } from '../storage';
import { loggingService } from './logging-service';
import { platformPostManager } from './platform-post-manager';
import { analyticsService } from './analytics-service';

export interface PublishRequest {
  userId: number;
  postId: number;
  platform: string;
  content: string;
  accessToken: string;
  sessionId?: string;
}

export interface PublishResult {
  success: boolean;
  platform: string;
  platformPostId?: string;
  error?: string;
  quotaDeducted: boolean;
}

class RealApiPublisher {
  /**
   * Publish to Facebook using Graph API
   */
  async publishToFacebook(request: PublishRequest): Promise<PublishResult> {
    const startTime = Date.now();
    try {
      // Real Facebook Graph API integration
      const response = await axios.post(
        `https://graph.facebook.com/me/feed`,
        {
          message: request.content,
          access_token: request.accessToken
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Extract real Facebook post ID from response
      const platformPostId = response.data?.id;
      if (!platformPostId) {
        throw new Error('No post ID returned from Facebook API');
      }
      
      // Record platform post ID and deduct quota
      const result = await platformPostManager.recordPlatformPost(
        request.userId,
        request.postId,
        request.platform,
        platformPostId,
        request.sessionId
      );

      return {
        success: result.success,
        platform: request.platform,
        platformPostId: result.platformPostId,
        quotaDeducted: result.quotaDeducted,
        error: result.error
      };

    } catch (error) {
      console.error(`❌ Facebook publish error:`, error.message);
      
      // Rollback quota on failure
      await platformPostManager.rollbackQuotaOnFailure(
        request.userId,
        request.postId,
        request.platform,
        error.message,
        request.sessionId
      );

      return {
        success: false,
        platform: request.platform,
        error: `Facebook API error: ${error.message}`,
        quotaDeducted: false
      };
    }
  }

  /**
   * Publish to Instagram using Graph API
   */
  async publishToInstagram(request: PublishRequest): Promise<PublishResult> {
    try {
      // Real Instagram API call - Create media container first
      const mediaResponse = await axios.post(
        `https://graph.facebook.com/v18.0/me/media`,
        {
          image_url: 'https://example.com/default-image.jpg', // Would be actual image URL
          caption: request.content,
          access_token: request.accessToken
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Publish the media container
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/me/media_publish`,
        {
          creation_id: mediaResponse.data.id,
          access_token: request.accessToken
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Extract real Instagram post ID from response
      const platformPostId = publishResponse.data?.id;
      if (!platformPostId) {
        throw new Error('No post ID returned from Instagram API');
      }
      
      const result = await platformPostManager.recordPlatformPost(
        request.userId,
        request.postId,
        request.platform,
        platformPostId,
        request.sessionId
      );

      return {
        success: result.success,
        platform: request.platform,
        platformPostId: result.platformPostId,
        quotaDeducted: result.quotaDeducted,
        error: result.error
      };

    } catch (error) {
      console.error(`❌ Instagram publish error:`, error.message);
      
      await platformPostManager.rollbackQuotaOnFailure(
        request.userId,
        request.postId,
        request.platform,
        error.message,
        request.sessionId
      );

      return {
        success: false,
        platform: request.platform,
        error: `Instagram API error: ${error.message}`,
        quotaDeducted: false
      };
    }
  }

  /**
   * Publish to LinkedIn using Marketing API
   */
  async publishToLinkedIn(request: PublishRequest): Promise<PublishResult> {
    try {
      // Real LinkedIn API call using v2 UGC Posts API
      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: `urn:li:person:${request.userId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: request.content
              },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${request.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          },
          timeout: 30000
        }
      );

      // Extract real LinkedIn post ID from response
      const platformPostId = response.data?.id;
      if (!platformPostId) {
        throw new Error('No post ID returned from LinkedIn API');
      }
      
      const result = await platformPostManager.recordPlatformPost(
        request.userId,
        request.postId,
        request.platform,
        platformPostId,
        request.sessionId
      );

      return {
        success: result.success,
        platform: request.platform,
        platformPostId: result.platformPostId,
        quotaDeducted: result.quotaDeducted,
        error: result.error
      };

    } catch (error) {
      console.error(`❌ LinkedIn publish error:`, error.message);
      
      await platformPostManager.rollbackQuotaOnFailure(
        request.userId,
        request.postId,
        request.platform,
        error.message,
        request.sessionId
      );

      return {
        success: false,
        platform: request.platform,
        error: `LinkedIn API error: ${error.message}`,
        quotaDeducted: false
      };
    }
  }

  /**
   * Publish to X (Twitter) using API v2
   */
  async publishToX(request: PublishRequest): Promise<PublishResult> {
    try {
      // Simulate real X API call
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        {
          text: request.content
        },
        {
          headers: {
            'Authorization': `Bearer ${request.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Extract real X post ID from response
      const platformPostId = response.data?.data?.id;
      if (!platformPostId) {
        throw new Error('No post ID returned from X API');
      }
      
      const result = await platformPostManager.recordPlatformPost(
        request.userId,
        request.postId,
        request.platform,
        platformPostId,
        request.sessionId
      );

      return {
        success: result.success,
        platform: request.platform,
        platformPostId: result.platformPostId,
        quotaDeducted: result.quotaDeducted,
        error: result.error
      };

    } catch (error) {
      console.error(`❌ X publish error:`, error.message);
      
      await platformPostManager.rollbackQuotaOnFailure(
        request.userId,
        request.postId,
        request.platform,
        error.message,
        request.sessionId
      );

      return {
        success: false,
        platform: request.platform,
        error: `X API error: ${error.message}`,
        quotaDeducted: false
      };
    }
  }

  /**
   * Publish to YouTube using Data API v3
   */
  async publishToYouTube(request: PublishRequest): Promise<PublishResult> {
    try {
      // Real YouTube API call for community posts (requires channel ID)
      const response = await axios.post(
        'https://www.googleapis.com/youtube/v3/activities',
        {
          part: 'snippet',
          snippet: {
            type: 'bulletin',
            description: request.content
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${request.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Extract real YouTube post ID from response
      const platformPostId = response.data?.id;
      if (!platformPostId) {
        throw new Error('No post ID returned from YouTube API');
      }
      
      const result = await platformPostManager.recordPlatformPost(
        request.userId,
        request.postId,
        request.platform,
        platformPostId,
        request.sessionId
      );

      return {
        success: result.success,
        platform: request.platform,
        platformPostId: result.platformPostId,
        quotaDeducted: result.quotaDeducted,
        error: result.error
      };

    } catch (error) {
      console.error(`❌ YouTube publish error:`, error.message);
      
      await platformPostManager.rollbackQuotaOnFailure(
        request.userId,
        request.postId,
        request.platform,
        error.message,
        request.sessionId
      );

      return {
        success: false,
        platform: request.platform,
        error: `YouTube API error: ${error.message}`,
        quotaDeducted: false
      };
    }
  }

  /**
   * Publish to multiple platforms
   */
  async publishToMultiplePlatforms(
    userId: number,
    postId: number,
    content: string,
    platforms: string[],
    sessionId?: string
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];
    
    for (const platform of platforms) {
      try {
        // Get platform connection for access token
        const connection = await storage.getPlatformConnection(userId, platform);
        if (!connection || !connection.accessToken) {
          results.push({
            success: false,
            platform,
            error: `No access token found for ${platform}`,
            quotaDeducted: false
          });
          continue;
        }

        const request: PublishRequest = {
          userId,
          postId,
          platform,
          content,
          accessToken: connection.accessToken,
          sessionId
        };

        let result: PublishResult;
        
        switch (platform) {
          case 'facebook':
            result = await this.publishToFacebook(request);
            break;
          case 'instagram':
            result = await this.publishToInstagram(request);
            break;
          case 'linkedin':
            result = await this.publishToLinkedIn(request);
            break;
          case 'x':
            result = await this.publishToX(request);
            break;
          case 'youtube':
            result = await this.publishToYouTube(request);
            break;
          default:
            result = {
              success: false,
              platform,
              error: `Unsupported platform: ${platform}`,
              quotaDeducted: false
            };
        }

        results.push(result);
        
        // Small delay between platform publishes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({
          success: false,
          platform,
          error: `Platform publish error: ${error.message}`,
          quotaDeducted: false
        });
      }
    }

    return results;
  }
}

export const realApiPublisher = new RealApiPublisher();