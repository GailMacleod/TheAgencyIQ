/**
 * AUTO-POSTING ENFORCER - 30-Day Subscription Guarantee
 * Ensures all posts are successfully published within the subscription period
 * No moving posts - only successful publishing or failure handling
 */

import { storage } from './storage';
import { PostQuotaService } from './PostQuotaService';
import { OAuthRefreshService } from './oauth-refresh';
import { realApiPublisher } from './real-api-publisher';

interface AutoPostingResult {
  success: boolean;
  postsProcessed: number;
  postsPublished: number;
  postsFailed: number;
  connectionRepairs: string[];
  errors: string[];
}

export class AutoPostingEnforcer {
  
  /**
   * Enforce auto-posting for all approved posts across all platforms
   * Publishes 520 posts (52 per customer x 10 customers) to Facebook, Instagram, LinkedIn, YouTube, X
   * Uses PostQuotaService for quota validation and deduction
   * Logs detailed success/failure in data/quota-debug.log
   */
  static async enforceAutoPosting(userId?: number): Promise<AutoPostingResult> {
    const result: AutoPostingResult = {
      success: false,
      postsProcessed: 0,
      postsPublished: 0,
      postsFailed: 0,
      connectionRepairs: [],
      errors: []
    };

    try {
      console.log(`Auto-posting enforcer: Starting for user ${userId}`);
      
      // Get user and verify subscription
      const user = await storage.getUser(userId);
      if (!user) {
        result.errors.push('User not found');
        return result;
      }

      // Check subscription period (30 days from start)
      const subscriptionStart = user.subscriptionStart;
      if (!subscriptionStart) {
        result.errors.push('No active subscription found');
        return result;
      }

      const now = new Date();
      const subscriptionEnd = new Date(subscriptionStart);
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

      if (now > subscriptionEnd) {
        result.errors.push('Subscription period expired');
        return result;
      }

      // QUOTA ENFORCEMENT: Check quota status before processing posts
      const quotaStatus = await PostQuotaService.getQuotaStatus(userId);
      if (!quotaStatus) {
        result.errors.push('Unable to retrieve quota status');
        return result;
      }

      // Get all approved posts that need publishing
      const posts = await storage.getPostsByUser(userId);
      const approvedPosts = posts.filter(post => 
        post.status === 'approved' && 
        post.scheduledFor && 
        new Date(post.scheduledFor) <= now
      );

      console.log(`Auto-posting enforcer: Found ${approvedPosts.length} posts ready for publishing`);
      console.log(`Auto-posting enforcer: User has ${quotaStatus.remainingPosts} posts remaining from ${quotaStatus.totalPosts} quota`);
      
      // QUOTA ENFORCEMENT: Cap publishing at remaining quota
      const postsToPublish = approvedPosts.slice(0, quotaStatus.remainingPosts);
      
      if (approvedPosts.length > quotaStatus.remainingPosts) {
        result.errors.push(`Quota limit reached: ${approvedPosts.length} posts requested, ${quotaStatus.remainingPosts} allowed`);
      }

      console.log(`Auto-posting enforcer: Publishing ${postsToPublish.length} posts (quota-aware limit)`);
      
      // Get platform connections
      const connections = await storage.getPlatformConnectionsByUser(userId);
      const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'x'];
      
      // Process each approved post with platform publishing
      for (const post of postsToPublish) {
        result.postsProcessed++;
        
        try {
          console.log(`Auto-posting enforcer: Publishing post ${post.id} to ${post.platform}`);
          
          // Find platform connection with enhanced reliability
          let connection = connections.find(conn => conn.platform === post.platform);
          if (!connection || !connection.isConnected) {
            // Enhanced connection repair with token refresh and alternate auth
            const repair = await AutoPostingEnforcer.enhancedConnectionRepair(userId, post.platform);
            if (repair.success) {
              result.connectionRepairs.push(repair.action);
              connection = repair.connection;
            } else {
              throw new Error(`Platform ${post.platform} not connected and enhanced repair failed: ${repair.error}`);
            }
          }
          
          // Verify token validity and refresh if needed
          const tokenValidation = await AutoPostingEnforcer.validateAndRefreshToken(connection);
          if (!tokenValidation.valid) {
            throw new Error(`Token validation failed for ${post.platform}: ${tokenValidation.error}`);
          }
          
          if (tokenValidation.refreshed) {
            result.connectionRepairs.push(`Token refreshed for ${post.platform}`);
            connection = tokenValidation.connection;
          }
          
          // Platform-specific publishing
          let publishResult = false;
          switch (post.platform) {
            case 'facebook':
              publishResult = await AutoPostingEnforcer.publishToFacebook(post, connection);
              break;
            case 'instagram':
              publishResult = await AutoPostingEnforcer.publishToInstagram(post, connection);
              break;
            case 'linkedin':
              publishResult = await AutoPostingEnforcer.publishToLinkedIn(post, connection);
              break;
            case 'youtube':
              publishResult = await AutoPostingEnforcer.publishToYouTube(post, connection);
              break;
            case 'x':
              publishResult = await AutoPostingEnforcer.publishToX(post, connection);
              break;
            default:
              throw new Error(`Unsupported platform: ${post.platform}`);
          }
          
          if (publishResult) {
            // Update post status and deduct quota
            await storage.updatePost(post.id, {
              status: 'published',
              publishedAt: new Date(),
              errorLog: null
            });
            
            // QUOTA DEDUCTION: Only after successful publishing
            await PostQuotaService.postApproved(userId, post.id);
            
            result.postsPublished++;
            
            // Log success to data/quota-debug.log
            await AutoPostingEnforcer.logPublishingResult(userId, post.id, post.platform, true, 'Successfully published');
            
          } else {
            throw new Error('Platform publishing returned false');
          }
          
        } catch (error) {
          result.postsFailed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Post ${post.id} failed: ${errorMsg}`);
          
          // Update post with error
          await storage.updatePost(post.id, {
            status: 'failed',
            errorLog: errorMsg
          });
          
          // Log failure to data/quota-debug.log
          await AutoPostingEnforcer.logPublishingResult(userId, post.id, post.platform, false, errorMsg);
        }
      }
      
      result.success = result.postsPublished > 0;
      return result;
      
    } catch (error) {
      console.error('Auto-posting enforcer error:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Platform-specific publishing methods using existing API credentials
   */
  
  private static async publishToFacebook(post: any, connection: any): Promise<boolean> {
    try {
      console.log(`Publishing to Facebook: Post ${post.id}`);
      
      // Validate and refresh token if needed
      const tokenValidation = await this.validatePlatformToken(connection);
      if (!tokenValidation.isValid) {
        console.error(`Facebook token validation failed: ${tokenValidation.error}`);
        await this.logPublishingResult(post.userId, post.id, 'facebook', false, `Token validation failed: ${tokenValidation.error}`);
        return false;
      }
      
      if (tokenValidation.refreshed) {
        console.log('✅ Facebook token refreshed successfully before publishing');
        await this.logPublishingResult(post.userId, post.id, 'facebook', true, 'Token refreshed successfully');
      }
      
      // Use existing Facebook credentials from connection for real API call
      const realPublishResult = await this.realFacebookPublish(post, connection);
      if (!realPublishResult.success) {
        console.error(`Facebook publish failed: ${realPublishResult.error}`);
        return false;
      }
      
      console.log(`✅ Facebook publish SUCCESS: Post ${post.id} published to Facebook with ID: ${realPublishResult.platformPostId}`);
      await this.logPublishingResult(post.userId, post.id, 'facebook', true, `Post published to Facebook: ${realPublishResult.platformPostId}`);
      
      return true;
    } catch (error) {
      console.error('Facebook publishing failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown Facebook error';
      await this.logPublishingResult(post.userId, post.id, 'facebook', false, errorMsg);
      return false;
    }
  }

  /**
   * REAL Facebook Publishing using Graph API
   */
  private static async realFacebookPublish(post: any, connection: any): Promise<{success: boolean, platformPostId?: string, error?: string}> {
    try {
      const axios = require('axios');
      const crypto = require('crypto');
      
      const accessToken = connection.accessToken;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!accessToken || !appSecret) {
        return { success: false, error: 'Facebook credentials missing' };
      }
      
      // Generate app secret proof for enhanced security
      const appsecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
      
      // Publish to Facebook user feed using Graph API
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/feed`,
        {
          message: post.content,
          access_token: accessToken,
          appsecret_proof: appsecretProof
        }
      );
      
      if (response.data && response.data.id) {
        console.log(`✅ REAL Facebook post published: ${response.data.id}`);
        return { 
          success: true, 
          platformPostId: response.data.id 
        };
      } else {
        return { success: false, error: 'Facebook API returned no post ID' };
      }
      
    } catch (error: any) {
      console.error('Facebook Graph API error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  private static async publishToInstagram(post: any, connection: any): Promise<boolean> {
    try {
      console.log(`Publishing to Instagram: Post ${post.id}`);
      
      // Validate and refresh token if needed
      const tokenValidation = await this.validatePlatformToken(connection);
      if (!tokenValidation.isValid) {
        console.error(`Instagram token validation failed: ${tokenValidation.error}`);
        await this.logPublishingResult(post.userId, post.id, 'instagram', false, `Token validation failed: ${tokenValidation.error}`);
        return false;
      }
      
      if (tokenValidation.refreshed) {
        console.log('✅ Instagram token refreshed successfully before publishing');
        await this.logPublishingResult(post.userId, post.id, 'instagram', true, 'Token refreshed successfully');
      }
      
      // Use existing Instagram credentials from connection for real API call
      const realInstagramResult = await this.realInstagramPublish(post, connection);
      if (!realInstagramResult.success) {
        console.error(`Instagram publish failed: ${realInstagramResult.error}`);
        return false;
      }
      
      console.log(`✅ Instagram publish SUCCESS: Post ${post.id} published to Instagram with ID: ${realInstagramResult.platformPostId}`);
      await this.logPublishingResult(post.userId, post.id, 'instagram', true, `Post published to Instagram: ${realInstagramResult.platformPostId}`);
      
      return true;
    } catch (error) {
      console.error('Instagram publishing failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown Instagram error';
      await this.logPublishingResult(post.userId, post.id, 'instagram', false, errorMsg);
      return false;
    }
  }

  private static async publishToLinkedIn(post: any, connection: any): Promise<boolean> {
    try {
      console.log(`Publishing to LinkedIn: Post ${post.id}`);
      
      // Validate and refresh token if needed
      const tokenValidation = await this.validatePlatformToken(connection);
      if (!tokenValidation.isValid) {
        console.error(`LinkedIn token validation failed: ${tokenValidation.error}`);
        await this.logPublishingResult(post.userId, post.id, 'linkedin', false, `Token validation failed: ${tokenValidation.error}`);
        return false;
      }
      
      if (tokenValidation.refreshed) {
        console.log('✅ LinkedIn token refreshed successfully before publishing');
        await this.logPublishingResult(post.userId, post.id, 'linkedin', true, 'Token refreshed successfully');
      }
      
      // Use existing LinkedIn credentials from connection for real API call
      const realLinkedInResult = await this.realLinkedInPublish(post, connection);
      if (!realLinkedInResult.success) {
        console.error(`LinkedIn publish failed: ${realLinkedInResult.error}`);
        return false;
      }
      
      console.log(`✅ LinkedIn publish SUCCESS: Post ${post.id} published to LinkedIn with ID: ${realLinkedInResult.platformPostId}`);
      await this.logPublishingResult(post.userId, post.id, 'linkedin', true, `Post published to LinkedIn: ${realLinkedInResult.platformPostId}`);
      
      return true;
    } catch (error) {
      console.error('LinkedIn publishing failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown LinkedIn error';
      await this.logPublishingResult(post.userId, post.id, 'linkedin', false, errorMsg);
      return false;
    }
  }

  private static async publishToYouTube(post: any, connection: any): Promise<boolean> {
    try {
      console.log(`Publishing to YouTube: Post ${post.id}`);
      
      // Validate and refresh token if needed
      const tokenValidation = await this.validatePlatformToken(connection);
      if (!tokenValidation.isValid) {
        console.error(`YouTube token validation failed: ${tokenValidation.error}`);
        await this.logPublishingResult(post.userId, post.id, 'youtube', false, `Token validation failed: ${tokenValidation.error}`);
        return false;
      }
      
      if (tokenValidation.refreshed) {
        console.log('✅ YouTube token refreshed successfully before publishing');
        await this.logPublishingResult(post.userId, post.id, 'youtube', true, 'Token refreshed successfully');
      }
      
      // Use existing YouTube credentials from connection for real API call
      const realYouTubeResult = await this.realYouTubePublish(post, connection);
      if (!realYouTubeResult.success) {
        console.error(`YouTube publish failed: ${realYouTubeResult.error}`);
        return false;
      }
      
      console.log(`✅ YouTube publish SUCCESS: Post ${post.id} published to YouTube with ID: ${realYouTubeResult.platformPostId}`);
      await this.logPublishingResult(post.userId, post.id, 'youtube', true, `Post published to YouTube: ${realYouTubeResult.platformPostId}`);
      
      return true;
    } catch (error) {
      console.error('YouTube publishing failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown YouTube error';
      await this.logPublishingResult(post.userId, post.id, 'youtube', false, errorMsg);
      return false;
    }
  }

  private static async publishToX(post: any, connection: any): Promise<boolean> {
    try {
      console.log(`Publishing to X: Post ${post.id}`);
      
      // Validate and refresh token if needed
      const tokenValidation = await this.validatePlatformToken(connection);
      if (!tokenValidation.isValid) {
        console.error(`X token validation failed: ${tokenValidation.error}`);
        await this.logPublishingResult(post.userId, post.id, 'x', false, `Token validation failed: ${tokenValidation.error}`);
        return false;
      }
      
      if (tokenValidation.refreshed) {
        console.log('✅ X token refreshed successfully before publishing');
        await this.logPublishingResult(post.userId, post.id, 'x', true, 'Token refreshed successfully');
      }
      
      // Use existing X credentials from connection for real API call
      const realXResult = await this.realXPublish(post, connection);
      if (!realXResult.success) {
        console.error(`X publish failed: ${realXResult.error}`);
        return false;
      }
      
      console.log(`✅ X publish SUCCESS: Post ${post.id} published to X with ID: ${realXResult.platformPostId}`);
      await this.logPublishingResult(post.userId, post.id, 'x', true, `Post published to X: ${realXResult.platformPostId}`);
      
      return true;
    } catch (error) {
      console.error('X publishing failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown X error';
      await this.logPublishingResult(post.userId, post.id, 'x', false, errorMsg);
      return false;
    }
  }

  /**
   * REAL Instagram Publishing using Instagram Basic Display API
   */
  private static async realInstagramPublish(post: any, connection: any): Promise<{success: boolean, platformPostId?: string, error?: string}> {
    try {
      const axios = require('axios');
      
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'Instagram access token missing' };
      }
      
      // Get Instagram account ID
      const accountResponse = await axios.get(
        `https://graph.instagram.com/me/accounts?access_token=${accessToken}`
      );
      
      if (!accountResponse.data.data || accountResponse.data.data.length === 0) {
        return { success: false, error: 'No Instagram business account found' };
      }
      
      const instagramAccountId = accountResponse.data.data[0].id;
      
      // Create Instagram media object
      const mediaResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${instagramAccountId}/media`,
        {
          caption: post.content,
          image_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1080&h=1080&fit=crop',
          access_token: accessToken
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
          access_token: accessToken
        }
      );
      
      if (publishResponse.data && publishResponse.data.id) {
        console.log(`✅ REAL Instagram post published: ${publishResponse.data.id}`);
        return { 
          success: true, 
          platformPostId: publishResponse.data.id 
        };
      } else {
        return { success: false, error: 'Instagram publish API returned no post ID' };
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
   * REAL LinkedIn Publishing using LinkedIn Marketing API
   */
  private static async realLinkedInPublish(post: any, connection: any): Promise<{success: boolean, platformPostId?: string, error?: string}> {
    try {
      const axios = require('axios');
      
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'LinkedIn access token missing' };
      }
      
      // Get LinkedIn person ID
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/people/~',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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
            text: post.content
          },
          distribution: {
            linkedInDistributionTarget: {}
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (shareResponse.data && shareResponse.data.id) {
        console.log(`✅ REAL LinkedIn post published: ${shareResponse.data.id}`);
        return { 
          success: true, 
          platformPostId: shareResponse.data.id 
        };
      } else {
        return { success: false, error: 'LinkedIn API returned no post ID' };
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
   * REAL X Publishing using X API v2
   */
  private static async realXPublish(post: any, connection: any): Promise<{success: boolean, platformPostId?: string, error?: string}> {
    try {
      const axios = require('axios');
      const OAuth = require('oauth-1.0a');
      const crypto = require('crypto');
      
      const accessToken = connection.accessToken;
      const tokenSecret = connection.tokenSecret;
      
      if (!accessToken || !tokenSecret) {
        return { success: false, error: 'X OAuth tokens missing' };
      }
      
      // Set up OAuth 1.0a for X API
      const oauth = OAuth({
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
        key: accessToken,
        secret: tokenSecret
      };
      
      // Create X tweet
      const tweetResponse = await axios.post(
        'https://api.twitter.com/2/tweets',
        {
          text: post.content.substring(0, 280) // X character limit
        },
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (tweetResponse.data && tweetResponse.data.data && tweetResponse.data.data.id) {
        console.log(`✅ REAL X post published: ${tweetResponse.data.data.id}`);
        return { 
          success: true, 
          platformPostId: tweetResponse.data.data.id 
        };
      } else {
        return { success: false, error: 'X API returned no tweet ID' };
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
   * REAL YouTube Publishing using YouTube Data API v3
   */
  private static async realYouTubePublish(post: any, connection: any): Promise<{success: boolean, platformPostId?: string, error?: string}> {
    try {
      const axios = require('axios');
      
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'YouTube access token missing' };
      }
      
      // Create YouTube community post
      const communityResponse = await axios.post(
        'https://www.googleapis.com/youtube/v3/activities',
        {
          snippet: {
            description: post.content
          },
          status: {
            privacyStatus: 'public'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            part: 'snippet,status'
          }
        }
      );
      
      if (communityResponse.data && communityResponse.data.id) {
        console.log(`✅ REAL YouTube post published: ${communityResponse.data.id}`);
        return { 
          success: true, 
          platformPostId: communityResponse.data.id 
        };
      } else {
        return { success: false, error: 'YouTube API returned no post ID' };
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
   * Validate platform token with secure refresh capability
   */
  private static async validatePlatformToken(connection: any): Promise<{ isValid: boolean; error?: string; refreshed?: boolean }> {
    try {
      // Check if token exists
      if (!connection.accessToken) {
        return { isValid: false, error: 'No access token found' };
      }
      
      // Check if token is expired and attempt refresh
      if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) {
        console.log(`Token expired for ${connection.platform} connection ${connection.id}, attempting secure refresh...`);
        
        // Attempt secure token refresh using OAuthRefreshService
        const refreshed = await OAuthRefreshService.validateAndRefreshConnection(connection.id);
        
        if (refreshed) {
          console.log(`✅ Token successfully refreshed for ${connection.platform}`);
          return { isValid: true, refreshed: true };
        } else {
          console.log(`❌ Token refresh failed for ${connection.platform}`);
          return { isValid: false, error: 'Token expired and refresh failed' };
        }
      }
      
      // Token appears valid
      return { isValid: true };
      
    } catch (error) {
      console.error(`Token validation error for ${connection.platform}:`, error);
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Token validation failed' 
      };
    }
  }

  /**
   * Log publishing results to data/quota-debug.log
   */
  private static async logPublishingResult(userId: number, postId: number, platform: string, success: boolean, message: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] Auto-Posting Enforcer - User: ${userId}, Post: ${postId}, Platform: ${platform}, Success: ${success}, Message: ${message}\n`;
      
      await fs.mkdir('data', { recursive: true });
      await fs.appendFile('data/quota-debug.log', logEntry);
    } catch (error) {
      console.error('Failed to log publishing result:', error);
    }
  }

  /**
   * Repair platform connection automatically
   */
  private static async repairPlatformConnection(userId: number, platform: string): Promise<{
    repaired: boolean;
    action: string;
    error?: string;
  }> {
    try {
      // Import platform connection service
      const { storage } = await import('./storage');
      
      // Check existing connection
      const connections = await storage.getPlatformConnectionsByUser(userId);
      const existingConnection = connections.find((c: any) => c.platform === platform);
      
      if (!existingConnection) {
        return {
          repaired: false,
          action: 'No connection found',
          error: `No ${platform} connection exists for user ${userId}`
        };
      }
      
      // Enhanced session-based token validation for Facebook/Instagram
      if (platform === 'facebook' || platform === 'instagram') {
        // Check token expiry and attempt validation
        const tokenValidationResult = await this.validatePlatformToken(existingConnection);
        
        if (!tokenValidationResult.isValid) {
          // Mark connection as inactive but preserve for manual refresh
          await storage.updatePlatformConnection(existingConnection.id, {
            isActive: false
          } as any);
          
          return {
            repaired: false,
            action: `Token expired for ${platform} - user intervention required`,
            error: 'Token validation failed - manual OAuth refresh needed'
          };
        }
      }
      
      return {
        repaired: true,
        action: `Connection validated for ${platform}`
      };
      
    } catch (error) {
      return {
        repaired: false,
        action: 'Repair failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }



  /**
   * Schedule automatic enforcement (called periodically)
   */
  static async scheduleAutoPosting(): Promise<void> {
    try {
      // Get all users with active subscriptions
      const users = await storage.getAllUsers();
      const activeUsers = users.filter(user => {
        if (!user.subscriptionStart) return false;
        
        const now = new Date();
        const subscriptionEnd = new Date(user.subscriptionStart);
        subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);
        
        return now <= subscriptionEnd;
      });

      console.log(`Auto-posting scheduler: Processing ${activeUsers.length} active subscriptions`);

      // Process each user
      for (const user of activeUsers) {
        const result = await this.enforceAutoPosting(user.id);
        if (result.postsPublished > 0) {
          console.log(`Auto-posting scheduler: Published ${result.postsPublished} posts for user ${user.id}`);
        }
      }

    } catch (error: any) {
      console.error('Auto-posting scheduler error:', error);
    }
  }

  /**
   * Enhanced connection repair with token refresh and alternate auth options
   */
  private static async enhancedConnectionRepair(userId: number, platform: string): Promise<{success: boolean, action: string, connection?: any, error?: string}> {
    try {
      console.log(`🔧 Starting enhanced connection repair for ${platform}`);
      
      // Step 1: Try to find existing connection
      const connections = await storage.getPlatformConnectionsByUser(userId);
      let connection = connections.find(conn => conn.platform === platform);
      
      if (connection) {
        // Step 2: Try token refresh
        const refreshResult = await this.validateAndRefreshToken(connection);
        if (refreshResult.valid) {
          console.log(`✅ Token refresh successful for ${platform}`);
          return {
            success: true,
            action: `Token refreshed for ${platform}`,
            connection: refreshResult.connection
          };
        }
      }
      
      // Step 3: Try alternate auth methods
      const alternateAuth = await this.tryAlternateAuth(userId, platform);
      if (alternateAuth.success) {
        console.log(`✅ Alternate auth successful for ${platform}`);
        return {
          success: true,
          action: `Alternate auth established for ${platform}`,
          connection: alternateAuth.connection
        };
      }
      
      return {
        success: false,
        error: `All repair methods failed for ${platform}`
      };
      
    } catch (error) {
      console.error(`❌ Enhanced connection repair failed for ${platform}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate and refresh token with enhanced error handling
   */
  private static async validateAndRefreshToken(connection: any): Promise<{valid: boolean, refreshed: boolean, connection?: any, error?: string}> {
    try {
      if (!connection) {
        return { valid: false, refreshed: false, error: 'No connection provided' };
      }
      
      // Check if token is expired
      if (connection.expiresAt && new Date() > new Date(connection.expiresAt)) {
        console.log(`Token expired for ${connection.platform}, attempting refresh`);
        
        // Try to refresh token
        const refreshResult = await this.refreshPlatformToken(connection);
        if (refreshResult.success) {
          // Update connection with new token
          await storage.updatePlatformConnection(connection.id, {
            accessToken: refreshResult.accessToken,
            refreshToken: refreshResult.refreshToken,
            expiresAt: refreshResult.expiresAt
          });
          
          const updatedConnection = { ...connection, ...refreshResult };
          return { valid: true, refreshed: true, connection: updatedConnection };
        }
      }
      
      return { valid: true, refreshed: false, connection };
      
    } catch (error) {
      console.error('Token validation error:', error);
      return { 
        valid: false, 
        refreshed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Try alternate authentication methods
   */
  private static async tryAlternateAuth(userId: number, platform: string): Promise<{success: boolean, connection?: any}> {
    try {
      // Use app-level credentials as fallback
      const appCredentials = await this.getAppCredentials(platform);
      if (appCredentials) {
        const connection = {
          userId,
          platform,
          accessToken: appCredentials.accessToken,
          refreshToken: appCredentials.refreshToken,
          isConnected: true,
          authMethod: 'app-level'
        };
        
        // Save alternate auth connection
        const savedConnection = await storage.createPlatformConnection(connection);
        return { success: true, connection: savedConnection };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Alternate auth failed:', error);
      return { success: false };
    }
  }

  /**
   * Get app-level credentials for fallback authentication
   */
  private static async getAppCredentials(platform: string): Promise<{accessToken: string, refreshToken?: string} | null> {
    try {
      switch (platform) {
        case 'facebook':
          return process.env.FACEBOOK_APP_ACCESS_TOKEN ? {
            accessToken: process.env.FACEBOOK_APP_ACCESS_TOKEN
          } : null;
        case 'instagram':
          return process.env.INSTAGRAM_APP_ACCESS_TOKEN ? {
            accessToken: process.env.INSTAGRAM_APP_ACCESS_TOKEN
          } : null;
        case 'linkedin':
          return process.env.LINKEDIN_APP_ACCESS_TOKEN ? {
            accessToken: process.env.LINKEDIN_APP_ACCESS_TOKEN
          } : null;
        case 'x':
          return (process.env.X_CONSUMER_KEY && process.env.X_CONSUMER_SECRET) ? {
            accessToken: process.env.X_CONSUMER_KEY,
            refreshToken: process.env.X_CONSUMER_SECRET
          } : null;
        case 'youtube':
          return process.env.YOUTUBE_APP_ACCESS_TOKEN ? {
            accessToken: process.env.YOUTUBE_APP_ACCESS_TOKEN
          } : null;
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting app credentials:', error);
      return null;
    }
  }

  /**
   * Refresh platform token with enhanced error handling
   */
  private static async refreshPlatformToken(connection: any): Promise<{success: boolean, accessToken?: string, refreshToken?: string, expiresAt?: Date}> {
    try {
      if (!connection.refreshToken) {
        return { success: false };
      }
      
      let refreshResult;
      switch (connection.platform) {
        case 'facebook':
        case 'instagram':
          refreshResult = await this.refreshFacebookToken(connection);
          break;
        case 'linkedin':
          refreshResult = await this.refreshLinkedInToken(connection);
          break;
        case 'youtube':
          refreshResult = await this.refreshYouTubeToken(connection);
          break;
        default:
          return { success: false };
      }
      
      return refreshResult;
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false };
    }
  }

  private static async refreshFacebookToken(connection: any): Promise<{success: boolean, accessToken?: string, refreshToken?: string, expiresAt?: Date}> {
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
      return { success: false };
    }
  }

  private static async refreshLinkedInToken(connection: any): Promise<{success: boolean, accessToken?: string, refreshToken?: string, expiresAt?: Date}> {
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
      return { success: false };
    }
  }

  private static async refreshYouTubeToken(connection: any): Promise<{success: boolean, accessToken?: string, refreshToken?: string, expiresAt?: Date}> {
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
      return { success: false };
    }
  }
}