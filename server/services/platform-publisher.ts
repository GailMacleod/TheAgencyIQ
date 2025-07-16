import axios from 'axios';
import { quotaManager } from './quota-manager';
import { db } from '../db';
import { sql } from 'drizzle-orm';

interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  platform: string;
}

interface PostData {
  content: string;
  mediaUrl?: string;
  scheduledTime?: Date;
}

export class PlatformPublisher {
  private readonly PLATFORM_ENDPOINTS = {
    facebook: 'https://graph.facebook.com/v18.0/me/feed',
    instagram: 'https://graph.facebook.com/v18.0/me/media',
    twitter: 'https://api.twitter.com/2/tweets',
    linkedin: 'https://api.linkedin.com/v2/ugcPosts',
    youtube: 'https://www.googleapis.com/youtube/v3/videos'
  };

  async publishToFacebook(userId: number, postData: PostData, accessToken: string): Promise<PublishResult> {
    try {
      // Check quota first
      const hasQuota = await quotaManager.checkQuota(userId, 'facebook');
      if (!hasQuota) {
        return { success: false, error: 'Quota exceeded for Facebook', platform: 'facebook' };
      }

      const response = await axios.post(this.PLATFORM_ENDPOINTS.facebook, {
        message: postData.content,
        access_token: accessToken
      });

      if (response.data.id) {
        // Consume quota only on successful publish
        await quotaManager.consumeQuota(userId, 'facebook');
        
        return {
          success: true,
          postId: response.data.id,
          platform: 'facebook'
        };
      }

      return { success: false, error: 'No post ID returned', platform: 'facebook' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'facebook'
      };
    }
  }

  async publishToInstagram(userId: number, postData: PostData, accessToken: string): Promise<PublishResult> {
    try {
      const hasQuota = await quotaManager.checkQuota(userId, 'instagram');
      if (!hasQuota) {
        return { success: false, error: 'Quota exceeded for Instagram', platform: 'instagram' };
      }

      // Instagram requires media URLs
      if (!postData.mediaUrl) {
        return { success: false, error: 'Media URL required for Instagram', platform: 'instagram' };
      }

      const response = await axios.post(this.PLATFORM_ENDPOINTS.instagram, {
        image_url: postData.mediaUrl,
        caption: postData.content,
        access_token: accessToken
      });

      if (response.data.id) {
        await quotaManager.consumeQuota(userId, 'instagram');
        
        return {
          success: true,
          postId: response.data.id,
          platform: 'instagram'
        };
      }

      return { success: false, error: 'No post ID returned', platform: 'instagram' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'instagram'
      };
    }
  }

  async publishToTwitter(userId: number, postData: PostData, accessToken: string): Promise<PublishResult> {
    try {
      const hasQuota = await quotaManager.checkQuota(userId, 'twitter');
      if (!hasQuota) {
        return { success: false, error: 'Quota exceeded for Twitter', platform: 'twitter' };
      }

      const response = await axios.post(this.PLATFORM_ENDPOINTS.twitter, {
        text: postData.content
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.data?.id) {
        await quotaManager.consumeQuota(userId, 'twitter');
        
        return {
          success: true,
          postId: response.data.data.id,
          platform: 'twitter'
        };
      }

      return { success: false, error: 'No post ID returned', platform: 'twitter' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'twitter'
      };
    }
  }

  async publishToLinkedIn(userId: number, postData: PostData, accessToken: string): Promise<PublishResult> {
    try {
      const hasQuota = await quotaManager.checkQuota(userId, 'linkedin');
      if (!hasQuota) {
        return { success: false, error: 'Quota exceeded for LinkedIn', platform: 'linkedin' };
      }

      const response = await axios.post(this.PLATFORM_ENDPOINTS.linkedin, {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: postData.content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.id) {
        await quotaManager.consumeQuota(userId, 'linkedin');
        
        return {
          success: true,
          postId: response.data.id,
          platform: 'linkedin'
        };
      }

      return { success: false, error: 'No post ID returned', platform: 'linkedin' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'linkedin'
      };
    }
  }

  async publishToYouTube(userId: number, postData: PostData, accessToken: string): Promise<PublishResult> {
    try {
      const hasQuota = await quotaManager.checkQuota(userId, 'youtube');
      if (!hasQuota) {
        return { success: false, error: 'Quota exceeded for YouTube', platform: 'youtube' };
      }

      // YouTube requires video uploads - this is a simplified version
      const response = await axios.post(this.PLATFORM_ENDPOINTS.youtube, {
        snippet: {
          title: postData.content.substring(0, 100),
          description: postData.content,
          tags: ['TheAgencyIQ'],
          categoryId: '22'
        },
        status: {
          privacyStatus: 'public'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.id) {
        await quotaManager.consumeQuota(userId, 'youtube');
        
        return {
          success: true,
          postId: response.data.id,
          platform: 'youtube'
        };
      }

      return { success: false, error: 'No post ID returned', platform: 'youtube' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: 'youtube'
      };
    }
  }

  async publishToMultiplePlatforms(
    userId: number,
    platforms: string[],
    postData: PostData,
    tokens: Record<string, string>
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];
    
    for (const platform of platforms) {
      const token = tokens[platform];
      if (!token) {
        results.push({
          success: false,
          error: `No access token for ${platform}`,
          platform
        });
        continue;
      }

      let result: PublishResult;
      
      switch (platform) {
        case 'facebook':
          result = await this.publishToFacebook(userId, postData, token);
          break;
        case 'instagram':
          result = await this.publishToInstagram(userId, postData, token);
          break;
        case 'twitter':
          result = await this.publishToTwitter(userId, postData, token);
          break;
        case 'linkedin':
          result = await this.publishToLinkedIn(userId, postData, token);
          break;
        case 'youtube':
          result = await this.publishToYouTube(userId, postData, token);
          break;
        default:
          result = {
            success: false,
            error: `Unsupported platform: ${platform}`,
            platform
          };
      }
      
      results.push(result);
    }
    
    return results;
  }

  async schedulePost(userId: number, platform: string, postData: PostData, scheduledTime: Date): Promise<string> {
    try {
      const queueId = crypto.randomUUID();
      
      await db.execute(sql`
        INSERT INTO post_queue (id, user_id, platform, content, media_url, scheduled_time, status)
        VALUES (${queueId}, ${userId}, ${platform}, ${postData.content}, ${postData.mediaUrl}, ${scheduledTime}, 'pending')
      `);
      
      console.log(`📅 Post scheduled for ${platform} at ${scheduledTime.toISOString()}`);
      return queueId;
    } catch (error) {
      console.error('Error scheduling post:', error);
      throw error;
    }
  }

  async getScheduledPosts(userId: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM post_queue
        WHERE user_id = ${userId}
        AND status = 'pending'
        ORDER BY scheduled_time ASC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting scheduled posts:', error);
      return [];
    }
  }
}

export const platformPublisher = new PlatformPublisher();