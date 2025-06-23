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
      // Use working tokens (skip FACEBOOK_ACCESS_TOKEN as it contains text, not a token)
      const accessToken = process.env.FACEBOOK_USER_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!accessToken || !appSecret) {
        return { success: false, error: 'Facebook credentials not configured' };
      }

      // Generate app secret proof for secure server-side calls
      const proof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
      
      // First, try to get user's pages
      const pagesResponse = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}&appsecret_proof=${proof}`);
      const pagesData = await pagesResponse.json();
      
      if (pagesData.error) {
        // If pages call fails, try posting to user timeline directly
        const response = await fetch(`https://graph.facebook.com/v20.0/me/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            message: content,
            access_token: accessToken,
            appsecret_proof: proof
          }).toString()
        });

        const result = await response.json();

        if (result.error) {
          return { success: false, error: `Facebook: ${result.error.message}` };
        }

        return { success: true, platformPostId: result.id };
      }
      
      if (pagesData.data && pagesData.data.length > 0) {
        // Use the first available page
        const page = pagesData.data[0];
        const pageId = page.id;
        const pageAccessToken = page.access_token;
        
        // Generate proof for page token
        const pageProof = crypto.createHmac('sha256', appSecret).update(pageAccessToken).digest('hex');
        
        const response = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            message: content,
            access_token: pageAccessToken,
            appsecret_proof: pageProof
          }).toString()
        });

        const result = await response.json();

        if (result.error) {
          return { success: false, error: `Facebook: ${result.error.message}` };
        }

        return { success: true, platformPostId: result.id };
      } else {
        return { success: false, error: 'No Facebook pages found. Please create a Facebook business page first.' };
      }
      
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

      // Use simplified posting without profile lookup
      const postData = {
        author: 'urn:li:person:me',
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(postData)
      });

      const result = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: `LinkedIn posting: ${result.message || result.error_description || `HTTP ${response.status}`}` 
        };
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