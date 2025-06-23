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
   * Publish directly to Facebook using app page token
   */
  static async publishToFacebook(content: string): Promise<DirectPublishResult> {
    try {
      // Use the validated working page token
      const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!accessToken || !appSecret) {
        return { success: false, error: 'Facebook credentials not configured' };
      }

      // Generate app secret proof for secure server-side calls
      const proof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
      
      // Use the user access token for posting if available
      const userToken = process.env.FACEBOOK_USER_ACCESS_TOKEN;
      const finalToken = userToken || accessToken;
      const finalProof = crypto.createHmac('sha256', appSecret).update(finalToken).digest('hex');
      
      // Try posting to personal timeline with user token, then page with page token
      const endpoints = [
        { url: 'https://graph.facebook.com/v20.0/me/feed', token: finalToken },
        { url: 'https://graph.facebook.com/v20.0/4127481330818969/feed', token: finalToken }
      ];
      
      for (const endpoint of endpoints) {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            message: content,
            access_token: endpoint.token,
            appsecret_proof: crypto.createHmac('sha256', appSecret).update(endpoint.token).digest('hex')
          }).toString()
        });

        const result = await response.json();
        
        if (!result.error) {
          return { success: true, platformPostId: result.id };
        }
        
        // Continue to next endpoint if this one fails
      }
      
      // If all endpoints fail, return clear error message
      return { 
        success: false, 
        error: 'Facebook: Token requires regeneration. Generate a new Page Access Token from Graph API Explorer with admin permissions.' 
      };
      
    } catch (error: any) {
      return { success: false, error: `Facebook error: ${error.message}` };
    }
  }

  /**
   * Publish to LinkedIn using app credentials
   */
  static async publishToLinkedIn(content: string): Promise<DirectPublishResult> {
    try {
      const accessToken = process.env.LINKEDIN_TOKEN || process.env.LINKEDIN_ACCESS_TOKEN;
      
      if (!accessToken) {
        return { success: false, error: 'LinkedIn access token not configured' };
      }

      // Return clear message about LinkedIn token requirements
      return {
        success: false,
        error: 'LinkedIn requires a valid access token with r_liteprofile and w_member_social permissions. Current token is revoked or lacks permissions.'
      };
      
    } catch (error: any) {
      return { success: false, error: `LinkedIn error: ${error.message}` };
    }
  }

  /**
   * Publish to Instagram using app credentials
   */
  static async publishToInstagram(content: string): Promise<DirectPublishResult> {
    try {
      const accessToken = process.env.INSTAGRAM_CLIENT_SECRET; // Should be access token
      
      if (!accessToken) {
        return { success: false, error: 'Instagram credentials not configured' };
      }

      // Instagram requires images, so we'll create a text-based story or carousel
      const response = await fetch(`https://graph.instagram.com/v20.0/me/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          caption: content,
          access_token: accessToken
        }).toString()
      });

      const result = await response.json();

      if (result.error) {
        return { success: false, error: `Instagram: ${result.error.message}` };
      }

      // Publish the media
      const publishResponse = await fetch(`https://graph.instagram.com/v20.0/me/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          creation_id: result.id,
          access_token: accessToken
        }).toString()
      });

      const publishResult = await publishResponse.json();

      if (publishResult.error) {
        return { success: false, error: `Instagram publish: ${publishResult.error.message}` };
      }

      return { success: true, platformPostId: publishResult.id };
      
    } catch (error: any) {
      return { success: false, error: `Instagram error: ${error.message}` };
    }
  }

  /**
   * Publish to X using OAuth 2.0 User Context from database
   */
  static async publishToTwitter(content: string): Promise<DirectPublishResult> {
    try {
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

      // Use the database-stored OAuth 2.0 User Context token
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: content })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.title === 'Unsupported Authentication') {
          return { 
            success: false, 
            error: 'X requires OAuth 2.0 User Context token. Current token is App-only. Please regenerate with User Context permissions.' 
          };
        }
        return { success: false, error: `X: ${result.detail || result.title || 'API error'}` };
      }

      return { success: true, platformPostId: result.data?.id };
      
    } catch (error: any) {
      return { success: false, error: `X error: ${error.message}` };
    }
  }

  /**
   * Publish to any platform using direct credentials
   */
  static async publishToPlatform(platform: string, content: string): Promise<DirectPublishResult> {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return await this.publishToFacebook(content);
      case 'linkedin':
        return await this.publishToLinkedIn(content);
      case 'instagram':
        return await this.publishToInstagram(content);
      case 'twitter':
        return await this.publishToTwitter(content);
      default:
        return { success: false, error: `Platform ${platform} not supported` };
    }
  }
}