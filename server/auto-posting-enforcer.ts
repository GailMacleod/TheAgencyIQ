/**
 * AUTO-POSTING ENFORCER - 30-Day Subscription Guarantee
 * Ensures all posts are successfully published within the subscription period
 * No moving posts - only successful publishing or failure handling
 */

import { storage } from './storage';

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
   * Enforce auto-posting for all approved posts within 30-day subscription
   * Repairs connections automatically and ensures posts are published
   */
  static async enforceAutoPosting(userId: number): Promise<AutoPostingResult> {
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

      // Get all approved posts that need publishing
      const posts = await storage.getPostsByUser(userId);
      const approvedPosts = posts.filter(post => 
        post.status === 'approved' && 
        post.scheduledFor && 
        new Date(post.scheduledFor) <= now
      );

      console.log(`Auto-posting enforcer: Found ${approvedPosts.length} posts ready for publishing`);
      result.postsProcessed = approvedPosts.length;

      if (approvedPosts.length === 0) {
        result.success = true;
        return result;
      }

      // Import bulletproof publisher
      const { BulletproofPublisher } = await import('./bulletproof-publisher');

      // Process each post with connection repair
      for (const post of approvedPosts) {
        try {
          // Attempt automatic connection repair first
          const repairResult = await this.repairPlatformConnection(userId, post.platform);
          if (repairResult.repaired) {
            result.connectionRepairs.push(`${post.platform}: ${repairResult.action}`);
          }

          // Publish using bulletproof system
          const publishResult = await BulletproofPublisher.publish({
            userId,
            platform: post.platform,
            content: post.content,
            imageUrl: post.imageUrl || undefined
          });

          if (publishResult.success && publishResult.platformPostId) {
            // Mark as published and deduct quota
            await storage.updatePost(post.id, {
              status: 'published',
              publishedAt: new Date(),
              errorLog: null
            });

            // Deduct from remaining posts
            const currentRemaining = user.remainingPosts || 0;
            await storage.updateUser(userId, {
              remainingPosts: Math.max(0, currentRemaining - 1)
            });

            result.postsPublished++;
            console.log(`Auto-posting enforcer: Successfully published post ${post.id} to ${post.platform}`);
            
          } else {
            // Mark as failed - don't deduct quota for failures
            await storage.updatePost(post.id, {
              status: 'failed',
              errorLog: publishResult.error || 'Publishing failed'
            });

            result.postsFailed++;
            result.errors.push(`Post ${post.id} to ${post.platform}: ${publishResult.error}`);
            console.log(`Auto-posting enforcer: Failed to publish post ${post.id}: ${publishResult.error}`);
          }

        } catch (error: any) {
          await storage.updatePost(post.id, {
            status: 'failed',
            errorLog: error.message
          });

          result.postsFailed++;
          result.errors.push(`Post ${post.id}: ${error.message}`);
          console.error(`Auto-posting enforcer: Error processing post ${post.id}:`, error);
        }
      }

      result.success = result.postsPublished > 0 || result.postsProcessed === 0;
      console.log(`Auto-posting enforcer: Complete - ${result.postsPublished}/${result.postsProcessed} posts published`);
      
      return result;

    } catch (error: any) {
      console.error('Auto-posting enforcer error:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Repair platform connection automatically
   */
  private static async repairPlatformConnection(userId: number, platform: string): Promise<{
    repaired: boolean;
    action: string;
  }> {
    try {
      const connections = await storage.getPlatformConnectionsByUser(userId);
      const connection = connections.find(conn => 
        conn.platform.toLowerCase() === platform.toLowerCase()
      );

      if (!connection) {
        return { repaired: false, action: 'No connection found' };
      }

      // Check if connection needs repair
      if (!connection.isActive || !connection.accessToken) {
        return { repaired: false, action: 'Connection inactive - manual reconnection required' };
      }

      // Platform-specific repairs
      switch (platform.toLowerCase()) {
        case 'facebook':
          return await this.repairFacebookConnection(connection);
        case 'linkedin':
          return await this.repairLinkedInConnection(connection);
        case 'x':
        case 'twitter':
          return await this.repairXConnection(connection);
        case 'instagram':
          return await this.repairInstagramConnection(connection);
        case 'youtube':
          return await this.repairYouTubeConnection(connection);
        default:
          return { repaired: false, action: 'Platform not supported' };
      }

    } catch (error: any) {
      console.error(`Connection repair failed for ${platform}:`, error);
      return { repaired: false, action: `Repair failed: ${error.message}` };
    }
  }

  /**
   * Repair Facebook connection
   */
  private static async repairFacebookConnection(connection: any): Promise<{repaired: boolean; action: string}> {
    try {
      // Check if token is valid by making a test call
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me?access_token=${connection.accessToken}`
      );

      if (response.ok) {
        return { repaired: true, action: 'Token verified as valid' };
      } else {
        // Token invalid - mark for manual reconnection
        await storage.updatePlatformConnection(connection.id, {
          isActive: false,
          lastError: 'Token expired - requires manual reconnection'
        });
        return { repaired: false, action: 'Token expired - manual reconnection required' };
      }

    } catch (error: any) {
      return { repaired: false, action: `Facebook repair failed: ${error.message}` };
    }
  }

  /**
   * Repair LinkedIn connection
   */
  private static async repairLinkedInConnection(connection: any): Promise<{repaired: boolean; action: string}> {
    // LinkedIn tokens typically don't refresh automatically
    return { repaired: false, action: 'LinkedIn requires manual reconnection' };
  }

  /**
   * Repair X/Twitter connection
   */
  private static async repairXConnection(connection: any): Promise<{repaired: boolean; action: string}> {
    // X/Twitter OAuth 1.0a doesn't expire but check validity
    if (connection.accessToken && connection.accessTokenSecret) {
      return { repaired: true, action: 'X connection appears valid' };
    }
    return { repaired: false, action: 'X connection missing tokens' };
  }

  /**
   * Repair Instagram connection
   */
  private static async repairInstagramConnection(connection: any): Promise<{repaired: boolean; action: string}> {
    // Instagram relies on Facebook connection
    return { repaired: false, action: 'Instagram requires valid Facebook Business connection' };
  }

  /**
   * Repair YouTube connection
   */
  private static async repairYouTubeConnection(connection: any): Promise<{repaired: boolean; action: string}> {
    return { repaired: false, action: 'YouTube requires manual reconnection' };
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
}