/**
 * Direct Publisher Service
 * Posts to social media platforms using app-level credentials
 * Users don't need to set up their own OAuth - the app handles everything
 */

import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

export interface DirectPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export class DirectPublisher {
  
  /**
   * Publish directly to Facebook using direct tokens or app page token
   */
  static async publishToFacebook(content: string, accessToken?: string): Promise<DirectPublishResult> {
    try {
      // Use provided token or environment token
      const token = accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!token) {
        return { success: false, error: 'Facebook credentials not configured' };
      }

      // Check if this is a direct token (created by our system)
      if (token.includes('facebook_direct_token_')) {
        return { success: false, error: 'Direct tokens are not supported for real publishing' };
      }

      // REAL Facebook Graph API publishing
      const axios = require('axios');
      
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
        console.log(`✅ REAL Facebook post published: ${response.data.id}`);
        return { 
          success: true, 
          platformPostId: response.data.id 
        };
      } else {
        return { success: false, error: 'Facebook API returned no post ID' };
      }
      
    } catch (error: any) {
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
      const axios = require('axios');
      
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
        return { 
          success: true, 
          platformPostId: shareResponse.data.id 
        };
      } else {
        return { success: false, error: 'LinkedIn API returned no post ID' };
      }
      
    } catch (error: any) {
      return { success: false, error: `LinkedIn error: ${error.message}` };
    }
  }

  /**
   * Publish to Instagram using direct tokens or app credentials
   */
  static async publishToInstagram(content: string, accessToken?: string): Promise<DirectPublishResult> {
    try {
      // Use provided token or environment token
      const token = accessToken || process.env.INSTAGRAM_CLIENT_SECRET;
      
      if (!token) {
        return { success: false, error: 'Instagram credentials not configured' };
      }

      // Check if this is a direct token (created by our system)
      if (token.includes('instagram_direct_token_')) {
        return { success: false, error: 'Direct tokens are not supported for real publishing' };
      }

      // REAL Instagram Publishing using Instagram Graph API
      const axios = require('axios');
      
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
        return { 
          success: true, 
          platformPostId: publishResponse.data.id 
        };
      } else {
        return { success: false, error: 'Instagram publish API returned no post ID' };
      }
      
    } catch (error: any) {
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
      const OAuth = require('oauth-1.0a');
      const crypto = require('crypto');
      
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
        key: connection.accessToken,
        secret: connection.tokenSecret
      };
      
      // Create X tweet
      const axios = require('axios');
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
        console.log(`✅ REAL X post published: ${tweetResponse.data.data.id}`);
        return { 
          success: true, 
          platformPostId: tweetResponse.data.data.id 
        };
      } else {
        return { success: false, error: 'X API returned no tweet ID' };
      }


      
    } catch (error: any) {
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
      const axios = require('axios');
      
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
        return { 
          success: true, 
          platformPostId: communityResponse.data.id 
        };
      } else {
        return { success: false, error: 'YouTube API returned no post ID' };
      }


      
    } catch (error: any) {
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
}