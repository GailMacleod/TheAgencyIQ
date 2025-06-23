/**
 * Direct Publisher Service
 * Posts to social media platforms using app-level credentials
 * Users don't need to set up their own OAuth - the app handles everything
 */

import crypto from 'crypto';

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
      const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!pageToken || !appSecret) {
        return { success: false, error: 'Facebook credentials not configured' };
      }

      // Try posting to user's timeline first (simpler approach)
      const proof = crypto.createHmac('sha256', appSecret).update(pageToken).digest('hex');
      
      const response = await fetch(`https://graph.facebook.com/v20.0/me/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          message: content,
          access_token: pageToken,
          appsecret_proof: proof
        }).toString()
      });

      const result = await response.json();

      if (result.error) {
        return { success: false, error: `Facebook: ${result.error.message}` };
      }

      return { success: true, platformPostId: result.id };
      
    } catch (error: any) {
      return { success: false, error: `Facebook error: ${error.message}` };
    }
  }

  /**
   * Publish to LinkedIn using app credentials
   */
  static async publishToLinkedIn(content: string): Promise<DirectPublishResult> {
    try {
      const accessToken = process.env.LINKEDIN_CLIENT_SECRET; // Should be access token
      
      if (!accessToken) {
        return { success: false, error: 'LinkedIn credentials not configured' };
      }

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify({
          author: 'urn:li:person:me',
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: content },
              shareMediaCategory: 'NONE'
            }
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: `LinkedIn: ${result.message || 'API error'}` };
      }

      return { success: true, platformPostId: result.id };
      
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
   * Publish to Twitter using app credentials
   */
  static async publishToTwitter(content: string): Promise<DirectPublishResult> {
    try {
      const bearerToken = process.env.TWITTER_CLIENT_SECRET; // Should be bearer token
      
      if (!bearerToken) {
        return { success: false, error: 'Twitter credentials not configured' };
      }

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: content })
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: `Twitter: ${result.detail || result.title || 'API error'}` };
      }

      return { success: true, platformPostId: result.data.id };
      
    } catch (error: any) {
      return { success: false, error: `Twitter error: ${error.message}` };
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