/**
 * Platform Post ID Manager
 * Manages platform post IDs and quota deduction for successful publications
 */

import { db } from './db';
import { posts } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { PostQuotaService } from './PostQuotaService';
import { storage } from './storage';

export interface PlatformPostResult {
  success: boolean;
  postId?: number;
  platformPostId?: string;
  quotaDeducted?: boolean;
  error?: string;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export class PlatformPostManager {
  
  /**
   * Record a successful platform publication with proper quota deduction
   */
  static async recordSuccessfulPublication(
    userId: number,
    platform: string,
    content: string,
    platformPostId: string,
    existingPostId?: number
  ): Promise<PlatformPostResult> {
    try {
      let postId: number;
      
      // If we have an existing post, update it
      if (existingPostId) {
        console.log(`📝 Updating existing post ${existingPostId} with platform post ID: ${platformPostId}`);
        
        await db.update(posts)
          .set({
            status: 'published',
            publishedAt: new Date(),
            platformPostId: platformPostId,
            quotaDeducted: true,
            errorLog: null
          })
          .where(eq(posts.id, existingPostId));
          
        postId = existingPostId;
      } else {
        // Create new post record
        console.log(`📝 Creating new post record for platform: ${platform}, platformPostId: ${platformPostId}`);
        
        const newPost = await storage.createPost({
          userId: userId,
          platform: platform,
          content: content,
          status: 'published',
          publishedAt: new Date(),
          platformPostId: platformPostId,
          quotaDeducted: true
        });
        
        postId = newPost.id;
      }
      
      // Deduct quota for successful publication
      console.log(`📊 Deducting quota for successful publication - Post ID: ${postId}, Platform: ${platform}`);
      const quotaDeducted = await PostQuotaService.postApproved(userId, postId, true);
      
      if (!quotaDeducted) {
        console.warn(`⚠️ Quota deduction failed for post ${postId}, but platform post was successful`);
      }
      
      console.log(`✅ Successfully recorded platform publication: ${platform} post ${platformPostId}`);
      
      return {
        success: true,
        postId,
        platformPostId,
        quotaDeducted
      };
      
    } catch (error: any) {
      console.error(`❌ Error recording platform publication:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Record a failed platform publication
   */
  static async recordFailedPublication(
    userId: number,
    platform: string,
    content: string,
    error: string,
    existingPostId?: number
  ): Promise<PlatformPostResult> {
    try {
      let postId: number;
      
      // If we have an existing post, update it
      if (existingPostId) {
        console.log(`📝 Updating existing post ${existingPostId} with failure: ${error}`);
        
        await db.update(posts)
          .set({
            status: 'failed',
            errorLog: error,
            quotaDeducted: false
          })
          .where(eq(posts.id, existingPostId));
          
        postId = existingPostId;
      } else {
        // Create new post record for failed attempt
        console.log(`📝 Creating new post record for failed publication: ${platform}`);
        
        const newPost = await storage.createPost({
          userId: userId,
          platform: platform,
          content: content,
          status: 'failed',
          errorLog: error,
          quotaDeducted: false
        });
        
        postId = newPost.id;
      }
      
      console.log(`❌ Recorded failed publication: ${platform} - ${error}`);
      
      return {
        success: true,
        postId,
        quotaDeducted: false
      };
      
    } catch (dbError: any) {
      console.error(`❌ Error recording failed publication:`, dbError);
      return {
        success: false,
        error: dbError.message
      };
    }
  }
  
  /**
   * Get all published posts with platform post IDs for a user
   */
  static async getPublishedPosts(userId: number): Promise<any[]> {
    try {
      const publishedPosts = await db.select()
        .from(posts)
        .where(and(
          eq(posts.userId, userId),
          eq(posts.status, 'published')
        ))
        .orderBy(posts.publishedAt);
      
      return publishedPosts.filter(post => post.platformPostId); // Only return posts with platform IDs
      
    } catch (error) {
      console.error('Error getting published posts:', error);
      return [];
    }
  }
  
  /**
   * Verify platform post ID exists and is valid
   */
  static async verifyPlatformPostId(postId: number): Promise<boolean> {
    try {
      const post = await db.select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      
      if (post.length === 0) {
        return false;
      }
      
      return !!(post[0].platformPostId && post[0].status === 'published');
      
    } catch (error) {
      console.error('Error verifying platform post ID:', error);
      return false;
    }
  }
  
  /**
   * Get quota status with platform post ID validation
   */
  static async getQuotaStatusWithValidation(userId: number) {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const publishedPosts = await this.getPublishedPosts(userId);
      const validPostCount = publishedPosts.length;
      
      return {
        totalPosts: user.totalPosts || 52,
        remainingPosts: user.remainingPosts || (52 - validPostCount),
        validPublishedCount: validPostCount,
        subscriptionActive: user.subscriptionActive || true,
        platformPostIds: publishedPosts.map(p => ({
          id: p.id,
          platform: p.platform,
          platformPostId: p.platformPostId,
          publishedAt: p.publishedAt
        }))
      };
    } catch (error: any) {
      console.error('Error getting quota status:', error);
      return {
        totalPosts: 52,
        remainingPosts: 49,
        validPublishedCount: 0,
        subscriptionActive: true,
        platformPostIds: []
      };
    }
  }
}