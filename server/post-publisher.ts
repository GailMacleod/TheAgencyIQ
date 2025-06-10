import { storage } from './storage';
import axios from 'axios';

interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
  analytics?: any;
}

export class PostPublisher {
  
  static async publishToFacebook(accessToken: string, content: string): Promise<PublishResult> {
    try {
      // Get a real Facebook app access token for posting
      const appTokenResponse = await axios.post('https://graph.facebook.com/oauth/access_token', new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        grant_type: 'client_credentials'
      }));

      const realAccessToken = appTokenResponse.data.access_token;

      // Post to Facebook Pages API
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/feed`,
        {
          message: content,
          access_token: realAccessToken
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`Facebook post published successfully: ${response.data.id}`);
      
      return {
        success: true,
        platformPostId: response.data.id,
        analytics: { reach: 0, engagement: 0, impressions: 0 }
      };
    } catch (error: any) {
      console.error('Facebook publish error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  static async publishToInstagram(accessToken: string, content: string, imageUrl?: string): Promise<PublishResult> {
    try {
      // Get Facebook app access token for Instagram Business API
      const appTokenResponse = await axios.post('https://graph.facebook.com/oauth/access_token', new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        grant_type: 'client_credentials'
      }));

      const realAccessToken = appTokenResponse.data.access_token;

      // Create Instagram media container
      const mediaData: any = {
        caption: content,
        access_token: realAccessToken
      };

      if (imageUrl) {
        mediaData.image_url = imageUrl;
      } else {
        // Default to text post
        mediaData.media_type = 'CAROUSEL_ALBUM';
      }

      const response = await axios.post(
        'https://graph.facebook.com/v18.0/me/media',
        mediaData
      );
      
      // Publish the media
      const publishResponse = await axios.post(
        'https://graph.facebook.com/v18.0/me/media_publish',
        {
          creation_id: response.data.id,
          access_token: realAccessToken
        }
      );

      console.log(`Instagram post published successfully: ${publishResponse.data.id}`);
      
      return {
        success: true,
        platformPostId: publishResponse.data.id,
        analytics: { reach: 0, engagement: 0, impressions: 0 }
      };
    } catch (error: any) {
      console.error('Instagram publish error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  static async publishToLinkedIn(accessToken: string, content: string): Promise<PublishResult> {
    try {
      // Get LinkedIn client credentials access token
      const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        scope: 'w_member_social'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const realAccessToken = tokenResponse.data.access_token;

      // Post to LinkedIn using ugcPosts API
      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: 'urn:li:organization:YOUR_ORG_ID',
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: content
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
            'Authorization': `Bearer ${realAccessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      console.log(`LinkedIn post published successfully: ${response.data.id}`);
      
      return {
        success: true,
        platformPostId: response.data.id,
        analytics: { reach: 0, engagement: 0, impressions: 0 }
      };
    } catch (error: any) {
      console.error('LinkedIn publish error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  static async publishToTwitter(accessToken: string, tokenSecret: string, content: string): Promise<PublishResult> {
    try {
      // Note: Twitter API v2 requires different authentication approach
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        {
          text: content
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        platformPostId: response.data.data.id,
        analytics: { reach: 0, engagement: 0, impressions: 0 }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.title || error.message
      };
    }
  }

  static async publishToYouTube(accessToken: string, content: string, videoData?: any): Promise<PublishResult> {
    try {
      // YouTube requires video upload - this is a simplified example
      // In practice, you'd need to handle video file uploads
      const response = await axios.post(
        'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
        {
          snippet: {
            title: content.substring(0, 100),
            description: content,
            categoryId: '22' // People & Blogs
          },
          status: {
            privacyStatus: 'public'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        platformPostId: response.data.id,
        analytics: { reach: 0, engagement: 0, impressions: 0 }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  static async publishPost(
    userId: number, 
    postId: number, 
    platforms: string[]
  ): Promise<{ success: boolean; results: Record<string, PublishResult>; remainingPosts: number }> {
    
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const connections = await storage.getPlatformConnectionsByUser(userId);
    const post = (await storage.getPostsByUser(userId)).find(p => p.id === postId);
    
    if (!post) {
      throw new Error('Post not found');
    }

    const results: Record<string, PublishResult> = {};
    let successfulPublications = 0;
    let totalAttempts = 0;

    // Attempt to publish to each requested platform
    for (const platform of platforms) {
      const connection = connections.find(c => c.platform === platform && c.isActive);
      
      if (!connection) {
        results[platform] = {
          success: false,
          error: `Platform ${platform} not connected`
        };
        continue;
      }

      totalAttempts++;
      let publishResult: PublishResult;

      switch (platform) {
        case 'facebook':
          publishResult = await this.publishToFacebook(connection.accessToken, post.content);
          break;
        case 'instagram':
          publishResult = await this.publishToInstagram(connection.accessToken, post.content);
          break;
        case 'linkedin':
          publishResult = await this.publishToLinkedIn(connection.accessToken, post.content);
          break;
        case 'x':
          publishResult = await this.publishToTwitter(connection.accessToken, connection.refreshToken || '', post.content);
          break;
        case 'youtube':
          publishResult = await this.publishToYouTube(connection.accessToken, post.content);
          break;
        default:
          publishResult = {
            success: false,
            error: `Platform ${platform} not supported`
          };
      }

      results[platform] = publishResult;
      if (publishResult.success) {
        successfulPublications++;
      }
    }

    // Only decrement post allocation if at least one publication was successful
    let remainingPosts = user.remainingPosts || 0;
    
    if (successfulPublications > 0) {
      remainingPosts = Math.max(0, remainingPosts - 1);
      await storage.updateUser(userId, { remainingPosts });
      
      // Update post status based on results
      const overallSuccess = successfulPublications === totalAttempts;
      await storage.updatePost(postId, {
        status: overallSuccess ? "published" : "partial",
        publishedAt: new Date(),
        analytics: results
      });

      console.log(`Post ${postId} published to ${successfulPublications}/${totalAttempts} platforms. User ${user.email} has ${remainingPosts} posts remaining.`);
    } else {
      // All publications failed - mark as failed and preserve allocation
      await storage.updatePost(postId, {
        status: "failed",
        analytics: results
      });

      console.log(`Post ${postId} failed to publish to all platforms. Allocation preserved. User ${user.email} still has ${remainingPosts} posts remaining.`);
    }

    return {
      success: successfulPublications > 0,
      results,
      remainingPosts
    };
  }
}

export default PostPublisher;